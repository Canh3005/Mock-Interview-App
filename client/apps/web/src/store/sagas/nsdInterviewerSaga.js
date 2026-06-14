import { call, put, take, takeLatest, select, cancelled } from 'redux-saga/effects';
import { eventChannel, END } from 'redux-saga';
import { nsdInterviewerApi } from '../../api/nsdInterviewer.api';
import i18n from '../../i18n/config';
import { toast } from 'sonner';
import {
  startSessionRequest,
  startSessionDone,
  startSessionFailure,
  sendMessageRequest,
  streamChunk,
  streamDone,
  streamFailure,
} from '../slices/nsdInterviewerSlice';
import { phaseUpdated } from '../slices/nsdSessionSlice';
import { triggerEvaluation } from '../slices/nsdEvaluatorSlice';

function _createSSEChannel(fetchPromise) {
  return eventChannel((emit) => {
    let fullText = '';
    let done = false;

    fetchPromise
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
              for (const line of text.split('\n')) {
                if (!line.startsWith('data: ')) continue;
                try {
                  const json = JSON.parse(line.slice(6));
                  if (json.error) { emit({ type: 'error', error: json.error }); emit(END); return; }
                  if (json.token !== undefined) { fullText += json.token; emit({ type: 'chunk', token: json.token }); }
                  if (json.done === true) {
                    done = true;
                    emit({ type: 'done', fullText: fullText.trim(), meta: json.meta });
                    emit(END);
                    return;
                  }
                } catch {
                  // ignore malformed line
                }
              }
              pump();
            })
            .catch((err) => { emit({ type: 'error', error: err.message || i18n.t('shared.streamReadError') }); emit(END); });
        }
        pump();
      })
      .catch((err) => { emit({ type: 'error', error: err.message || i18n.t('shared.connectionError') }); emit(END); });

    return () => {};
  });
}

function* _drainSSEChannel(channel, onDone) {
  try {
    while (true) {
      const event = yield take(channel);
      if (event.type === 'chunk') {
        yield put(streamChunk(event.token));
      } else if (event.type === 'done') {
        yield* onDone(event);
        break;
      } else if (event.type === 'error') {
        const msg = typeof event.error === 'string' ? event.error : i18n.t('sdRoom.errors.aiServiceError');
        yield put(streamFailure(msg));
        toast.error(msg);
        break;
      }
    }
  } finally {
    if (yield cancelled()) channel.close();
  }
}

function* _handleStartSession() {
  const sessionId = yield select((s) => s.nsdSession.sessionId);
  if (!sessionId) return;

  const channel = yield call(_createSSEChannel, nsdInterviewerApi.startSession(sessionId));
  yield* _drainSSEChannel(channel, function* (event) {
    yield put(startSessionDone({ fullText: event.fullText }));
  });
}

function* _handleSendMessage(action) {
  const { userMessage } = action.payload;
  const sessionId = yield select((s) => s.nsdSession.sessionId);
  const phase = yield select((s) => s.nsdSession.phase);
  const canvasJSON = yield select((s) => s.nsdSession.canvasJSON);
  if (!sessionId) return;

  // Include canvas when in canvas phases
  const payload =
    phase === 'PHASE_4_HLD' || phase === 'PHASE_5_DEEP_DIVE'
      ? { userMessage, canvas: canvasJSON }
      : { userMessage };

  const channel = yield call(_createSSEChannel, nsdInterviewerApi.createMessageStream(sessionId, payload));
  yield* _drainSSEChannel(channel, function* (event) {
    yield put(streamDone({ userMessage, fullText: event.fullText, meta: event.meta }));
    if (event.meta?.stageChanged && event.meta?.stage) {
      yield put(phaseUpdated(event.meta.stage));
      if (event.meta.stage === 'EVALUATING' || event.meta.stage === 'COMPLETED') {
        yield put(triggerEvaluation(sessionId));
      }
    }
  });
}

export function* watchNSDInterviewerSaga() {
  yield takeLatest(startSessionRequest.type, _handleStartSession);
  yield takeLatest(sendMessageRequest.type, _handleSendMessage);
}
