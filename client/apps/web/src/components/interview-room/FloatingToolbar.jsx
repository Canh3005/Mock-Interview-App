/**
 * FloatingToolbar — Fixed bottom-center media controls
 * Mic, Camera, Screen Share, Chat, Run Code, and End Session.
 * Fully accessible: aria-pressed, aria-label, focus-visible ring.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MessageSquare,
  Play,
  PhoneOff,
} from 'lucide-react'

function ToolBtn({ icon, label, active = null, danger = false, accent = false, onClick, disabled = false }) {
  // active === null means stateless (always on, no toggle indicator)
  const isToggleable = active !== null
  const isOff = isToggleable && !active
  const isOn  = isToggleable && active

  let base = 'flex flex-col items-center gap-1.5 group cursor-pointer focus-visible:outline-none'
  if (disabled) base += ' opacity-40 cursor-not-allowed'

  return (
    <div className={base}>
      <button
        onClick={disabled ? undefined : onClick}
        aria-label={label}
        aria-pressed={isToggleable ? active : undefined}
        disabled={disabled}
        className={[
          'flex items-center justify-center w-11 h-11 rounded-2xl border-2 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1E]',
          danger
            ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 hover:bg-rose-500/30 hover:border-rose-500/70 focus-visible:ring-rose-500 active:scale-95'
            : accent
              ? 'bg-[#22C55E] border-[#22C55E] text-white hover:bg-[#16A34A] hover:border-[#16A34A] focus-visible:ring-[#22C55E] active:scale-95 shadow-lg shadow-[#22C55E]/25'
              : isOff
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25 focus-visible:ring-rose-500 active:scale-95'
                : 'bg-slate-800/80 border-slate-600/60 text-slate-300 hover:bg-slate-700/80 hover:border-slate-500 hover:text-white focus-visible:ring-[#22C55E] active:scale-95',
          disabled ? 'pointer-events-none' : '',
        ].join(' ')}
      >
        {icon}
      </button>
      <span className={`font-['Fira_Sans',sans-serif] text-[10px] font-medium select-none transition-colors duration-200 ${
        isOff ? 'text-rose-400' : accent ? 'text-[#22C55E]' : 'text-slate-500 group-hover:text-slate-300'
      }`}>
        {label}
      </span>
    </div>
  )
}

export default function FloatingToolbar({ onRunCode, isRunning }) {
  const { t } = useTranslation()
  const [micOn,    setMic]    = useState(true)
  const [camOn,    setCam]    = useState(true)
  const [screenOn, setScreen] = useState(false)
  const [chatOpen, setChat]   = useState(false)

  return (
    <div
      role="toolbar"
      aria-label={t('interviewRoom.toolbar.label')}
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-end gap-2 sm:gap-3 px-4 sm:px-5 py-3 rounded-2xl bg-[#0D1628]/90 backdrop-blur-xl border border-slate-700/60 shadow-2xl shadow-black/50"
    >
      {/* Mic */}
      <ToolBtn
        icon={micOn ? <Mic size={18} /> : <MicOff size={18} />}
        label={micOn ? t('interviewRoom.toolbar.muteMic') : t('interviewRoom.toolbar.unmuteMic')}
        active={micOn}
        onClick={() => setMic(m => !m)}
      />

      {/* Camera */}
      <ToolBtn
        icon={camOn ? <Video size={18} /> : <VideoOff size={18} />}
        label={camOn ? t('interviewRoom.toolbar.disableCamera') : t('interviewRoom.toolbar.enableCamera')}
        active={camOn}
        onClick={() => setCam(c => !c)}
      />

      {/* Screen share */}
      <ToolBtn
        icon={<Monitor size={18} />}
        label={screenOn ? t('interviewRoom.toolbar.stopSharing') : t('interviewRoom.toolbar.shareScreen')}
        active={!screenOn ? null : null}
        onClick={() => setScreen(s => !s)}
      />

      {/* Divider */}
      <div className="w-px h-10 bg-slate-700/60 mx-1 self-center" aria-hidden="true" />

      {/* Run code — accent CTA */}
      <ToolBtn
        icon={
          isRunning
            ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden="true" />
            : <Play size={18} fill="currentColor" />
        }
        label={isRunning ? t('interviewRoom.toolbar.running') : t('interviewRoom.toolbar.runCode')}
        active={null}
        accent={true}
        disabled={isRunning}
        onClick={onRunCode}
      />

      {/* Divider */}
      <div className="w-px h-10 bg-slate-700/60 mx-1 self-center" aria-hidden="true" />

      {/* Chat */}
      <ToolBtn
        icon={<MessageSquare size={18} />}
        label={chatOpen ? t('interviewRoom.toolbar.closeChat') : t('interviewRoom.toolbar.chat')}
        active={null}
        onClick={() => setChat(c => !c)}
      />

      {/* End call — danger */}
      <ToolBtn
        icon={<PhoneOff size={18} />}
        label={t('interviewRoom.toolbar.end')}
        active={null}
        danger={true}
        onClick={() => {
          if (window.confirm(t('interviewRoom.confirmEnd'))) {
            /* navigate away */
          }
        }}
      />
    </div>
  )
}
