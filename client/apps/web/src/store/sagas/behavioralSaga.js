import {
  call,
  put,
  select,
  take,
  takeLatest,
  cancelled,
  delay,
} from 'redux-saga/effects';
import { eventChannel, END } from 'redux-saga';
import { behavioralApi } from '../../api/behavioral.api';
import { interviewApi } from '../../api/interview.api';
import i18n from '../../i18n/config';
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
              emit({ type: 'error', message: err?.message ?? i18n.t('shared.streamError') });
              emit(END);
            });
        }

        pump();
      })
      .catch((err) => {
        emit({ type: 'error', message: err?.message ?? i18n.t('shared.connectionError') });
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
    const msg = err.response?.data?.message ?? i18n.t('behavioralRoom.error.init');
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
          break;

        case 'session_completed':
          yield call(_pollForBehavioralScore);
          break;

        case 'error':
          yield put(streamError(event.message));
          toast.error(event.message ?? i18n.t('shared.connectionRetryError'));
          return;

        default:
          break;
      }
    }
  } finally {
    if (yield cancelled()) {
      channel.close();
      yield put(streamError(i18n.t('shared.cancelled')));
    }
  }
}

// ─── Poll behavioral score sau khi session_completed ─────────────────────────
function* _pollForBehavioralScore() {
  const interviewSessionId = yield select((s) => s.interviewSetup.session?.sessionId);
  for (let i = 0; i < 20; i++) {
    yield delay(3000);
    try {
      const data = yield call(interviewApi.getAllSessionsForInterview, interviewSessionId);
      if (data.finalScorecard?.behavioral) {
        yield put(sessionCompleted());
        return;
      }
    } catch {
      // bỏ qua lỗi poll, thử lại lần sau
    }
  }
  // timeout 60s — navigate anyway để không kẹt mãi
  yield put(sessionCompleted());
}

// ─── Root watcher ─────────────────────────────────────────────────────────────
export function* watchBehavioralSaga() {
  yield takeLatest(createSessionRequest.type, _createSession);
  yield takeLatest(SUBMIT_ANSWER, _submitAnswer);
}
