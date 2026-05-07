import { useEffect, useRef, useState } from 'react'

export default function CameraPreview({ mediaStream }) {
  const videoRef = useRef(null)
  const dragRef = useRef(null)
  const defaultPosition = () => ({ x: 16, y: window.innerHeight - 96 - 16 })
  const positionRef = useRef(defaultPosition())
  const velocityRef = useRef({ x: 0, y: 0 })
  const [position, setPosition] = useState(defaultPosition)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isCollapsed, setIsCollapsed] = useState(false)
  const lastPosRef = useRef({ x: 0, y: 0 })
  const animationRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !mediaStream || isCollapsed) return
    video.srcObject = mediaStream
    video.play().catch(() => {})
    return () => {
      video.srcObject = null
    }
  }, [mediaStream, isCollapsed])

  const updatePosition = (x, y) => {
    const maxX = window.innerWidth - 144
    const maxY = window.innerHeight - 96
    const clampedX = Math.max(0, Math.min(x, maxX))
    const clampedY = Math.max(0, Math.min(y, maxY))
    
    positionRef.current = { x: clampedX, y: clampedY }
    setPosition({ x: clampedX, y: clampedY })
  }

  const dragStartPosRef = useRef({ x: 0, y: 0 })

  const handleMouseDown = (e) => {
    // Only skip drag for close button (X icon)
    if (e.target.closest('button') && !isCollapsed) return
    
    setIsDragging(true)
    const rect = dragRef.current.getBoundingClientRect()
    dragStartPosRef.current = { x: e.clientX, y: e.clientY }
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
    lastPosRef.current = { x: e.clientX, y: e.clientY }
    velocityRef.current = { x: 0, y: 0 }
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    
    const newX = e.clientX - dragOffset.x
    const newY = e.clientY - dragOffset.y
    
    velocityRef.current = {
      x: e.clientX - lastPosRef.current.x,
      y: e.clientY - lastPosRef.current.y,
    }
    lastPosRef.current = { x: e.clientX, y: e.clientY }
    
    updatePosition(newX, newY)
  }

  const applyInertia = () => {
    const decay = 0.95
    const minVelocity = 0.1

    const animate = () => {
      const vel = velocityRef.current
      if (Math.abs(vel.x) < minVelocity && Math.abs(vel.y) < minVelocity) {
        return
      }

      const newX = positionRef.current.x + vel.x
      const newY = positionRef.current.y + vel.y

      updatePosition(newX, newY)

      velocityRef.current = {
        x: vel.x * decay,
        y: vel.y * decay,
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    applyInertia()
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragOffset])

  useEffect(() => {
    const handleResize = () => {
      updatePosition(positionRef.current.x, positionRef.current.y)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!mediaStream) return null

  return (
    <div
      ref={dragRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 40,
      }}
      className={`rounded-xl overflow-hidden border border-slate-700 shadow-lg bg-slate-900 transition-shadow ${
        isDragging ? 'cursor-grabbing shadow-xl' : 'cursor-grab'
      }`}
    >
      {!isCollapsed ? (
        <div className="relative w-36 h-24">
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
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsCollapsed(true)
            }}
            className="absolute top-1 left-1 p-1 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
            title="Collapse"
          >
            <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation()
            const dragDistance = Math.sqrt(
              Math.pow(dragStartPosRef.current.x - e.clientX, 2) + 
              Math.pow(dragStartPosRef.current.y - e.clientY, 2)
            )
            if (dragDistance < 5) {
              setIsCollapsed(false)
            }
          }}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded transition-colors relative"
          title="Drag to move / Click to expand"
        >
          <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 11h-2.5v2.5h-2v-2.5H8.5v-2h2.5V8.5h2v2.5h2.5v2z" />
          </svg>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse absolute" style={{top: '4px', right: '4px'}} />
        </button>
      )}
    </div>
  )
}
