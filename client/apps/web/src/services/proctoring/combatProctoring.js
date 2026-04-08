import { combatApi } from '../../api/combat.api'

const READINESS_POLL_MS = 250
const DEFAULT_STABLE_MS = 1500
const DEFAULT_MIN_VIEWPORT_RATIO = 0.8
const DEFAULT_GRACE_PERIOD_MS = 5000
const HIGH_HIDE_THRESHOLD_MS = 10_000

function getViewportRatio() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 0

  const widthRatio = window.screen?.width ? window.innerWidth / window.screen.width : 1
  const heightRatio = window.screen?.height ? window.innerHeight / window.screen.height : 1
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

export class CombatProctoringMonitor {
  constructor({ sessionId, isAiSpeaking, gracePeriodMs = DEFAULT_GRACE_PERIOD_MS } = {}) {
    this.sessionId = sessionId
    this.isAiSpeaking = isAiSpeaking
    this.gracePeriodMs = gracePeriodMs
    this.startedAt = 0
    this.hiddenSince = null
    this.blurredSince = null
    this.devtoolsFlagged = false
    this.buffer = []
    this.flushTimer = null
    this._onVisibilityChange = this._onVisibilityChange.bind(this)
    this._onBlur = this._onBlur.bind(this)
    this._onFocus = this._onFocus.bind(this)
    this._onResize = this._onResize.bind(this)
    this._onSelectionChange = this._onSelectionChange.bind(this)
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
  }

  stop() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    document.removeEventListener('visibilitychange', this._onVisibilityChange)
    window.removeEventListener('blur', this._onBlur)
    window.removeEventListener('focus', this._onFocus)
    window.removeEventListener('resize', this._onResize)
    document.removeEventListener('selectionchange', this._onSelectionChange)

    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    this.buffer = []
    this.startedAt = 0
    this.hiddenSince = null
    this.blurredSince = null
    this.devtoolsFlagged = false
  }

  _enqueue(event) {
    if (!this.sessionId) return
    this.buffer.push(event)
    if (!this.flushTimer) {
      this.flushTimer = window.setTimeout(() => {
        this.flushTimer = null
        const batch = this.buffer.splice(0, this.buffer.length)
        batch.forEach((item) => {
          combatApi.ingestProctoringEvent(this.sessionId, item).catch(() => {})
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
      (window.outerWidth - window.innerWidth > 160) ||
      (window.outerHeight - window.innerHeight > 160)

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
    // Whitelisted: selection/copy inside the question area does not emit a flag.
  }
}