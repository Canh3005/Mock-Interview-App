import { combatApi } from '../../api/combat.api'

const READINESS_POLL_MS = 250
const DEFAULT_STABLE_MS = 1500
const DEFAULT_MIN_VIEWPORT_RATIO = 0.8
const DEFAULT_GRACE_PERIOD_MS = 5000
const HIGH_HIDE_THRESHOLD_MS = 5_000
const MULTI_FACE_FLAG_MS = 3_000
const SECOND_VOICE_TICK_MS = 200
const NO_FACE_FLAG_MS = 10_000
const SECOND_VOICE_TICKS_TO_FLAG = 25
const SPEECH_RMS_THRESHOLD = 0.05

const IDB_DB_NAME = 'combat-proctoring-db'
const IDB_STORE = 'proctoring-buffer'
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getViewportRatio() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 0

  const widthRatio = window.screen?.width
    ? window.innerWidth / window.screen.width
    : 1
  const heightRatio = window.screen?.height
    ? window.innerHeight / window.screen.height
    : 1
  const ratio = Math.min(widthRatio, heightRatio)

  return Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0
}

function getMediaSnapshot(stream) {
  const videoTrack = stream?.getVideoTracks?.()[0]
  const audioTrack = stream?.getAudioTracks?.()[0]

  return {
    cameraReady: !!videoTrack && videoTrack.readyState === 'live',
    microphoneReady: !!audioTrack && audioTrack.readyState === 'live',
  }
}

function openIdb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'clientEventId' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbPut(event) {
  try {
    const db = await openIdb()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).put(event)
      tx.oncomplete = () => resolve(null)
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // Keep silent. Memory buffer still works as fallback.
  }
}

async function idbGetAll() {
  try {
    const db = await openIdb()
    const events = await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).getAll()
      req.onsuccess = () => resolve(req.result ?? [])
      req.onerror = () => reject(req.error)
    })
    db.close()
    return events
  } catch {
    return []
  }
}

async function idbDeleteMany(clientEventIds) {
  if (!clientEventIds.length) return
  try {
    const db = await openIdb()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      const store = tx.objectStore(IDB_STORE)
      clientEventIds.forEach((id) => store.delete(id))
      tx.oncomplete = () => resolve(null)
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // noop
  }
}

export function getCombatReadinessSnapshot({
  stream,
  requireCamera = true,
  requireMicrophone = true,
  requireVisibleTab = true,
  requireFocusedWindow = true,
  minViewportRatio = DEFAULT_MIN_VIEWPORT_RATIO,
} = {}) {
  const media = getMediaSnapshot(stream)
  const tabVisible = typeof document === 'undefined' ? false : !document.hidden
  const windowFocused = typeof document === 'undefined' ? false : document.hasFocus()
  const viewportRatio = getViewportRatio()

  const meetsCamera = !requireCamera || media.cameraReady
  const meetsMicrophone = !requireMicrophone || media.microphoneReady
  const meetsTab = !requireVisibleTab || tabVisible
  const meetsFocus = !requireFocusedWindow || windowFocused
  const meetsViewport = viewportRatio >= minViewportRatio

  return {
    ...media,
    tabVisible,
    windowFocused,
    viewportRatio,
    ready: meetsCamera && meetsMicrophone && meetsTab && meetsFocus && meetsViewport,
  }
}

// export function waitForCombatReadiness({
//   stream,
//   stableMs = DEFAULT_STABLE_MS,
//   requireCamera = true,
//   requireMicrophone = true,
//   requireVisibleTab = true,
//   requireFocusedWindow = true,
//   minViewportRatio = DEFAULT_MIN_VIEWPORT_RATIO,
//   onUpdate,
//   signal,
// } = {}) {
//   return new Promise((resolve, reject) => {
//     let stableSince = null
//     let cancelled = false

//     const cleanup = () => {
//       cancelled = true
//       clearInterval(intervalId)
//       document.removeEventListener('visibilitychange', tick)
//       window.removeEventListener('focus', tick)
//       window.removeEventListener('blur', tick)
//       window.removeEventListener('resize', tick)
//       signal?.removeEventListener('abort', onAbort)
//     }

