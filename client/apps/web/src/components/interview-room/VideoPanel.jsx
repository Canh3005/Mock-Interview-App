/**
 * VideoPanel — Left pane
 *   Top section  : Video tiles (interviewer + candidate)
 *   Bottom section: Problem statement
 */
import { useState } from 'react'
import { User, BookOpen, ChevronDown, ChevronUp, Tag } from 'lucide-react'
import ProblemStatement from './ProblemStatement'

function VideoTile({ label, isSelf = false, speaking = false }) {
  return (
    <div
      className={`relative flex-1 min-h-0 rounded-xl overflow-hidden border transition-all duration-200 ${
        speaking
          ? 'border-[#22C55E]/70 shadow-[0_0_0_2px_rgba(34,197,94,0.25)]'
          : 'border-slate-700/50'
      } bg-[#0D1424]`}
    >
      {/* Camera placeholder — dark gradient + avatar */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800/80 to-[#0D1424] flex items-center justify-center">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center border-2 ${
            isSelf ? 'bg-[#22C55E]/10 border-[#22C55E]/40 text-[#22C55E]' : 'bg-slate-700/50 border-slate-600 text-slate-400'
          }`}
        >
          <User size={26} />
        </div>
      </div>

      {/* Speaking indicator bar */}
      {speaking && (
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-[#22C55E]" aria-label="Đang phát biểu" />
      )}

      {/* Participant label */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-[#0A0F1E]/80 backdrop-blur-sm px-2 py-1 rounded-md">
        <span
          className={`w-1.5 h-1.5 rounded-full ${speaking ? 'bg-[#22C55E] animate-pulse' : 'bg-slate-500'}`}
          aria-hidden="true"
        />
        <span className="font-['Fira_Sans',sans-serif] text-[11px] font-medium text-slate-300">
          {label}
        </span>
      </div>
    </div>
  )
}

export default function VideoPanel() {
  const [problemOpen, setProblemOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('problem') // 'problem' | 'notes'

  return (
    <div className="h-full flex flex-col gap-0 bg-[#0A0F1E]">
      {/* ── Video section ── */}
      <div className="flex flex-col gap-2 p-3 flex-shrink-0" style={{ height: problemOpen ? '260px' : '200px' }}>
        {/* Main interviewer tile */}
        <VideoTile label="Interviewer · Nguyễn Văn A" speaking={false} />

        {/* Self (candidate) — smaller tile */}
        <div className="h-20 flex-shrink-0">
          <div className="relative h-full rounded-xl overflow-hidden border border-slate-700/50 bg-[#0D1424]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#22C55E]/5 to-[#0D1424] flex items-center justify-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#22C55E]/10 border border-[#22C55E]/40 text-[#22C55E]">
                <User size={16} />
              </div>
            </div>
            {/* speaking */}
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-[#22C55E]" />
            <div className="absolute bottom-1.5 left-2 flex items-center gap-1 bg-[#0A0F1E]/80 px-1.5 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" aria-hidden="true" />
              <span className="font-['Fira_Sans',sans-serif] text-[10px] text-slate-300 font-medium">Bạn (You)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Problem Statement section ── */}
      <div className="flex-1 flex flex-col min-h-0 border-t border-slate-700/40">
        {/* Collapsible header */}
        <button
          onClick={() => setProblemOpen(o => !o)}
          aria-expanded={problemOpen}
          aria-controls="problem-panel"
          className="flex-shrink-0 w-full flex items-center justify-between px-4 py-2.5 bg-[#0D1424] hover:bg-slate-800/60 border-b border-slate-700/40 cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#22C55E]"
        >
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-[#22C55E]" />
            <span className="font-['Fira_Code',monospace] text-xs font-semibold text-slate-200">
              Đề bài
            </span>
            <span className="flex items-center gap-1 bg-[#22C55E]/10 border border-[#22C55E]/25 text-[#22C55E] text-[10px] font-['Fira_Sans',sans-serif] font-medium px-1.5 py-0.5 rounded-full">
              <Tag size={9} />
              Medium
            </span>
          </div>
          <span className="text-slate-500">
            {problemOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </button>

        {/* Tabs */}
        {problemOpen && (
          <div className="flex-shrink-0 flex border-b border-slate-700/40 bg-[#0D1424]">
            {['problem', 'notes'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-['Fira_Sans',sans-serif] text-xs font-medium border-b-2 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#22C55E] ${
                  activeTab === tab
                    ? 'border-[#22C55E] text-[#22C55E]'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab === 'problem' ? 'Đề bài' : 'Ghi chú'}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {problemOpen && (
          <div id="problem-panel" className="flex-1 overflow-y-auto">
            {activeTab === 'problem' ? (
              <ProblemStatement />
            ) : (
              <NotesArea />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function NotesArea() {
  return (
    <div className="p-4">
      <textarea
        aria-label="Ghi chú trong phiên phỏng vấn"
        placeholder="Ghi chú của bạn trong quá trình phỏng vấn…"
        className="w-full h-48 bg-transparent resize-none font-['Fira_Sans',sans-serif] text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus-visible:outline-none leading-relaxed"
      />
    </div>
  )
}
