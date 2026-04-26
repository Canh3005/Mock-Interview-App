import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  sessionId: null,
  interviewSessionId: null,
  phase: 'CLARIFICATION',
  enableCurveball: true,
  durationMinutes: 45,
  problem: null,

  architectureJSON: null,
  isDirty: false,
  lastSavedAt: null,
  autoSaveStatus: 'idle',

  transcriptHistory: [],

  loading: false,
  error: null,
}

const sdSessionSlice = createSlice({
  name: 'sdSession',
  initialState,
  reducers: {
    loadRequest(state) {
      state.loading = true
      state.error = null
    },
    loadSuccess(state, action) {
      const { id, interviewSessionId, phase, enableCurveball, durationMinutes, problem, architectureJSON, transcriptHistory } = action.payload
      state.sessionId = id
      state.interviewSessionId = interviewSessionId
      state.phase = phase ?? 'CLARIFICATION'
      state.enableCurveball = enableCurveball ?? true
      state.durationMinutes = durationMinutes ?? 45
      state.problem = problem ?? null
      state.architectureJSON = architectureJSON ?? null
      state.transcriptHistory = transcriptHistory ?? []
      state.loading = false
      state.error = null
    },
    loadFailure(state, action) {
      state.loading = false
      state.error = action.payload
    },

    canvasChanged() {},

    setArchitectureJSON(state, action) {
      state.architectureJSON = action.payload
    },
    setDirty(state, action) {
      state.isDirty = action.payload
    },

    autoSaveStart(state) {
      state.autoSaveStatus = 'saving'
    },
    autoSaveSuccess(state) {
      state.autoSaveStatus = 'saved'
      state.isDirty = false
      state.lastSavedAt = Date.now()
    },
    autoSaveFailure(state) {
      state.autoSaveStatus = 'error'
    },

    phaseUpdated(state, action) {
      state.phase = action.payload
    },

    appendTranscriptRequest() {},
    transcriptAppended(state, action) {
      state.transcriptHistory = [...state.transcriptHistory, action.payload]
    },

    resetSDSession() {
      return initialState
    },
  },
})

export const {
  loadRequest,
  loadSuccess,
  loadFailure,
  canvasChanged,
  setArchitectureJSON,
  setDirty,
  autoSaveStart,
  autoSaveSuccess,
  autoSaveFailure,
  phaseUpdated,
  appendTranscriptRequest,
  transcriptAppended,
  resetSDSession,
} = sdSessionSlice.actions

export default sdSessionSlice.reducer
