import { call, put, take, takeLatest, select, cancelled } from 'redux-saga/effects';
import { eventChannel, END } from 'redux-saga';
import { sdInterviewerApi } from '../../api/sdInterviewer.api';
import { toast } from 'sonner';
import {
  startSessionRequest,
  startSessionDone,
  startSessionFailure,
  sendMessageRequest,
  silenceTriggerRequest,
  drawingCompleteRequest,
  streamChunk,
  streamDone,
  streamFailure,
  requestHintRequest,
  requestHintSuccess,
  requestHintFailure,
} from '../slices/sdInterviewerSlice';
import { phaseUpdated } from '../slices/sdSessionSlice';
import { triggerEvaluation } from '../slices/sdEvaluatorSlice';

function _createStartChannel(sessionId) {
  return eventChannel((emit) => {
    let fullText = '';
    let done = false;

    sdInterviewerApi
      .startSession(sessionId)
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
                  if (json.error) { emit({ type: 'error', error: json.error }); emit(END); return; }
                  if (json.token !== undefined) { fullText += json.token; emit({ type: 'chunk', token: json.token }); }
                  if (json.done === true) { done = true; emit({ type: 'done', fullText: fullText.replace('[PHASE_COMPLETE]', '').trim() }); emit(END); return; }
                } catch {
                  // ignore malformed line
                }
              }
              pump();
            })
            .catch((err) => { emit({ type: 'error', error: err.message || 'Stream error' }); emit(END); });
        }
        pump();
      })
      .catch((err) => { emit({ type: 'error', error: err.message || 'Connection error' }); emit(END); });

    return () => {};
  });
}

function _createSSEChannel(sessionId, userMessage) {
  return eventChannel((emit) => {
    let fullText = '';
    let done = false;

    sdInterviewerApi
      .createMessageStream(sessionId, { userMessage })
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
                  if (json.error) {
                    emit({ type: 'error', error: json.error });
                    emit(END);
                    return;
                  }
                  if (json.token !== undefined) {
                    fullText += json.token;
                    emit({ type: 'chunk', token: json.token });
                  }
                  if (json.done === true) {
                    done = true;
                    emit({ type: 'done', fullText: fullText.replace('[PHASE_COMPLETE]', '').trim(), meta: json.meta });
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
              emit({ type: 'error', error: err.message || 'Stream read error' });
              emit(END);
            });
        }

        pump();
      })
      .catch((err) => {
        emit({ type: 'error', error: err.message || 'Connection error' });
        emit(END);
      });

    return () => {};
  });
}

function _createSilenceChannel(sessionId, { userMessage, silenceCount }) {
  return eventChannel((emit) => {
    let fullText = '';
    let done = false;

    sdInterviewerApi
      .createSilenceTriggerStream(sessionId, { userMessage, silenceCount })
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
                  if (json.error) { emit({ type: 'error', error: json.error }); emit(END); return; }
                  if (json.token !== undefined) { fullText += json.token; emit({ type: 'chunk', token: json.token }); }
                  if (json.done === true) {
                    done = true;
                    emit({ type: 'done', fullText: fullText.replace('[PHASE_COMPLETE]', '').trim(), meta: json.meta });
                    emit(END);
                    return;
                  }
                } catch {
                  // ignore malformed line
                }
              }
              pump();
            })
            .catch((err) => { emit({ type: 'error', error: err.message || 'Stream read error' }); emit(END); });
        }
        pump();
      })
      .catch((err) => { emit({ type: 'error', error: err.message || 'Connection error' }); emit(END); });

    return () => {};
  });
}

function* _handleStartSession() {
  const sessionId = yield select((s) => s.sdSession.sessionId);
  if (!sessionId) return;

  const channel = yield call(_createStartChannel, sessionId);
  try {
    while (true) {
      const event = yield take(channel);
      if (event.type === 'chunk') {
        yield put(streamChunk(event.token));
      } else if (event.type === 'done') {
        yield put(startSessionDone({ fullText: event.fullText }));
        break;
      } else if (event.type === 'error') {
        yield put(startSessionFailure(event.error || 'Failed to start session'));
        break;
      }
    }
  } finally {
    if (yield cancelled()) channel.close();
  }
}

