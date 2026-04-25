import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  // session meta
  sessionId: null,
  interviewSessionId: null,
  mode: 'practice',

  // problems
  problems: [],           // Problem[] fetched from server
  sessionProblems: [],    // LiveCodingSessionProblem[] — per-problem state (phase, language, etc.)
  activeProblemId: null,  // managed by FE only
  templates: {},          // { [problemId]: { languageId, starterCode }[] }
  testCases: {},          // { [problemId]: { id, inputData, expectedOutput }[] }

  // derived maps (built from sessionProblems on load)
  problemProgress: {},    // { [problemId]: { phase, approachSubmittedAt, hasTLE, submittedAt } }
  approachTexts: {},      // { [problemId]: string }
  editorCode: {},         // { [problemId]: { [language]: string } } — per (problem, language)

  // run results
  lastRunResults: {},     // { [problemId]: { results[], hasTLE } }

  // hints
  unlockedHints: {},      // { [problemId]: number[] } — indices of revealed hints

  // interview mode timing
  codePhaseStartedAt: {}, // { [problemId]: number } — Date.now() when CODE phase began

  // interview mode transitions
  pendingNextProblemId: null, // set during 3s countdown before switching to next problem

  // AI chat
  aiConversation: [],

  // scoring
  scoringStatus: 'idle',  // 'idle' | 'scoring' | 'completed' | 'error'
  finalScore: null,

  loading: false,
  error: null,
}

