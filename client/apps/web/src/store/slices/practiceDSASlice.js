import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  problems: [],
  total: 0,
  currentPage: 1,
  limit: 20,
  filters: { search: '', difficulty: '', tag: '' },
  loading: false,
  error: null,
  solvedProblemIds: [],
  activeSessionId: null,
  activeProblemId: null,
  problemLoading: false,
}

const practiceDSASlice = createSlice({
  name: 'practiceDSA',
  initialState,
  reducers: {
    loadProblems(state) {
      state.loading = true
      state.error = null
    },
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload }
      state.currentPage = 1
    },
    setPage(state, action) {
      state.currentPage = action.payload
    },
    problemsLoaded(state, action) {
      const { data, total, page, limit } = action.payload
      state.problems = data
      state.total = total
      state.currentPage = page
      state.limit = limit
      state.loading = false
      state.error = null
    },
    problemsLoadFailed(state, action) {
      state.loading = false
      state.error = action.payload
    },
    startPracticeDSASession(state) {
      state.error = null
      state.problemLoading = true
    },
    practiceDSASessionReady(state, action) {
      state.activeSessionId = action.payload.sessionId
      state.activeProblemId = action.payload.problemId
      state.problemLoading = false
    },
    solvedLoaded(state, action) {
      state.solvedProblemIds = action.payload
    },
    markSolved(state, action) {
      if (!state.solvedProblemIds.includes(action.payload)) {
        state.solvedProblemIds.push(action.payload)
      }
    },
    resetPracticeSession(state) {
      state.activeSessionId = null
      state.activeProblemId = null
    },
  },
})

export const {
  loadProblems,
  setFilters,
  setPage,
  problemsLoaded,
  problemsLoadFailed,
  solvedLoaded,
  startPracticeDSASession,
  practiceDSASessionReady,
  markSolved,
  resetPracticeSession,
} = practiceDSASlice.actions

export default practiceDSASlice.reducer
