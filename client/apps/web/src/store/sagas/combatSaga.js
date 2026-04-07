/**
 * Tasks 3.1 – 3.5 — Combat Saga
 * Quản lý toàn bộ vòng lặp phỏng vấn Combat Mode:
 * Voice loop · Auto transition · Silence handling · Multimodal engine
 */
import {
  call,
  put,
  select,
  take,
  takeLatest,
  takeEvery,
  delay,
  race,
  fork,
  cancel,
  cancelled,
} from 'redux-saga/effects';
import { eventChannel, END } from 'redux-saga';
import { behavioralApi } from '../../api/behavioral.api';
import { combatApi } from '../../api/combat.api';
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
  nextStageSuccess,
  completeSessionRequest,
  scoringPolled,
  scoringFailure,
  SEND_MESSAGE,
} from '../slices/behavioralSlice';
import {
  stateChanged,
  silenceUpdated,
  inputModeChanged,
  stageAdvanced,
  resetCombatOrchestrator,
} from '../slices/combatOrchestratorSlice';
import {
  engineStatusChanged,
  snapshotUpdated,
  resetCombatEngine,
} from '../slices/combatEngineSlice';
import { combatOrchestrator, COMBAT_STATES } from '../../services/CombatOrchestrator';
import { sentenceTtsBuffer } from '../../services/SentenceTtsBuffer';
import { multimodalEngine } from '../../services/MultimodalEngine';

// ─── Action types ─────────────────────────────────────────────────────────────
export const COMBAT_START_SESSION = 'combat/startSession';
export const COMBAT_SEND_MESSAGE  = 'combat/sendMessage';
export const COMBAT_NEXT_STAGE    = 'combat/nextStage';
export const COMBAT_COMPLETE      = 'combat/complete';
export const COMBAT_START_ENGINE  = 'combat/startEngine';
export const COMBAT_STOP_ENGINE   = 'combat/stopEngine';
export const COMBAT_INPUT_MODE    = 'combat/setInputMode';

// ─── Action creators ──────────────────────────────────────────────────────────
export const combatStartSession = (payload) => ({
  type: COMBAT_START_SESSION,
  payload,
});
export const combatSendMessage = (payload) => ({
  type: COMBAT_SEND_MESSAGE,
  payload,
});
export const combatNextStage = (payload) => ({
  type: COMBAT_NEXT_STAGE,
  payload,
});
export const combatComplete = (sessionId) => ({
  type: COMBAT_COMPLETE,
  payload: { sessionId },
});
export const combatStartEngine = (payload) => ({
  type: COMBAT_START_ENGINE,
  payload,
});
export const combatSetInputMode = (mode) => ({
  type: COMBAT_INPUT_MODE,
  payload: mode,
});

// ─── SSE channel (combat message) ────────────────────────────────────────────
function createCombatSSEChannel(sessionId, payload) {
  return eventChannel((emit) => {
    let fullText = '';
    let done = false;

    combatApi
      .createCombatMessageStream(sessionId, payload)
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
                    // Sentence-level TTS streaming
                    sentenceTtsBuffer.appendToken(json.token);
                    emit({ type: 'chunk', token: json.token });
                  }
                  if (json.done === true) {
                    done = true;
                    sentenceTtsBuffer.flush();
                    emit({ type: 'done', fullText, meta: json.meta });
                    emit(END);
                    return;
                  }
                } catch (_) {}
              }
              pump();
            })
            .catch(() => emit(END));
        }
        pump();
      })
      .catch(() => emit(END));

    return () => {};
  });
}

