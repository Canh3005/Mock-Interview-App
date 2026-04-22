import { call, put, select, takeLatest } from 'redux-saga/effects'
import { toast } from 'sonner'
import { practiceApi } from '../../api/practice.api'
import { sessionCreated } from '../slices/dsaSessionSlice'
import {
  loadProblems,
  setFilters,
  setPage,
  problemsLoaded,
  problemsLoadFailed,
  solvedLoaded,
  startPracticeDSASession,
  practiceDSASessionReady,
  markSolved,
} from '../slices/practiceDSASlice'

function* loadProblemsSaga() {
  try {
    const { filters, currentPage, limit } = yield select((s) => s.practiceDSA)
    const data = yield call(practiceApi.getPublicProblems, {
      search: filters.search || undefined,
      difficulty: filters.difficulty || undefined,
      tag: filters.tag || undefined,
      page: currentPage,
      limit,
    })
    yield put(problemsLoaded(data))
  } catch (err) {
    const msg = err.response?.data?.message || 'Không thể tải danh sách bài tập.'
    yield put(problemsLoadFailed(msg))
    toast.error(msg)
  }
}

function* loadSolvedSaga() {
  try {
    const ids = yield call(practiceApi.getSolvedProblemIds)
    yield put(solvedLoaded(ids))
  } catch {
    // Non-critical — fail silently, UI degrades gracefully (no checkmarks)
  }
}

function* persistSolvedSaga(action) {
  try {
    yield call(practiceApi.markSolved, action.payload)
  } catch {
    // Non-critical — local state already updated optimistically
  }
}

function* startPracticeSessionSaga(action) {
  try {
    const { problemId, language } = action.payload

    const { problem, templates, testCases } = yield call(practiceApi.getProblem, problemId)

    // Build session-like state without creating a DB session
    const fakeSession = { id: null, mode: 'solo', aiConversation: [] }
    const sessionProblems = [{
      problemId: problem.id,
      phase: 'CODE',
      language,
      approachText: null,
      approachSubmittedAt: null,
      submittedAt: null,
      hasTLE: false,
      lastRunAt: null,
      runHistory: [],
      order: 0,
    }]
    const templateMap = { [problem.id]: templates }
    const testCasesMap = { [problem.id]: testCases ?? [] }

    yield put(sessionCreated({
      session: fakeSession,
      sessionProblems,
      problems: [problem],
      templates: templateMap,
      testCases: testCasesMap,
    }))
    yield put(practiceDSASessionReady({ sessionId: null, problemId }))
  } catch (err) {
    const msg = err.response?.data?.message || 'Không thể tải bài tập.'
    toast.error(msg)
  }
}

export function* watchPracticeDSASaga() {
  yield takeLatest([loadProblems.type, setFilters.type, setPage.type], loadProblemsSaga)
  yield takeLatest(loadProblems.type, loadSolvedSaga)
  yield takeLatest(markSolved.type, persistSolvedSaga)
  yield takeLatest(startPracticeDSASession.type, startPracticeSessionSaga)
}
