import { useEffect, useRef } from 'react'

export default function EmbeddedCameraFeed({ mediaStream }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !mediaStream) return
    video.srcObject = mediaStream
    video.play().catch(() => {})
    return () => {
      video.srcObject = null
    }
  }, [mediaStream])

  if (!mediaStream) return null

  return (
    <div className="relative w-full h-40 flex-shrink-0 overflow-hidden bg-slate-950">
      <video
        ref={videoRef}
        muted
        playsInline
        className="w-full h-full object-cover -scale-x-100"
      />
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[9px] text-red-400 font-medium uppercase tracking-wider">REC</span>
      </div>
    </div>
  )
}
