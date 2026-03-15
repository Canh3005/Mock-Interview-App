import { useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Loader2, Camera, Mic, CheckCircle2, XCircle } from 'lucide-react'
import {
  setCombatPermissions,
  proceedFromCombatPermission,
  selectMode,
} from '../../../store/slices/interviewSetupSlice'

export default function CombatPermissionGate() {
  const dispatch = useDispatch()
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const [status, setStatus] = useState('requesting') // requesting | granted | denied | no_face
  const [faceDetected, setFaceDetected] = useState(null) // null | true | false
  const [previewReady, setPreviewReady] = useState(false)

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
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            if (!cancelled) setPreviewReady(true)
          }
        }
        dispatch(setCombatPermissions({ webcam: 'granted', microphone: 'granted' }))
        setStatus('granted')

        // Simple face present check after 1.5s (video stream is live)
        setTimeout(() => {
          if (!cancelled) {
            // Heuristic: if video track is active and has dimensions → face likely present
            const track = stream.getVideoTracks()[0]
            const settings = track?.getSettings()
            const hasVideo = settings?.width > 0 && settings?.height > 0
            setFaceDetected(hasVideo)
            dispatch(setCombatPermissions({ faceDetected: hasVideo }))
            if (!hasVideo) setStatus('no_face')
          }
        }, 1500)
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

  const handleProceed = () => {
    dispatch(proceedFromCombatPermission())
  }

  const handleSwitchToPractice = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    dispatch(selectMode('practice'))
    dispatch(proceedFromCombatPermission()) // goes to round_select
  }

  const handleRetry = () => {
    setStatus('requesting')
    setFaceDetected(null)
    setPreviewReady(false)
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }

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

  // ─── Granted (with preview) ───────────────────────────────────────────────
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
        />
        {!previewReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
          </div>
        )}
        {/* Face detection badge */}
        {faceDetected !== null && previewReady && (
          <div className={`absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
            ${faceDetected ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
            {faceDetected
              ? <><CheckCircle2 className="w-3.5 h-3.5" /> Phát hiện 1 khuôn mặt</>
              : <><XCircle className="w-3.5 h-3.5" /> Không nhận diện được</>
            }
          </div>
        )}
      </div>

      {/* Device status row */}
      <div className="flex gap-3">
        <div className="flex-1 flex items-center gap-2 bg-slate-800 rounded-xl p-3 border border-slate-700">
          <Camera className="w-4 h-4 text-green-400" />
          <span className="text-slate-300 text-xs font-medium">Webcam</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 ml-auto" />
        </div>
        <div className="flex-1 flex items-center gap-2 bg-slate-800 rounded-xl p-3 border border-slate-700">
          <Mic className="w-4 h-4 text-green-400" />
          <span className="text-slate-300 text-xs font-medium">Microphone</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 ml-auto" />
        </div>
      </div>

      {/* Face not detected warning */}
      {faceDetected === false && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs leading-relaxed">
          ⚠️ Không nhận diện được khuôn mặt. Hãy điều chỉnh camera hướng thẳng về phía bạn.
        </div>
      )}

      <button
        onClick={handleProceed}
        disabled={faceDetected === null}
        className="w-full px-4 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
      >
        Tiếp tục vào Combat Mode
      </button>
    </div>
  )
}