// ─── Start session saga ───────────────────────────────────────────────────────
function* combatStartSessionSaga(action) {
  try {
    const data = yield call(behavioralApi.startSession, action.payload.interviewSessionId);
    yield put(startSessionSuccess(data));

    // Init orchestrator
    const dispatch = (reduxAction) => action.payload._dispatch?.(reduxAction);
    combatOrchestrator.init({
      totalBudgetMs: action.payload.totalBudgetMs ?? 20 * 60 * 1000,
      inputMode: action.payload.inputMode ?? 'voice',
    });

    // Transition to GREETING → AI_ASKING after first question TTS
    combatOrchestrator.transition(COMBAT_STATES.GREETING);
    yield put(
      stateChanged({ combatState: COMBAT_STATES.GREETING, currentStage: 1 }),
    );

    // TTS the first question
    const level = data.candidateLevel ?? 'mid';
    sentenceTtsBuffer.init({ level, language: 'vi' });
    sentenceTtsBuffer.reset();
    sentenceTtsBuffer.appendToken(data.firstQuestion);
    sentenceTtsBuffer.flush();

    combatOrchestrator.transition(COMBAT_STATES.AI_ASKING);
    yield put(stateChanged({ combatState: COMBAT_STATES.AI_ASKING }));

    yield call(() => sentenceTtsBuffer.waitForFinish());

    combatOrchestrator.transition(COMBAT_STATES.CANDIDATE_THINKING);
    yield put(stateChanged({ combatState: COMBAT_STATES.CANDIDATE_THINKING }));
  } catch (err) {
    const msg = err.response?.data?.message || 'Không thể khởi tạo phiên Combat.';
    yield put(startSessionFailure(msg));
    toast.error(msg);
  }
}

// ─── Send message saga (SSE + TTS loop) ──────────────────────────────────────
function* combatSendMessageSaga(action) {
  const { sessionId, content, inputType, voiceTranscript } = action.payload;
  const orchestratorState = yield select((s) => s.combatOrchestrator);

  // Multimodal snapshot
  multimodalEngine.endTurn(content);
  const multimodalContext = multimodalEngine.getLatestSnapshot();
  yield put(snapshotUpdated(multimodalContext));

  // Build payload
  const payload = {
    content,
    inputType,
    voiceTranscript,
    multimodalContext,
    stageElapsedMs: combatOrchestrator.getStageElapsedMs(),
    totalElapsedMs: combatOrchestrator.getTotalElapsedMs(),
    turnsInStage: orchestratorState.turnsInStage,
    totalBudgetMs: combatOrchestrator.state.totalTimeBudget,
  };

  yield put(addUserMessage({ content, inputType }));
  yield put(streamStart());

  combatOrchestrator.transition(COMBAT_STATES.AI_PROCESSING);
  yield put(stateChanged({ combatState: COMBAT_STATES.AI_PROCESSING }));

  const channel = yield call(createCombatSSEChannel, sessionId, payload);

  try {
    let fullText = '';
    let meta = null;

    while (true) {
      const event = yield take(channel);
      if (event.type === 'chunk') {
        yield put(streamChunk(event.token));
      } else if (event.type === 'done') {
        fullText = event.fullText;
        meta = event.meta;

        yield put(
          streamDone({ fullText, starStatus: meta?.starStatus }),
        );

        combatOrchestrator.onTurnComplete();
        yield put(
          stateChanged({ turnsInStage: orchestratorState.turnsInStage + 1 }),
        );

        // Handle combat transition from BE metadata
        const combatTransition = meta?.combatTransition;
        if (combatTransition?.shouldTransition && combatTransition.nextStage) {
          yield delay(500);
          yield call(handleStageTransition, {
            sessionId,
            nextStage: combatTransition.nextStage,
          });
        } else {
          combatOrchestrator.transition(COMBAT_STATES.AI_ASKING);
          yield put(stateChanged({ combatState: COMBAT_STATES.AI_ASKING }));

          yield call(() => sentenceTtsBuffer.waitForFinish());

          combatOrchestrator.transition(COMBAT_STATES.CANDIDATE_THINKING);
          yield put(stateChanged({ combatState: COMBAT_STATES.CANDIDATE_THINKING }));
        }
        break;
      }
    }
  } catch (err) {
    yield put(streamError());
    toast.error('Lỗi kết nối với AI.');
  } finally {
    if (yield cancelled()) {
      channel.close?.();
    }
    // Start multimodal turn tracking for next turn
    multimodalEngine.startTurn();
  }
}

