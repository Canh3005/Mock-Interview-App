import { useEffect, useState, useRef } from 'react'
import { Clock } from 'lucide-react'

const DIFFICULTY_LIMIT = { EASY: 20, MEDIUM: 35, HARD: 50 }

function formatTime(seconds) {
  const m = Math.floor(Math.abs(seconds) / 60).toString().padStart(2, '0')
  const s = (Math.abs(seconds) % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function SessionTimer({ mode, difficulty, onExpire }) {
  const limitSec = (DIFFICULTY_LIMIT[difficulty] ?? 35) * 60
  const [elapsed, setElapsed] = useState(0)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (mode === 'combat' && elapsed >= limitSec) {
      onExpireRef.current?.()
    }
  }, [elapsed, limitSec, mode])

  const remaining = limitSec - elapsed
  const isCritical = mode === 'combat' && remaining <= 60
  const isWarning = mode === 'combat' && remaining <= 300 && remaining > 60

  const displayTime = mode === 'practice' ? formatTime(elapsed) : formatTime(Math.max(remaining, 0))

  return (
    <div className={`flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums ${
      isCritical ? 'text-red-400 animate-pulse' : isWarning ? 'text-yellow-400' : 'text-slate-300'
    }`}>
      <Clock className="w-4 h-4" />
      {displayTime}
      {mode === 'combat' && isCritical && (
        <span className="text-xs font-sans font-normal text-red-400">còn lại</span>
      )}
    </div>
  )
}
