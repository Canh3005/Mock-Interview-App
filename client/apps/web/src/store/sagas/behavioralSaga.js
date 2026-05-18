import {
  call,
  put,
  select,
  take,
  takeLatest,
  cancelled,
} from 'redux-saga/effects';
import { eventChannel, END } from 'redux-saga';
import { behavioralApi } from '../../api/behavioral.api';
import { toast } from 'sonner';
import {
  createSessionRequest,
  createSessionSuccess,
  createSessionFailure,
  addCandidateTurn,
  evaluatingStarted,
  turnStreamStart,
  streamChunk,
  turnComplete,
  streamError,
  sessionCompleted,
  SUBMIT_ANSWER,
} from '../slices/behavioralSlice';

// ─── SSE channel factory ──────────────────────────────────────────────────────
function _createSseChannel(sessionId, content) {
  return eventChannel((emit) => {
    let reader = null;

    behavioralApi
      .submitAnswer(sessionId, content)
      .then((response) => {
        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function pump() {
          reader
            .read()
            .then(({ done, value }) => {
              if (done) {
                emit(END);
                return;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() ?? ''; // giữ lại dòng chưa hoàn chỉnh

              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                try {
                  const event = JSON.parse(line.slice(6));
                  emit(event);
                } catch {
                  // bỏ qua line không hợp lệ
                }
              }
              pump();
            })
            .catch((err) => {
              emit({ type: 'error', message: err?.message ?? 'Stream error' });
              emit(END);
            });
        }

        pump();
      })
      .catch((err) => {
        emit({ type: 'error', message: err?.message ?? 'Connection error' });
        emit(END);
      });

    return () => {
      if (reader) reader.cancel().catch(() => {});
    };
  });
}

// ─── Create session saga ──────────────────────────────────────────────────────
function* _createSession(action) {
  try {
    const data = yield call(behavioralApi.create, action.payload);
    yield put(createSessionSuccess(data));
  } catch (err) {
    const msg = err.response?.data?.message ?? 'Không thể khởi tạo phiên phỏng vấn.';
    yield put(createSessionFailure(msg));
    toast.error(msg);
  }
}

// ─── Submit answer saga (SSE streaming) ──────────────────────────────────────
function* _submitAnswer(action) {
  const sessionId = yield select((s) => s.behavioral.sessionId);
  yield put(addCandidateTurn(action.payload));

  const channel = yield call(_createSseChannel, sessionId, action.payload);

  try {
    while (true) {
      const event = yield take(channel);
      if (event === END) break;

      switch (event.type) {
        case 'evaluating':
          yield put(evaluatingStarted());
          break;

        case 'turn_start':
          yield put(turnStreamStart());
          break;

        case 'chunk':
          yield put(streamChunk(event.token));
          break;

        case 'turn_complete':
          yield put(turnComplete({
            nextTurn: event.nextTurn,
            state: event.state,
            stageProgress: event.stageProgress,
          }));
          if (event.state === 'COMPLETED') {
            const sid = yield select((s) => s.behavioral.sessionId);
            yield call(behavioralApi.complete, sid);
            yield put(sessionCompleted());
          }
          break;

        case 'error':
          yield put(streamError(event.message));
          toast.error(event.message ?? 'Lỗi kết nối. Vui lòng thử lại.');
          return;

        default:
          break;
      }
    }
  } finally {
    if (yield cancelled()) {
      channel.close();
      yield put(streamError('Cancelled'));
    }
  }
}

// ─── Root watcher ─────────────────────────────────────────────────────────────
export function* watchBehavioralSaga() {
  yield takeLatest(createSessionRequest.type, _createSession);
  yield takeLatest(SUBMIT_ANSWER, _submitAnswer);
}