const dsaSessionSlice = createSlice({
  name: 'dsaSession',
  initialState,
  reducers: {
    // ─── Session lifecycle ────────────────────────────────────────────────
    startDSARound(state, action) {
      state.interviewSessionId = action.payload.interviewSessionId
      state.loading = true
      state.error = null
    },
    sessionCreated(state, action) {
      const { session, sessionProblems = [], problems, templates = {}, testCases = {} } = action.payload

      state.sessionId = session.id
      state.mode = session.mode
      state.problems = problems
      state.sessionProblems = sessionProblems
      state.templates = templates
      state.testCases = testCases
      state.aiConversation = session.aiConversation ?? []
      state.unlockedHints = {}
      state.lastRunResults = {}
      state.loading = false

      // Set first problem as active, fallback to problems list if sessionProblems is empty
      state.activeProblemId = sessionProblems[0]?.problemId ?? problems[0]?.id ?? null

      // Build derived maps from sessionProblems
      state.problemProgress = {}
      state.approachTexts = {}
      sessionProblems.forEach((sp) => {
        state.problemProgress[sp.problemId] = {
          phase: sp.phase,
          approachSubmittedAt: sp.approachSubmittedAt,
          hasTLE: sp.hasTLE,
          submittedAt: sp.submittedAt,
        }
        state.approachTexts[sp.problemId] = sp.approachText ?? ''
        if (!state.editorCode[sp.problemId]) state.editorCode[sp.problemId] = {}
        const problemTemplates = templates[sp.problemId] ?? []
        let tpl = problemTemplates.find((t) => t.languageId === sp.language)
        if (!tpl && problemTemplates.length > 0) {
          tpl = problemTemplates[0]
          sp.language = tpl.languageId
          const spInList = state.sessionProblems.find((p) => p.problemId === sp.problemId)
          if (spInList) spInList.language = tpl.languageId
        }
        if (!state.editorCode[sp.problemId][sp.language]) {
          state.editorCode[sp.problemId][sp.language] = tpl?.starterCode ?? ''
        }
      })

      // Solo mode: skip READ phase — mutate draft state (not frozen payload)
      if (session.mode === 'solo') {
        state.sessionProblems.forEach((sp) => {
          if (sp.phase === 'READ') sp.phase = 'CODE'
        })
        Object.keys(state.problemProgress).forEach((id) => {
          if (state.problemProgress[id].phase === 'READ') state.problemProgress[id].phase = 'CODE'
        })
      }
    },
    sessionError(state, action) {
      state.loading = false
      state.error = action.payload
    },

    // ─── Problem navigation (FE-only) ────────────────────────────────────
    switchProblem(state, action) {
      state.activeProblemId = action.payload
      state.pendingNextProblemId = null
      if (state.mode === 'solo') {
        const progress = state.problemProgress[action.payload]
        if (!progress || progress.phase === 'READ') {
          state.problemProgress[action.payload] = { ...(progress ?? {}), phase: 'CODE' }
          const sp = state.sessionProblems.find((p) => p.problemId === action.payload)
          if (sp) sp.phase = 'CODE'
        }
      }
    },

    // ─── Phase transitions ────────────────────────────────────────────────
    approachSubmitted(state, action) {
      const { problemId, approachText, updatedProgress } = action.payload
      state.approachTexts[problemId] = approachText
      state.problemProgress[problemId] = updatedProgress
      // Track when CODE phase starts for per-problem timer (interview mode)
      if (updatedProgress.phase === 'CODE' && !state.codePhaseStartedAt[problemId]) {
        state.codePhaseStartedAt[problemId] = Date.now()
      }
      const sp = state.sessionProblems.find((p) => p.problemId === problemId)
      if (sp) { sp.phase = updatedProgress.phase; sp.approachText = approachText }
    },

    // ─── Interview-mode problem transition ────────────────────────────────
    nextProblemPending(state, action) {
      state.pendingNextProblemId = action.payload  // problemId or null
    },

    // ─── Language (per-problem) ───────────────────────────────────────────
    changeLanguage(state, action) {
      const { problemId, language } = action.payload
      const sp = state.sessionProblems.find((p) => p.problemId === problemId)
      if (sp) sp.language = language
      // Init starter code for this language if first time switching to it
      if (!state.editorCode[problemId]) state.editorCode[problemId] = {}
      if (!state.editorCode[problemId][language]) {
        const tpl = (state.templates[problemId] ?? []).find((t) => t.languageId === language)
        state.editorCode[problemId][language] = tpl?.starterCode ?? ''
      }
      // Previously typed code is preserved — no reset
    },

    // ─── Editor ──────────────────────────────────────────────────────────
    setEditorCode(state, action) {
      const { problemId, language, code } = action.payload
      if (!state.editorCode[problemId]) state.editorCode[problemId] = {}
      state.editorCode[problemId][language] = code
    },

    // ─── Run results ──────────────────────────────────────────────────────
    runStarted(state) {
      state.loading = true
    },
    runCompleted(state, action) {
      const { problemId, results, hasTLE } = action.payload
      state.lastRunResults[problemId] = { results, hasTLE }
      state.loading = false
      if (state.problemProgress[problemId]) {
        state.problemProgress[problemId].hasTLE = hasTLE
      }
      const sp = state.sessionProblems.find((p) => p.problemId === problemId)
      if (sp) sp.hasTLE = hasTLE
    },
    runFailed(state, action) {
      state.loading = false
      state.error = action.payload
    },

    // ─── Hints ───────────────────────────────────────────────────────────
    unlockHint(state, action) {
      const { problemId, hintIndex } = action.payload
      if (!state.unlockedHints[problemId]) state.unlockedHints[problemId] = []
      if (!state.unlockedHints[problemId].includes(hintIndex)) {
        state.unlockedHints[problemId].push(hintIndex)
      }
    },

    // ─── AI conversation ─────────────────────────────────────────────────
    aiMessageReceived(state, action) {
      state.aiConversation = [...state.aiConversation, action.payload]
    },
    triggerIdleAI(state) {},

    // ─── Submit ──────────────────────────────────────────────────────────
    submitProblem(state, action) {
      const { problemId } = action.payload
      const now = new Date().toISOString()
      if (state.problemProgress[problemId]) {
        state.problemProgress[problemId].phase = 'DONE'
        state.problemProgress[problemId].submittedAt = now
      }
      const sp = state.sessionProblems.find((p) => p.problemId === problemId)
      if (sp) { sp.phase = 'DONE'; sp.submittedAt = now }
    },
    allSubmitted(state) {
      state.scoringStatus = 'scoring'
    },

    // ─── Polling ─────────────────────────────────────────────────────────
    scoringPolled(state, action) {
      state.scoringStatus = action.payload.status === 'COMPLETED' ? 'completed' : 'scoring'
      if (action.payload.score) state.finalScore = action.payload.score
    },
    debriefReady(state, action) {
      state.scoringStatus = 'completed'
      state.finalScore = action.payload
    },
    debriefTimeout(state) {
      state.scoringStatus = 'error'
      state.error = 'Chấm điểm mất quá nhiều thời gian. Vui lòng tải lại.'
    },

    // ─── Reset ───────────────────────────────────────────────────────────
    resetDSASession() {
      return initialState
    },
  },
})

export const {
  startDSARound,
  sessionCreated,
  sessionError,
  switchProblem,
  approachSubmitted,
  nextProblemPending,
  changeLanguage,
  setEditorCode,
  runStarted,
  runCompleted,
  runFailed,
  unlockHint,
  aiMessageReceived,
  triggerIdleAI,
  submitProblem,
  allSubmitted,
  scoringPolled,
  debriefReady,
  debriefTimeout,
  resetDSASession,
} = dsaSessionSlice.actions

export default dsaSessionSlice.reducer
