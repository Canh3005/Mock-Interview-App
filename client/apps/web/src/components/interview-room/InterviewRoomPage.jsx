/**
 * InterviewRoomPage — Split-pane interview environment
 * Left pane  : Video call panel + Problem statement
 * Right pane : Code editor panel
 * Dark mode  : Always-on (forced via useEffect)
 */
import { useState, useEffect, useCallback } from 'react'
import {
  LayoutDashboard,
  Clock,
  ChevronLeft,
  Wifi,
  WifiOff,
} from 'lucide-react'
import VideoPanel from './VideoPanel'
import CodeEditorPanel from './CodeEditorPanel'
import FloatingToolbar from './FloatingToolbar'

// Session timer HH:MM:SS
function useSessionTimer() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export default function InterviewRoomPage({ navigate = () => {} }) {
  // Force dark mode for this page
  useEffect(() => {
    document.documentElement.classList.add('dark')
    return () => {
      // restore when leaving (optional — leave dark if user prefers)
    }
  }, [])

  const timer = useSessionTimer()
  const [connected, setConnected] = useState(true)

  // Split-pane ratio (left width in percent, 30–70%)
  const [splitRatio, setSplitRatio] = useState(40)
  const [dragging, setDragging] = useState(false)

  const startDrag = useCallback(() => setDragging(true), [])

  const onMouseMove = useCallback(
    (e) => {
      if (!dragging) return
      const container = document.getElementById('ir-split-container')
      if (!container) return
      const rect = container.getBoundingClientRect()
      const ratio = ((e.clientX - rect.left) / rect.width) * 100
      setSplitRatio(Math.min(70, Math.max(30, ratio)))
    },
    [dragging],
  )

  const stopDrag = useCallback(() => setDragging(false), [])

  // Code-run state (lifted for toolbar)
  const [runTrigger, setRunTrigger] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  return (
    <div
      className="interview-room-root min-h-screen w-screen overflow-hidden flex flex-col bg-[#0A0F1E] text-slate-100 select-none"
      onMouseMove={onMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
    >
      {/* ── Top Bar ── */}
      <header className="h-12 flex-shrink-0 flex items-center justify-between px-4 border-b border-slate-700/50 bg-[#0D1424]/90 backdrop-blur-sm z-30">
        {/* Left: back + breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('dashboard')}
            aria-label="Quay lại Dashboard"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="flex items-center justify-center w-7 h-7 rounded-md bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E]">
            <LayoutDashboard size={14} />
          </span>
          <div className="flex items-center gap-1.5 font-['Fira_Code',monospace] text-xs">
            <span className="text-slate-500">Mock Interview</span>
            <span className="text-slate-600">/</span>
            <span className="text-[#22C55E] font-semibold">Interview Room</span>
          </div>
        </div>

        {/* Center: session info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-['Fira_Code',monospace] text-xs text-slate-300 bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-700/50">
            <Clock size={12} className="text-[#22C55E]" />
            <span className="tabular-nums">{timer}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-['Fira_Sans',sans-serif]">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" aria-hidden="true" />
            <span className="text-slate-400 font-medium">JavaScript — Algorithm</span>
          </div>
        </div>

        {/* Right: connection + end session */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setConnected(c => !c)}
            aria-label={connected ? 'Kết nối ổn định' : 'Mất kết nối'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E] ${
              connected
                ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E] hover:bg-[#22C55E]/20'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
            }`}
          >
            {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span className="hidden sm:inline font-['Fira_Sans',sans-serif]">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('Kết thúc phiên phỏng vấn và quay về Dashboard?')) {
                navigate('dashboard')
              }
            }}
            aria-label="Kết thúc phiên phỏng vấn"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 hover:text-rose-300 text-xs font-semibold font-['Fira_Sans',sans-serif] transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            Kết thúc
          </button>
        </div>
      </header>

      {/* ── Split Pane Body ── */}
      <div
        id="ir-split-container"
        className="flex-1 flex overflow-hidden"
        style={{ cursor: dragging ? 'col-resize' : 'default' }}
      >
        {/* Left pane: Video + Problem */}
        <div
          className="flex flex-col overflow-hidden flex-shrink-0"
          style={{ width: `${splitRatio}%` }}
        >
          <VideoPanel />
        </div>

        {/* Drag divider */}
        <div
          role="separator"
          aria-label="Kéo để thay đổi kích thước"
          aria-orientation="vertical"
          onMouseDown={startDrag}
          className="w-1 flex-shrink-0 bg-slate-700/50 hover:bg-[#22C55E]/60 active:bg-[#22C55E] cursor-col-resize transition-colors duration-150 focus-visible:outline-none focus-visible:bg-[#22C55E]"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setSplitRatio(r => Math.max(30, r - 2))
            if (e.key === 'ArrowRight') setSplitRatio(r => Math.min(70, r + 2))
          }}
        />

        {/* Right pane: Code Editor */}
        <div
          className="flex-1 flex flex-col overflow-hidden"
        >
          <CodeEditorPanel
            runTrigger={runTrigger}
            isRunning={isRunning}
            setIsRunning={setIsRunning}
          />
        </div>
      </div>

      {/* ── Floating Toolbar ── */}
      <FloatingToolbar
        onRunCode={() => {
          setRunTrigger(t => t + 1)
        }}
        isRunning={isRunning}
      />
    </div>
  )
}
