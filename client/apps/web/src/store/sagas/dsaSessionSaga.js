import { call, put, select, takeLatest, delay } from 'redux-saga/effects'
import { dsaApi } from '../../api/dsa.api'
import { toast } from 'sonner'
import {
  startDSARound,
  sessionCreated,
  sessionError,
  switchProblem,
  approachSubmitted,
  nextProblemPending,
  changeLanguage,
  runStarted,
  runCompleted,
  runFailed,
  triggerIdleAI,
  submitProblem,
  allSubmitted,
  scoringPolled,
  debriefReady,
  debriefTimeout,
} from '../slices/dsaSessionSlice'
import { initSessionSuccess } from '../slices/interviewSetupSlice'

// ─── Start DSA round (triggered from behavioralSaga after nextRound='dsa') ──

function* startDSARoundSaga(action) {
  try {
    const { interviewSessionId } = action.payload
    const { selectedMode, dsaConfig } = yield select((s) => s.interviewSetup)

    const session = yield call(dsaApi.createSession, {
      interviewSessionId,
      mode: selectedMode ?? 'practice',
      problemCount: dsaConfig.problemCount,
    })

    const { session: sessionData, sessionProblems, problems, templates, testCases } = yield call(dsaApi.getSession, session.id)

    yield put(sessionCreated({ session: sessionData, sessionProblems, problems, templates, testCases }))
  } catch (err) {
    const msg = err.response?.data?.message || 'Không thể khởi tạo vòng DSA.'
    yield put(sessionError(msg))
    toast.error(msg)
  }
}

// ─── Submit approach ──────────────────────────────────────────────────────────

function* submitApproachSaga(action) {
  try {
    const { sessionId } = yield select((s) => s.dsaSession)
    const { problemId, approachText } = action.payload
    const updatedSession = yield call(dsaApi.submitApproach, sessionId, problemId, approachText)
    yield put(approachSubmitted({
      problemId,
      approachText,
      updatedProgress: updatedSession.problemProgress?.[problemId] ?? { phase: 'CODE' },
    }))
  } catch (err) {
    toast.error('Không thể lưu approach.')
  }
}

// ─── Run code ────────────────────────────────────────────────────────────────

function* runCodeSaga(action) {
  try {
    yield put(runStarted())
    const { sessionId, editorCode, activeProblemId, sessionProblems } = yield select((s) => s.dsaSession)
    const problemId = action.payload?.problemId ?? activeProblemId
    const language = sessionProblems.find((sp) => sp.problemId === problemId)?.language ?? 'python'
    const code = editorCode[problemId]?.[language] ?? ''

    const { results, hasTLE } = yield call(dsaApi.runCode, sessionId, problemId, code, language)
    yield put(runCompleted({ problemId, results, hasTLE }))
  } catch (err) {
    const msg = err.response?.data?.message || 'Lỗi khi chạy code.'
    yield put(runFailed(msg))
    toast.error(msg)
  }
}

// ─── Idle trigger ─────────────────────────────────────────────────────────────

function* triggerIdleSaga() {
  try {
    const { sessionId, activeProblemId } = yield select((s) => s.dsaSession)
    if (!activeProblemId) return
    yield call(dsaApi.triggerIdle, sessionId, activeProblemId)
  } catch {
    // Non-critical
  }
}

// ─── Submit problem ───────────────────────────────────────────────────────────

function* submitProblemSaga(action) {
  try {
    const {
      sessionId, editorCode, sessionProblems, mode,
      problems, problemProgress, codePhaseStartedAt,
      approachTexts, unlockedHints,
    } = yield select((s) => s.dsaSession)

    // Solo mode: slice action already handled in component, skip saga work
    if (mode === 'solo') return

    const { problemId } = action.payload
    const language = sessionProblems.find((sp) => sp.problemId === problemId)?.language ?? 'python'
    const code = editorCode[problemId]?.[language] ?? ''
    const hintsUsed = (unlockedHints[problemId] ?? []).length
    const approachText = approachTexts[problemId] ?? ''
    const timeUsedMs = codePhaseStartedAt[problemId]
      ? Date.now() - codePhaseStartedAt[problemId]
      : null

    const { allSubmitted: isAllDone } = yield call(
      dsaApi.submitProblem, sessionId, problemId, code, language,
      { hintsUsed, approachText, timeUsedMs },
    )

    if (isAllDone) {
      yield put(allSubmitted())
      yield* pollForDebrief(sessionId)
    } else {
      // Auto-advance to next problem (interview mode, multiple problems)
      const currentIdx = problems.findIndex((p) => p.id === problemId)
      const nextProblem = problems[currentIdx + 1]
      if (nextProblem && !problemProgress[nextProblem.id]?.submittedAt) {
        yield put(nextProblemPending(nextProblem.id))
        yield delay(3000)
        yield put(switchProblem(nextProblem.id))
      }
    }
  } catch (err) {
    toast.error('Không thể nộp bài.')
  }
}

function* pollForDebrief(sessionId) {
  for (let i = 0; i < 20; i++) {
    yield delay(3000)
    try {
      const data = yield call(dsaApi.getScore, sessionId)
      yield put(scoringPolled(data))
      if (data.status === 'COMPLETED') {
        if (data.nextRound) {
          // Future rounds — extend here if needed
        } else {
          yield put(debriefReady(data.score))
        }
        return
      }
    } catch {
      // Ignore polling errors, keep trying
    }
  }
  yield put(debriefTimeout())
}

// ─── Root watcher ─────────────────────────────────────────────────────────────

export function* watchDsaSessionSaga() {
  yield takeLatest(startDSARound.type, startDSARoundSaga)
  yield takeLatest('dsaSession/submitApproachRequest', submitApproachSaga)
  yield takeLatest('dsaSession/runCodeRequest', runCodeSaga)
  yield takeLatest(triggerIdleAI.type, triggerIdleSaga)
  yield takeLatest(submitProblem.type, submitProblemSaga)
}