// ─── Stage transition handler ─────────────────────────────────────────────────
function* handleStageTransition({ sessionId, nextStage }) {
  combatOrchestrator.transition(COMBAT_STATES.STAGE_TRANSITION);
  yield put(stateChanged({ combatState: COMBAT_STATES.STAGE_TRANSITION }));

  // Call BE next-stage
  try {
    const data = yield call(behavioralApi.nextStage, sessionId);

    combatOrchestrator.advanceStage(nextStage);
    yield put(stageAdvanced(nextStage));
    yield put(
      nextStageSuccess({
        currentStage: data.currentStage,
        stageName: data.stageName,
        firstQuestion: data.firstQuestion,
      }),
    );

    // TTS stage intro
    combatOrchestrator.transition(COMBAT_STATES.STAGE_INTRO);
    yield put(stateChanged({ combatState: COMBAT_STATES.STAGE_INTRO, currentStage: nextStage }));

    sentenceTtsBuffer.reset();
    sentenceTtsBuffer.appendToken(data.firstQuestion);
    sentenceTtsBuffer.flush();

    combatOrchestrator.transition(COMBAT_STATES.AI_ASKING);
    yield put(stateChanged({ combatState: COMBAT_STATES.AI_ASKING }));

    yield call(() => sentenceTtsBuffer.waitForFinish());

    combatOrchestrator.transition(COMBAT_STATES.CANDIDATE_THINKING);
    yield put(stateChanged({ combatState: COMBAT_STATES.CANDIDATE_THINKING }));
  } catch (err) {
    toast.error('Lỗi chuyển stage.');
    combatOrchestrator.transition(COMBAT_STATES.AI_ASKING);
    yield put(stateChanged({ combatState: COMBAT_STATES.AI_ASKING }));
  }
}

// ─── Manual next stage (Practice mode fallback) ───────────────────────────────
function* combatNextStageSaga(action) {
  const { sessionId } = action.payload;
  const currentStage = yield select((s) => s.combatOrchestrator.currentStage);
  yield call(handleStageTransition, {
    sessionId,
    nextStage: currentStage + 1,
  });
}

// ─── Complete session saga ────────────────────────────────────────────────────
function* combatCompleteSaga(action) {
  const { sessionId } = action.payload;
  try {
    yield put(completeSessionRequest());
    combatOrchestrator.transition(COMBAT_STATES.CLOSING);
    yield put(stateChanged({ combatState: COMBAT_STATES.CLOSING }));

    multimodalEngine.stop();
    yield put(engineStatusChanged('stopped'));

    yield call(behavioralApi.completeSession, sessionId);

    combatOrchestrator.transition(COMBAT_STATES.COMPLETED);
    yield put(stateChanged({ combatState: COMBAT_STATES.COMPLETED }));

    // Poll for score
    for (let i = 0; i < 30; i++) {
      yield delay(3000);
      try {
        const res = yield call(behavioralApi.getScore, sessionId);
        yield put(scoringPolled({ status: res.status, score: res.score }));
        if (res.status === 'COMPLETED') break;
      } catch (_) {}
    }
  } catch (err) {
    yield put(scoringFailure(err.message));
    toast.error('Lỗi kết thúc phiên thi.');
  }
}

// ─── Multimodal engine start saga ─────────────────────────────────────────────
function* combatStartEngineSaga(action) {
  const { mediaStream, sessionId, videoElement } = action.payload;
  yield put(engineStatusChanged('loading'));
  yield call(
    [multimodalEngine, multimodalEngine.start],
    mediaStream,
    sessionId,
    videoElement,
  );
  yield put(engineStatusChanged('running'));
}

// ─── Root watcher ─────────────────────────────────────────────────────────────
export function* watchCombat() {
  yield takeLatest(COMBAT_START_SESSION, combatStartSessionSaga);
  yield takeEvery(COMBAT_SEND_MESSAGE, combatSendMessageSaga);
  yield takeEvery(COMBAT_NEXT_STAGE, combatNextStageSaga);
  yield takeLatest(COMBAT_COMPLETE, combatCompleteSaga);
  yield takeLatest(COMBAT_START_ENGINE, combatStartEngineSaga);
}