//     const finish = (snapshot) => {
//       cleanup()
//       resolve(snapshot)
//     }

//     const onAbort = () => {
//       if (cancelled) return
//       cleanup()
//       reject(new DOMException('Aborted', 'AbortError'))
//     }

//     const tick = () => {
//       if (cancelled) return

//       const snapshot = getCombatReadinessSnapshot({
//         stream,
//         requireCamera,
//         requireMicrophone,
//         requireVisibleTab,
//         requireFocusedWindow,
//         minViewportRatio,
//       })

//       onUpdate?.(snapshot)

//       if (snapshot.ready) {
//         if (stableSince == null) {
//           stableSince = Date.now()
//         }
//         if (Date.now() - stableSince >= stableMs) {
//           finish({
//             ...snapshot,
//             stableForMs: Date.now() - stableSince,
//           })
//         }
//       } else {
//         stableSince = null
//       }
//     }

//     if (signal?.aborted) {
//       reject(new DOMException('Aborted', 'AbortError'))
//       return
//     }

//     const intervalId = window.setInterval(tick, READINESS_POLL_MS)
//     document.addEventListener('visibilitychange', tick)
//     window.addEventListener('focus', tick)
//     window.addEventListener('blur', tick)
//     window.addEventListener('resize', tick)
//     signal?.addEventListener('abort', onAbort, { once: true })

//     tick()
//   })
// }

export class CombatProctoringMonitor {
  constructor({
    sessionId,
    interviewSessionId,
    isAiSpeaking,
    getFaceCount,
    getVadResult,
    getLastTranscriptTs,
    getOrchestratorState,
    gracePeriodMs = DEFAULT_GRACE_PERIOD_MS,
  } = {}) {
    this.sessionId = sessionId
    this.interviewSessionId = interviewSessionId
    this.isAiSpeaking = isAiSpeaking
    this.getFaceCount = getFaceCount
    this.getVadResult = getVadResult
    this.getLastTranscriptTs = getLastTranscriptTs
    this.getOrchestratorState = getOrchestratorState
    this.gracePeriodMs = gracePeriodMs

    this.startedAt = 0
    this.hiddenSince = null
    this.blurredSince = null
    this.devtoolsFlagged = false
    this.buffer = []
    this.flushTimer = null

    this.multiFaceMs = 0
    this.noFaceMs = 0
    this.lastFaceTickTs = 0
    this.faceInterval = null

    this.secondVoiceCounter = 0
    this.secondVoiceInterval = null

    this._onVisibilityChange = this._onVisibilityChange.bind(this)
    this._onBlur = this._onBlur.bind(this)
    this._onFocus = this._onFocus.bind(this)
    this._onResize = this._onResize.bind(this)
    this._onSelectionChange = this._onSelectionChange.bind(this)
    this._onOnline = this._onOnline.bind(this)
    this._onBeforeUnload = this._onBeforeUnload.bind(this)
  }

  start() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    if (this.startedAt) return

    this.startedAt = Date.now()
    document.addEventListener('visibilitychange', this._onVisibilityChange)
    window.addEventListener('blur', this._onBlur)
    window.addEventListener('focus', this._onFocus)
    window.addEventListener('resize', this._onResize)
    document.addEventListener('selectionchange', this._onSelectionChange)
    window.addEventListener('online', this._onOnline)
    window.addEventListener('beforeunload', this._onBeforeUnload)