function* _handleSendMessage(action) {
  const { userMessage } = action.payload;
  const sessionId = yield select((s) => s.sdSession.sessionId);
  if (!sessionId) return;

  const channel = yield call(_createSSEChannel, sessionId, userMessage);

  try {
    while (true) {
      const event = yield take(channel);
      if (event.type === 'chunk') {
        yield put(streamChunk(event.token));
      } else if (event.type === 'done') {
        yield put(streamDone({ userMessage, fullText: event.fullText, meta: event.meta }));
        if (event.meta?.phaseChanged && event.meta?.phase) {
          yield put(phaseUpdated(event.meta.phase));
          if (event.meta.phase !== 'COMPLETED') {
            yield put(startSessionRequest());
          } else {
            yield put(triggerEvaluation(sessionId));
          }
        }
        break;
      } else if (event.type === 'error') {
        const msg = typeof event.error === 'string' ? event.error : 'AI service error';
        yield put(streamFailure(msg));
        toast.error(msg);
        break;
      }
    }
  } finally {
    if (yield cancelled()) channel.close();
  }
}

function* _handleSilenceTrigger(action) {
  const { triggerType, nodes } = action.payload;
  const sessionId = yield select((s) => s.sdSession.sessionId);
  const silenceCount = yield select((s) => s.sdInterviewer.silenceCount);

  if (!sessionId) return;

  const userMessage = `[CANDIDATE_SILENT:${silenceCount}]`;

  const channel = yield call(_createSilenceChannel, sessionId, { userMessage, silenceCount });

  try {
    while (true) {
      const event = yield take(channel);
      if (event.type === 'chunk') {
        yield put(streamChunk(event.token));
      } else if (event.type === 'done') {
        yield put(streamDone({ fullText: event.fullText, meta: event.meta }));
        break;
      } else if (event.type === 'error') {
        // Silence trigger errors are silent — no toast, just stop loading
        yield put(streamFailure(''));
        break;
      }
    }
  } finally {
    if (yield cancelled()) channel.close();
  }
}

function _createDrawingCompleteChannel(sessionId) {
  return eventChannel((emit) => {
    let fullText = '';
    let done = false;

    sdInterviewerApi
      .createDrawingCompleteStream(sessionId)
      .then((response) => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        function pump() {
          reader
            .read()
            .then(({ done: streamDone, value }) => {
              if (streamDone) { if (!done) emit(END); return; }
              const text = decoder.decode(value, { stream: true });
              for (const line of text.split('\n')) {
                if (!line.startsWith('data: ')) continue;
                try {
                  const json = JSON.parse(line.slice(6));
                  if (json.error) { emit({ type: 'error', error: json.error }); emit(END); return; }
                  if (json.token !== undefined) { fullText += json.token; emit({ type: 'chunk', token: json.token }); }
                  if (json.done === true) {
                    done = true;
                    emit({ type: 'done', fullText: fullText.replace('[PHASE_COMPLETE]', '').trim(), meta: json.meta });
                    emit(END);
                    return;
                  }
                } catch { /* ignore malformed line */ }
              }
              pump();
            })
            .catch((err) => { emit({ type: 'error', error: err.message || 'Stream read error' }); emit(END); });
        }
        pump();
      })
      .catch((err) => { emit({ type: 'error', error: err.message || 'Connection error' }); emit(END); });

    return () => {};
  });
}

function* _handleDrawingComplete() {
  const sessionId = yield select((s) => s.sdSession.sessionId);
  if (!sessionId) return;

  const channel = yield call(_createDrawingCompleteChannel, sessionId);
  try {
    while (true) {
      const event = yield take(channel);
      if (event.type === 'chunk') {
        yield put(streamChunk(event.token));
      } else if (event.type === 'done') {
        yield put(streamDone({ fullText: event.fullText, meta: event.meta }));
        break;
      } else if (event.type === 'error') {
        yield put(streamFailure(''));
        break;
      }
    }
  } finally {
    if (yield cancelled()) channel.close();
  }
}

function* _handleRequestHint() {
  const sessionId = yield select((s) => s.sdSession.sessionId);
  if (!sessionId) return;
  try {
    const response = yield call(sdInterviewerApi.requestHint, sessionId);
    yield put(requestHintSuccess(response));
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to get hint';
    yield put(requestHintFailure(msg));
    toast.error(msg);
  }
}

export function* watchSDInterviewerSaga() {
  yield takeLatest(startSessionRequest.type, _handleStartSession);
  yield takeLatest(sendMessageRequest.type, _handleSendMessage);
  yield takeLatest(silenceTriggerRequest.type, _handleSilenceTrigger);
  yield takeLatest(drawingCompleteRequest.type, _handleDrawingComplete);
  yield takeLatest(requestHintRequest.type, _handleRequestHint);
}
