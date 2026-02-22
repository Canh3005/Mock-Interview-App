/**
 * UpcomingSessions — Upcoming scheduled interview practice sessions
 */
import { Calendar, Clock, Video, ChevronRight, Plus } from 'lucide-react'

const SESSIONS = [
  {
    id: 1,
    date: 'Thứ 3, 25 Feb',
    time: '19:00',
    topic: 'System Design: Design Twitter',
    type: 'Video Call',
    level: 'Senior',
    levelColor: 'text-rose-400 bg-rose-400/10 border-rose-400/30',
  },
  {
    id: 2,
    date: 'Thứ 5, 27 Feb',
    time: '20:30',
    topic: 'LeetCode: Hard DP Problems',
    type: 'Mock Test',
    level: 'Hard',
    levelColor: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  },
  {
    id: 3,
    date: 'Thứ 7, 01 Mar',
    time: '10:00',
    topic: 'Behavioral Interview Simulation',
    type: 'Video Call',
    level: 'Medium',
    levelColor: 'text-sky-400 bg-sky-400/10 border-sky-400/30',
  },
]

export default function UpcomingSessions({ colSpan = '' }) {
  return (
    <div className={[colSpan, 'bg-primary border border-slate-700/60 rounded-[12px] p-6 shadow-md'].join(' ')}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-heading text-base font-semibold text-white tracking-tight">Phiên sắp tới</h2>
          <p className="font-body text-xs text-slate-400 mt-0.5">3 buổi đã đặt lịch</p>
        </div>
        <button
          className="flex items-center gap-1.5 font-body text-xs font-medium text-cta bg-cta/10 border border-cta/30 hover:bg-cta/20 transition-colors duration-200 cursor-pointer px-3 py-1.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta"
          aria-label="Đặt lịch phiên mới"
        >
          <Plus size={12} />
          Đặt lịch
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex flex-col gap-3">
        {SESSIONS.map((session) => (
          <div
            key={session.id}
            className="group flex items-center gap-4 bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 cursor-pointer hover:border-slate-600 hover:bg-slate-800/80 transition-all duration-200"
          >
            {/* Date block */}
            <div className="shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-cta/10 border border-cta/30">
              <span className="font-heading text-cta text-xs font-bold leading-none">
                {session.date.split(' ')[2]}
              </span>
              <span className="font-body text-cta/70 text-[9px] mt-0.5 uppercase tracking-wide">
                {session.date.split(' ')[3]}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-body text-sm font-medium text-white truncate">{session.topic}</p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="flex items-center gap-1 font-body text-xs text-slate-400">
                  <Clock size={10} />
                  {session.time}
                </span>
                <span className="flex items-center gap-1 font-body text-xs text-slate-400">
                  <Video size={10} />
                  {session.type}
                </span>
                <span
                  className={`font-body text-[10px] font-medium px-2 py-0.5 rounded border ${session.levelColor}`}
                >
                  {session.level}
                </span>
              </div>
            </div>

            {/* Arrow */}
            <ChevronRight
              size={16}
              className="shrink-0 text-slate-600 group-hover:text-cta transition-colors duration-200"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