    this._startFaceMonitor()
    this._startSecondVoiceMonitor()
    void this._flushBufferedFromIdb()
  }

  stop() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    document.removeEventListener('visibilitychange', this._onVisibilityChange)
    window.removeEventListener('blur', this._onBlur)
    window.removeEventListener('focus', this._onFocus)
    window.removeEventListener('resize', this._onResize)
    document.removeEventListener('selectionchange', this._onSelectionChange)
    window.removeEventListener('online', this._onOnline)
    window.removeEventListener('beforeunload', this._onBeforeUnload)

    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    if (this.faceInterval) {
      clearInterval(this.faceInterval)
      this.faceInterval = null
    }
    if (this.secondVoiceInterval) {
      clearInterval(this.secondVoiceInterval)
      this.secondVoiceInterval = null
    }

    this.startedAt = 0
    this.hiddenSince = null
    this.blurredSince = null
    this.devtoolsFlagged = false
    this.multiFaceMs = 0
    this.noFaceMs = 0
    this.lastFaceTickTs = 0
    this.secondVoiceCounter = 0
  }

  _onOnline() {
    void this._flushBufferedFromIdb()
  }

  _onBeforeUnload() {
    if (!this.buffer.length || !navigator.sendBeacon || !this.sessionId) return
    const payload = JSON.stringify({ events: this.buffer })
    navigator.sendBeacon(
      `${API_BASE_URL}/combat/sessions/${this.sessionId}/proctoring-event/batch`,
      payload,
    )
  }

  async _flushBufferedFromIdb() {
    const pending = await idbGetAll()
    if (!pending.length || !this.sessionId) return

    try {
      await combatApi.ingestProctoringEventBatch(this.sessionId, {
        events: pending,
      })
      await idbDeleteMany(pending.map((e) => e.clientEventId))
    } catch {
      // Keep data for next retry
    }
  }

  _enqueue(event) {
    if (!this.sessionId) return

    const fullEvent = {
      clientEventId: event.clientEventId ?? randomId(),
      sessionId: this.sessionId,
      ts: event.ts ?? Date.now(),
      eventType: event.eventType ?? event.type,
      type: event.type ?? event.eventType,
      severity: event.severity,
      durationMs: event.durationMs,
      metadata: event.metadata,
      viewportRatio: event.viewportRatio,
    }

    this.buffer.push(fullEvent)
    void idbPut(fullEvent)

    if (!this.flushTimer) {
      this.flushTimer = window.setTimeout(() => {
        this.flushTimer = null
        const batch = this.buffer.splice(0, this.buffer.length)
        batch.forEach((item) => {
          combatApi
            .ingestProctoringEvent(this.sessionId, item)
            .then(() => idbDeleteMany([item.clientEventId]))
            .catch(() => {})
        })
      }, 0)
    }
  }

  _withinGrace() {
    return Date.now() - this.startedAt < this.gracePeriodMs
  }

  _severityForContext(defaultSeverity = 'LOW') {
    if (this.isAiSpeaking?.()) return 'MEDIUM'
    return defaultSeverity
  }

  _startFaceMonitor() {
    this.lastFaceTickTs = Date.now()
    this.faceInterval = window.setInterval(() => {
      const now = Date.now()
      const elapsed = now - this.lastFaceTickTs
      this.lastFaceTickTs = now

      const faceCount = this.getFaceCount?.() ?? 1
      if (faceCount === 0) {
        this.multiFaceMs = 0
        this.noFaceMs += elapsed
        if (this.noFaceMs >= NO_FACE_FLAG_MS) {
          this._enqueue({
            ts: now,
            type: 'NO_FACE',
            severity: 'MEDIUM',
            durationMs: this.noFaceMs,
          })
          this.noFaceMs = 0
        }
        return
      }

      if (faceCount >= 2) {
        this.noFaceMs = 0
        this.multiFaceMs += elapsed
        if (this.multiFaceMs >= MULTI_FACE_FLAG_MS) {
          this._enqueue({
            ts: now,
            type: 'MULTIPLE_FACES',
            severity: 'HIGH',
            durationMs: this.multiFaceMs,
            metadata: { faceCount },
          })
          this.multiFaceMs = 0
        }
        return
      }

      this.multiFaceMs = 0
      this.noFaceMs = 0
    }, 1000)
  }

  _startSecondVoiceMonitor() {
    this.secondVoiceInterval = window.setInterval(() => {
      const state = this.getOrchestratorState?.() ?? ''
      const ttsPlaying = this.isAiSpeaking?.() ?? false
      const shouldRun =
        (state === 'CANDIDATE_THINKING' || state === 'CANDIDATE_SPEAKING') &&
        !ttsPlaying

      if (!shouldRun) {
        this.secondVoiceCounter = 0
        return
      }

      const vadResult = this.getVadResult?.()
      const rms = vadResult?.rmsLevel ?? 0
      const isSpeechDetected = rms > SPEECH_RMS_THRESHOLD

      if (!isSpeechDetected) {
        this.secondVoiceCounter = Math.max(0, this.secondVoiceCounter - 1)
      } else if (state === 'CANDIDATE_THINKING') {
        this.secondVoiceCounter += 1
      } else {
        const lastTranscriptTs = this.getLastTranscriptTs?.() ?? 0
        const hasNewTranscript = lastTranscriptTs > Date.now() - 500
        if (!hasNewTranscript) {
          this.secondVoiceCounter += 1
        } else {
          this.secondVoiceCounter = Math.max(0, this.secondVoiceCounter - 1)
        }
      }

      if (this.secondVoiceCounter >= SECOND_VOICE_TICKS_TO_FLAG) {
        this._enqueue({
          ts: Date.now(),
          type: 'SECOND_VOICE',
          severity: 'HIGH',
          metadata: {
            orchestratorState: state,
            ttsWasPlaying: ttsPlaying,
            rmsLevel: rms,
          },
        })
        this.secondVoiceCounter = 0
      }
    }, SECOND_VOICE_TICK_MS)
  }

  _onVisibilityChange() {
    const now = Date.now()
    if (document.hidden) {
      this.hiddenSince = now
      if (this._withinGrace()) return

      const severity = this._severityForContext('HIGH')
      this._enqueue({
        ts: now,
        type: 'TAB_HIDDEN',
        severity,
        viewportRatio: getViewportRatio(),
      })

      window.setTimeout(() => {
        if (!document.hidden || this.hiddenSince == null) return
        const durationMs = Date.now() - this.hiddenSince
        if (durationMs >= HIGH_HIDE_THRESHOLD_MS) {
          this._enqueue({
            ts: Date.now(),
            type: 'TAB_HIDDEN',
            severity: 'HIGH',
            durationMs,
            viewportRatio: getViewportRatio(),
          })
        }
      }, HIGH_HIDE_THRESHOLD_MS)
      return
    }

    if (this.hiddenSince != null) {
      const durationMs = now - this.hiddenSince
      this.hiddenSince = null
      this._enqueue({
        ts: now,
        type: 'TAB_VISIBLE',
        severity: 'LOW',
        durationMs,
        viewportRatio: getViewportRatio(),
      })
    }
  }

  _onBlur() {
    const now = Date.now()
    this.blurredSince = now
    if (this._withinGrace()) return

    this._enqueue({
      ts: now,
      type: 'WINDOW_BLUR',
      severity: this._severityForContext('MEDIUM'),
      viewportRatio: getViewportRatio(),
    })
  }

  _onFocus() {
    const now = Date.now()
    if (this.blurredSince != null) {
      const durationMs = now - this.blurredSince
      this.blurredSince = null
      if (!this._withinGrace()) {
        this._enqueue({
          ts: now,
          type: 'WINDOW_FOCUS',
          severity: 'LOW',
          durationMs,
          viewportRatio: getViewportRatio(),
        })
      }
    }
  }

  _onResize() {
    if (this._withinGrace()) return

    const devtoolsLikelyOpen =
      window.outerWidth - window.innerWidth > 160 ||
      window.outerHeight - window.innerHeight > 160

    if (devtoolsLikelyOpen && !this.devtoolsFlagged) {
      this.devtoolsFlagged = true
      this._enqueue({
        ts: Date.now(),
        type: 'DEVTOOLS_OPEN',
        severity: 'LOW',
        viewportRatio: getViewportRatio(),
      })
    }

    if (!devtoolsLikelyOpen) {
      this.devtoolsFlagged = false
    }
  }

  _onSelectionChange() {
    // Whitelisted: selection/copy inside question area intentionally ignored.
  }
}
