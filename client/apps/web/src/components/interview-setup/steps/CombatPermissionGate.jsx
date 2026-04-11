import { useEffect, useRef, useState, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { Loader2, CheckCircle2, XCircle, AlertTriangle, UserCheck, Users, UserX } from 'lucide-react'
import {
  setCombatPermissions,
  initSessionRequest,
  proceedFromCombatPermission,
  selectMode,
} from '../../../store/slices/interviewSetupSlice'
import { faceDetector } from '../../../services/FaceDetector'
import {
  getCombatReadinessSnapshot,
} from '../../../services/proctoring/combatProctoring'

export default function CombatPermissionGate() {
  const dispatch = useDispatch()
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const [status, setStatus] = useState('requesting') // requesting | granted | denied
  const [faceStatus, setFaceStatus] = useState('loading') // loading | ok | no_face | multi_face
  const [faceCount, setFaceCount] = useState(0)
  const [previewReady, setPreviewReady] = useState(false)
  const [readinessSnapshot, setReadinessSnapshot] = useState(null)
  const [readinessTick, setReadinessTick] = useState(0)

  // ─── Request permissions ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function requestPermissions() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        dispatch(setCombatPermissions({ webcam: 'granted', microphone: 'granted' }))
        setStatus('granted')
      } catch {
        if (!cancelled) {
          setStatus('denied')
          dispatch(setCombatPermissions({ webcam: 'denied', microphone: 'denied' }))
        }
      }
    }

    requestPermissions()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [dispatch])

  // ─── Assign stream to video ───────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'granted' || !streamRef.current) return
    const video = videoRef.current
    if (!video) return
    video.srcObject = streamRef.current
    if (video.readyState >= 1) {
      setPreviewReady(true)
    } else {
      video.addEventListener('loadedmetadata', () => setPreviewReady(true), { once: true })
    }
  }, [status])

  // ─── Init face detector & start detection ─────────────────────────────────
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
        // Run every 800ms for responsive feedback in permission gate
        faceDetector.start(videoRef.current, onFaceResult, 800)
      } else {
        // Fallback: assume face present if video track is active
        const track = streamRef.current?.getVideoTracks()[0]
        const settings = track?.getSettings()
        setFaceStatus(settings?.width > 0 ? 'ok' : 'no_face')
      }
    }

    startDetection()
    return () => {
      cancelled = true
      faceDetector.stop()
    }
  }, [previewReady, onFaceResult])

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
  }, [status, faceStatus, readinessTick, dispatch])

  // ─── Sync face status to Redux ────────────────────────────────────────────
  useEffect(() => {
    if (faceStatus === 'loading') return
    dispatch(setCombatPermissions({ faceDetected: faceStatus === 'ok' }))
  }, [faceStatus, dispatch])

  const handleProceed = () => {
    if (!readinessSnapshot?.ready) {
      setReadinessTick((tick) => tick + 1)
      return
    }

    // Stop detector and release stream — CombatInterviewRoom will open a new one
    faceDetector.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    dispatch(initSessionRequest())
  }

  const handleSwitchToPractice = () => {
    faceDetector.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    dispatch(selectMode('practice'))
    dispatch(proceedFromCombatPermission())
  }

  const handleRetry = () => {
    setStatus('requesting')
    setFaceStatus('loading')
    setFaceCount(0)
    setPreviewReady(false)
    faceDetector.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }

  const canProceed = faceStatus === 'ok'
  const readinessItems = [
    {
      key: 'camera',
      label: 'Camera đang hoạt động',
      ok: readinessSnapshot?.cameraReady ?? false,
    },
    {
      key: 'microphone',
      label: 'Microphone đang hoạt động',
      ok: readinessSnapshot?.microphoneReady ?? false,
    },
    {
      key: 'tab',
      label: 'Tab đang hiển thị',
      ok: readinessSnapshot?.tabVisible ?? false,
    },
    {
      key: 'focus',
      label: 'Cửa sổ đang focus',
      ok: readinessSnapshot?.windowFocused ?? false,
    },
    {
      key: 'viewport',
      label: 'Kích thước cửa sổ đủ lớn',
      ok: (readinessSnapshot?.viewportRatio ?? 0) >= 0.7,
    },
  ]
  const readinessReady = !!readinessSnapshot?.ready

  // ─── Requesting ───────────────────────────────────────────────────────────
  if (status === 'requesting') {
    return (
      <div className="flex flex-col items-center gap-5 py-4">
        <Loader2 className="w-10 h-10 text-cta animate-spin" />
        <div className="text-center">
          <p className="text-white font-semibold mb-1">Đang yêu cầu quyền thiết bị</p>
          <p className="text-slate-400 text-sm">Vui lòng cho phép truy cập Webcam và Microphone trong popup của trình duyệt.</p>
        </div>
      </div>
    )
  }

  // ─── Denied ───────────────────────────────────────────────────────────────
  if (status === 'denied') {
    return (
      <div className="flex flex-col items-center gap-5 py-4 text-center">
        <XCircle className="w-12 h-12 text-red-500" />
        <div>
          <p className="text-white font-semibold text-lg mb-1">Không thể vào Combat Mode</p>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Trình duyệt đã từ chối quyền Webcam/Microphone. Hãy cấp quyền trong cài đặt trình duyệt rồi thử lại, hoặc chuyển sang Practice Mode.
          </p>
        </div>
        <div className="flex gap-3 w-full">
          <button
            onClick={handleRetry}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-700/50 transition-colors text-sm font-medium"
          >
            Thử lại
          </button>
          <button
            onClick={handleSwitchToPractice}
            className="flex-1 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-colors"
          >
            Chuyển sang Practice
          </button>
        </div>
      </div>
    )
  }

  // ─── Granted (with preview + face detection) ──────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-xl font-heading font-bold text-white mb-1">Kiểm tra thiết bị</h2>
        <p className="text-slate-400 text-sm">Đảm bảo webcam và microphone hoạt động trước khi vào phòng thi.</p>
      </div>

      {/* Camera preview */}
      <div className="relative rounded-xl overflow-hidden bg-slate-800 aspect-video">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        {!previewReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
          </div>
        )}

        {/* Face detection badge */}
        {previewReady && faceStatus !== 'loading' && (
          <div className={`absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
            ${faceStatus === 'ok'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : faceStatus === 'multi_face'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            {faceStatus === 'ok' && <><UserCheck className="w-3.5 h-3.5" /> 1 khuôn mặt</>}
            {faceStatus === 'no_face' && <><UserX className="w-3.5 h-3.5" /> Không nhận diện được</>}
            {faceStatus === 'multi_face' && <><Users className="w-3.5 h-3.5" /> {faceCount} khuôn mặt</>}
          </div>
        )}

        {/* Loading face detector */}
        {previewReady && faceStatus === 'loading' && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700/80 text-slate-300 border border-slate-600">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tải nhận diện...
          </div>
        )}
      </div>

      {faceStatus === 'ok' && (
        <div className={`rounded-xl border p-4 ${readinessReady ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-800/60 border-slate-700'}`}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-semibold text-white">
                {readinessReady ? 'Bạn đã sẵn sàng' : 'Bạn chưa sẵn sàng'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {readinessReady
                  ? 'Bạn có thể bấm "Vào phỏng vấn" để bắt đầu Combat Mode.'
                  : 'Giữ tab đang mở, focus cửa sổ và đảm bảo kích thước màn hình đủ lớn. Hệ thống sẽ tự kiểm tra liên tục.'}
              </p>
            </div>
            {!readinessReady && (
              <button
                onClick={() => setReadinessTick((tick) => tick + 1)}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-700 text-slate-200 text-xs font-medium hover:bg-slate-600 transition-colors"
              >
                Kiểm tra lại
              </button>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {readinessItems.map((item) => (
              <div
                key={item.key}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs border ${item.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 bg-slate-900/40 text-slate-400'}`}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${item.ok ? 'text-emerald-400' : 'text-slate-500'}`} />
                {item.label}
              </div>
            ))}
          </div>
          {!readinessReady && readinessSnapshot && (
            <p className="mt-3 text-[11px] text-slate-500">
              Tỷ lệ viewport hiện tại: {(readinessSnapshot.viewportRatio * 100).toFixed(0)}%
            </p>
          )}
        </div>
      )}

      {/* Face warnings */}
      {faceStatus === 'no_face' && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs leading-relaxed">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          Không nhận diện được khuôn mặt. Hãy điều chỉnh camera hướng thẳng về phía bạn và đảm bảo đủ ánh sáng.
        </div>
      )}
      {faceStatus === 'multi_face' && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs leading-relaxed">
          <Users className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          Phát hiện {faceCount} khuôn mặt. Combat Mode yêu cầu chỉ có 1 người trong khung hình. Hãy đảm bảo không có ai khác xuất hiện.
        </div>
      )}

      <button
        onClick={handleProceed}
        disabled={!canProceed || !readinessReady}
        className="w-full px-4 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
      >
        {readinessReady ? 'Vào phỏng vấn' : 'Chưa sẵn sàng'}
      </button>
    </div>
  )
}
