import { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RefreshCw,
  UserCheck,
  Users,
  UserX,
  XCircle,
} from 'lucide-react'
import {
  initSessionRequest,
  proceedFromCombatPermission,
  selectMode,
  setCombatPermissions,
} from '../../../store/slices/interviewSetupSlice'
import { faceDetector } from '../../../services/FaceDetector'
import { getCombatReadinessSnapshot } from '../../../services/proctoring/combatProctoring'

function ReadinessItem({ label, ok }) {
  return (
    <div
      className={[
        'flex items-center gap-2 rounded-[14px] border px-3 py-2 text-xs font-semibold',
        ok
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
          : 'border-[var(--dash-border)] bg-[var(--dash-surface-muted)] text-[var(--dash-muted)]',
      ].join(' ')}
    >
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
      {label}
    </div>
  )
}

export default function CombatPermissionGate() {
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const [requestNonce, setRequestNonce] = useState(0)
  const [status, setStatus] = useState('requesting')
  const [faceStatus, setFaceStatus] = useState('loading')
  const [faceCount, setFaceCount] = useState(0)
  const [previewReady, setPreviewReady] = useState(false)
  const [readinessSnapshot, setReadinessSnapshot] = useState(null)
  const [readinessTick, setReadinessTick] = useState(0)

  const releaseMedia = useCallback(() => {
    faceDetector.stop()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const resetDeviceState = useCallback(() => {
    setStatus('requesting')
    setFaceStatus('loading')
    setFaceCount(0)
    setPreviewReady(false)
    setReadinessSnapshot(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    resetDeviceState()

    async function requestPermissions() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        dispatch(setCombatPermissions({ webcam: 'granted', microphone: 'granted' }))
        setStatus('granted')
      } catch {
        if (!cancelled) {
          dispatch(setCombatPermissions({ webcam: 'denied', microphone: 'denied', faceDetected: false }))
          setStatus('denied')
        }
      }
    }

    requestPermissions()

    return () => {
      cancelled = true
      releaseMedia()
    }
  }, [dispatch, releaseMedia, requestNonce, resetDeviceState])

  useEffect(() => {
    if (status !== 'granted' || !streamRef.current) return
    const video = videoRef.current
    if (!video) return

    video.srcObject = streamRef.current
    if (video.readyState >= 1) {
      setPreviewReady(true)
      return
    }

    const handleLoadedMetadata = () => setPreviewReady(true)
    video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true })

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [status])

  const onFaceResult = useCallback(({ faceCount: count }) => {
    setFaceCount(count)
    if (count === 1) {
      setFaceStatus('ok')
    } else if (count === 0) {
      setFaceStatus('no_face')
    } else {
      setFaceStatus('multi_face')
    }
  }, [])

  useEffect(() => {
    if (!previewReady || !videoRef.current) return
    let cancelled = false

    async function startDetection() {
      const ready = await faceDetector.init()
      if (cancelled) return

      if (ready) {
        faceDetector.start(videoRef.current, onFaceResult, 800)
        return
      }

      const track = streamRef.current?.getVideoTracks()[0]
      const settings = track?.getSettings()
      setFaceStatus(settings?.width > 0 ? 'ok' : 'no_face')
    }

    startDetection()

    return () => {
      cancelled = true
      faceDetector.stop()
    }
  }, [onFaceResult, previewReady])

  useEffect(() => {
    if (status !== 'granted' || faceStatus !== 'ok' || !streamRef.current) return

    const updateSnapshot = () => {
      setReadinessSnapshot(
        getCombatReadinessSnapshot({
          stream: streamRef.current,
          minViewportRatio: 0.7,
        }),
      )
    }

    const intervalId = window.setInterval(updateSnapshot, 250)
    document.addEventListener('visibilitychange', updateSnapshot)
    window.addEventListener('focus', updateSnapshot)
    window.addEventListener('blur', updateSnapshot)
    window.addEventListener('resize', updateSnapshot)
    updateSnapshot()

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', updateSnapshot)
      window.removeEventListener('focus', updateSnapshot)
      window.removeEventListener('blur', updateSnapshot)
      window.removeEventListener('resize', updateSnapshot)
    }
  }, [faceStatus, readinessTick, status])

  useEffect(() => {
    if (faceStatus === 'loading') return
    dispatch(setCombatPermissions({ faceDetected: faceStatus === 'ok' }))
  }, [dispatch, faceStatus])

  const handleProceed = () => {
    if (!readinessSnapshot?.ready) {
      setReadinessTick((tick) => tick + 1)
      return
    }

    releaseMedia()
    dispatch(initSessionRequest())
  }

  const handleSwitchToPractice = () => {
    releaseMedia()
    dispatch(selectMode('practice'))
    dispatch(proceedFromCombatPermission())
  }

  const handleRetry = () => {
    releaseMedia()
    setRequestNonce((value) => value + 1)
  }

  const readinessReady = !!readinessSnapshot?.ready
  const readinessItems = [
    { key: 'camera', label: t('interviewSetup.combat.items.camera'), ok: readinessSnapshot?.cameraReady ?? false },
    { key: 'microphone', label: t('interviewSetup.combat.items.microphone'), ok: readinessSnapshot?.microphoneReady ?? false },
    { key: 'tab', label: t('interviewSetup.combat.items.tab'), ok: readinessSnapshot?.tabVisible ?? false },
    { key: 'focus', label: t('interviewSetup.combat.items.focus'), ok: readinessSnapshot?.windowFocused ?? false },
    {
      key: 'viewport',
      label: t('interviewSetup.combat.items.viewport'),
      ok: (readinessSnapshot?.viewportRatio ?? 0) >= 0.7,
    },
  ]

  if (status === 'requesting') {
    return (
      <div className="dash-card mx-auto flex max-w-3xl flex-col items-center gap-5 rounded-[22px] p-8 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-cta" />
        <div>
          <h2 className="dash-text text-xl font-bold">{t('interviewSetup.combat.requestingTitle')}</h2>
          <p className="dash-muted mt-2 max-w-lg text-sm leading-relaxed">
            {t('interviewSetup.combat.requestingBody')}
          </p>
        </div>
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div className="dash-card mx-auto max-w-3xl rounded-[22px] p-6 sm:p-8">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-red-500/30 bg-red-500/10 text-red-500">
            <XCircle className="h-8 w-8" />
          </div>
          <div>
            <h2 className="dash-text text-xl font-bold">{t('interviewSetup.combat.deniedTitle')}</h2>
            <p className="dash-muted mt-2 max-w-lg text-sm leading-relaxed">
              {t('interviewSetup.combat.deniedBody')}
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleRetry}
              className="dash-control inline-flex h-11 items-center justify-center gap-2 rounded-[14px] border px-5 text-sm font-bold"
            >
              <RefreshCw className="h-4 w-4" />
              {t('interviewSetup.combat.retry')}
            </button>
            <button
              type="button"
              onClick={handleSwitchToPractice}
              className="dash-primary-button inline-flex h-11 items-center justify-center rounded-[14px] px-5 text-sm font-bold"
            >
              {t('interviewSetup.combat.switchPractice')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <section className="dash-card overflow-hidden rounded-[22px]">
        <div className="dash-border border-b p-5 sm:p-6">
          <h2 className="dash-text text-xl font-bold">{t('interviewSetup.combat.title')}</h2>
          <p className="dash-muted mt-2 text-sm leading-relaxed">
            {t('interviewSetup.combat.description')}
          </p>
        </div>

        <div className="p-5 sm:p-6">
          <div className="relative aspect-video overflow-hidden rounded-[18px] border border-[var(--dash-border)] bg-[var(--dash-surface-muted)]">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            {!previewReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-[var(--dash-muted)]" />
              </div>
            )}

            {previewReady && faceStatus !== 'loading' && (
              <div
                className={[
                  'absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold backdrop-blur',
                  faceStatus === 'ok'
                    ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-500'
                    : faceStatus === 'multi_face'
                      ? 'border-amber-500/30 bg-amber-500/15 text-amber-500'
                      : 'border-red-500/30 bg-red-500/15 text-red-500',
                ].join(' ')}
              >
                {faceStatus === 'ok' && <><UserCheck className="h-3.5 w-3.5" /> {t('interviewSetup.combat.faceOne')}</>}
                {faceStatus === 'no_face' && <><UserX className="h-3.5 w-3.5" /> {t('interviewSetup.combat.faceNone')}</>}
                {faceStatus === 'multi_face' && <><Users className="h-3.5 w-3.5" /> {t('interviewSetup.combat.faceMany', { count: faceCount })}</>}
              </div>
            )}

            {previewReady && faceStatus === 'loading' && (
              <div className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] px-3 py-1.5 text-xs font-bold text-[var(--dash-muted)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t('interviewSetup.combat.faceLoading')}
              </div>
            )}
          </div>

          {faceStatus === 'no_face' && (
            <div className="mt-4 flex items-start gap-2 rounded-[16px] border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-relaxed text-amber-500">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {t('interviewSetup.combat.noFaceWarning')}
            </div>
          )}
          {faceStatus === 'multi_face' && (
            <div className="mt-4 flex items-start gap-2 rounded-[16px] border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-relaxed text-amber-500">
              <Users className="mt-0.5 h-4 w-4 shrink-0" />
              {t('interviewSetup.combat.multiFaceWarning', { count: faceCount })}
            </div>
          )}
        </div>
      </section>

      <aside className="dash-card flex flex-col rounded-[22px] p-5 sm:p-6">
        <div className="mb-4">
          <p className="dash-subtle text-xs font-semibold uppercase tracking-[0.08em]">Readiness checklist</p>
          <h3 className="dash-text mt-1 text-lg font-bold">
            {readinessReady
              ? t('interviewSetup.combat.checklistReadyTitle')
              : t('interviewSetup.combat.checklistNotReadyTitle')}
          </h3>
          <p className="dash-muted mt-2 text-sm leading-relaxed">
            {readinessReady
              ? t('interviewSetup.combat.checklistReadyBody')
              : t('interviewSetup.combat.checklistNotReadyBody')}
          </p>
        </div>

        <div className="space-y-2">
          {readinessItems.map((item) => (
            <ReadinessItem key={item.key} label={item.label} ok={item.ok} />
          ))}
        </div>

        {readinessSnapshot && !readinessReady && (
          <p className="dash-subtle mt-3 text-xs">
            {t('interviewSetup.combat.viewportRatio', {
              ratio: (readinessSnapshot.viewportRatio * 100).toFixed(0),
            })}
          </p>
        )}

        <div className="mt-auto pt-5">
          <div className="grid gap-3">
            <button
              type="button"
              onClick={handleProceed}
              disabled={faceStatus !== 'ok' || !readinessReady}
              className="dash-primary-button inline-flex h-11 items-center justify-center rounded-[14px] px-5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-45"
            >
              {t('interviewSetup.combat.enter')}
            </button>
            <button
              type="button"
              onClick={handleSwitchToPractice}
              className="dash-control inline-flex h-11 items-center justify-center gap-2 rounded-[14px] border px-5 text-sm font-bold"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('interviewSetup.combat.backSetup')}
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
