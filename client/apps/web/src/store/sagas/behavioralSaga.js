import {
  call,
  put,
  select,
  take,
  takeLatest,
  delay,
  race,
  cancelled,
} from 'redux-saga/effects';
import { eventChannel, END } from 'redux-saga';
import { behavioralApi } from '../../api/behavioral.api';
import { toast } from 'sonner';
import {
  startSessionRequest,
  startSessionSuccess,
  startSessionFailure,
  streamStart,
  streamChunk,
  streamDone,
  streamError,
  addUserMessage,
  nextStageRequest,
  nextStageSuccess,
  nextStageFailure,
  completeSessionRequest,
  scoringPolled,
  scoringFailure,
  SEND_MESSAGE,
} from '../slices/behavioralSlice';
import { startDSARound } from '../slices/dsaSessionSlice';
import { requestRoundTransition } from '../slices/interviewSetupSlice';

// ─── Start session saga ───────────────────────────────────────────────────────
function* startSessionSaga(action) {
  try {
    const data = yield call(behavioralApi.startSession, action.payload);
    yield put(startSessionSuccess(data));
  } catch (err) {
    const msg = err.response?.data?.message || 'Không thể khởi tạo phiên behavioral.';
    yield put(startSessionFailure(msg));
    toast.error(msg);
  }
}

// ─── SSE streaming saga ───────────────────────────────────────────────────────
function createSSEChannel(sessionId, payload) {
  return eventChannel((emit) => {
    let fullText = '';
    let done = false;

    behavioralApi
      .createMessageStream(sessionId, payload)
      .then((response) => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        function pump() {
          reader
            .read()
            .then(({ done: streamDone, value }) => {
              if (streamDone) {
                if (!done) emit(END);
                return;
              }

              const text = decoder.decode(value, { stream: true });
              const lines = text.split('\n');

              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                try {
                  const json = JSON.parse(line.slice(6));
                  if (json.token !== undefined) {
                    fullText += json.token;
                    emit({ type: 'chunk', token: json.token });
                  }
                  if (json.done === true) {
                    done = true;
                    emit({ type: 'done', fullText, meta: json.meta });
                    emit(END);
                    return;
                  }
                } catch {
                  // ignore malformed line
                }
              }
              pump();
            })
            .catch((err) => {
              emit({ type: 'error', error: err });
              emit(END);
            });
        }

        pump();
      })
      .catch((err) => {
        emit({ type: 'error', error: err });
        emit(END);
      });

    return () => {}; // no cleanup needed
  });
}

function* sendMessageSaga(action) {
  const { content, inputType, voiceTranscript } = action.payload;
  const { sessionId } = yield select((s) => s.behavioral);

  // Optimistic user message
  yield put(addUserMessage({ content, inputType }));
  yield put(streamStart());

  const channel = yield call(createSSEChannel, sessionId, {
    content,
    inputType,
    voiceTranscript,
  });

  try {
    let fullText = '';
    let starStatus = null;

    while (true) {
      const event = yield take(channel);
      if (event.type === 'chunk') {
        yield put(streamChunk(event.token));
        fullText += event.token;
      } else if (event.type === 'done') {
        starStatus = event.meta?.starStatus ?? null;
        yield put(streamDone({ fullText: event.fullText ?? fullText, starStatus }));
        break;
      } else if (event.type === 'error') {
        yield put(streamError());
        toast.error('Lỗi kết nối với AI. Vui lòng thử lại.');
        break;
      }
    }
  } finally {
    if (yield cancelled()) {
      channel.close();
      yield put(streamError());
    }
  }
}

// ─── Next stage saga ──────────────────────────────────────────────────────────
function* nextStageSaga() {
  try {
    const { sessionId } = yield select((s) => s.behavioral);
    const data = yield call(behavioralApi.nextStage, sessionId);
    yield put(nextStageSuccess(data));
  } catch (err) {
    const msg = err.response?.data?.message || 'Không thể chuyển giai đoạn.';
    yield put(nextStageFailure(msg));
    toast.error(msg);
  }
}

// ─── Complete + polling saga ──────────────────────────────────────────────────
function* completeSaga() {
  try {
    const { sessionId } = yield select((s) => s.behavioral);
    yield call(behavioralApi.completeSession, sessionId);

    // Poll for score every 3s, max 60s
    let attempts = 0;
    while (attempts < 20) {
      yield delay(3000);
      attempts++;
      try {
        const result = yield call(behavioralApi.getScore, sessionId);
        if (result.status === 'COMPLETED') {
          if (result.nextRound === 'dsa') {
            console.log('Transitioning to DSA round with sessionId:', result.interviewSessionId ?? sessionId);
            yield put(requestRoundTransition({
              interviewSessionId: result.interviewSessionId ?? sessionId,
            }));
          } else {
            yield put(scoringPolled(result));
          }
          break;
        }
      } catch {
        // ignore polling error, keep trying
      }
    }

    if (attempts >= 20) {
      yield put(scoringFailure('Chấm điểm mất quá nhiều thời gian. Vui lòng tải lại.'));
    }
  } catch (err) {
    const msg = err.response?.data?.message || 'Không thể hoàn thành phiên.';
    yield put(scoringFailure(msg));
    toast.error(msg);
  }
}

// ─── Root watcher ─────────────────────────────────────────────────────────────
export function* watchBehavioralSaga() {
  yield takeLatest(startSessionRequest.type, startSessionSaga);
  yield takeLatest(SEND_MESSAGE, sendMessageSaga);
  yield takeLatest(nextStageRequest.type, nextStageSaga);
  yield takeLatest(completeSessionRequest.type, completeSaga);
}
