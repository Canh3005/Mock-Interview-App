/**
 * InterviewHistory — Recent interview sessions table
 * Shows: date, type, score, duration, status with row hover highlight
 */
import { CheckCircle, Clock, XCircle, ChevronRight } from 'lucide-react'

const MOCK_DATA = [
  { id: 1, date: '22 Feb 2026', type: 'System Design',   score: 82, duration: '45 phút', status: 'passed' },
  { id: 2, date: '20 Feb 2026', type: 'LeetCode Medium',  score: 76, duration: '30 phút', status: 'passed' },
  { id: 3, date: '18 Feb 2026', type: 'Behavioral',       score: 68, duration: '25 phút', status: 'review' },
  { id: 4, date: '15 Feb 2026', type: 'LeetCode Hard',    score: 55, duration: '40 phút', status: 'failed' },
  { id: 5, date: '12 Feb 2026', type: 'Giao tiếp (EN)',   score: 88, duration: '20 phút', status: 'passed' },
]

const STATUS_CONFIG = {
  passed: { label: 'Đạt',    Icon: CheckCircle, color: 'text-cta',      bg: 'bg-cta/10 border-cta/30'      },
  review: { label: 'Xem lại', Icon: Clock,       color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/30' },
  failed: { label: 'Chưa đạt', Icon: XCircle,   color: 'text-rose-400', bg: 'bg-rose-400/10 border-rose-400/30' },
}

export default function InterviewHistory({ colSpan = '' }) {
  return (
    <div className={[colSpan, 'bg-primary border border-slate-700/60 rounded-[12px] p-6 shadow-md flex flex-col'].join(' ')}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-heading text-base font-semibold text-white tracking-tight">
            Lịch sử phỏng vấn
          </h2>
          <p className="font-body text-xs text-slate-400 mt-0.5">5 phiên gần nhất</p>
        </div>
        <button className="flex items-center gap-1 font-body text-xs text-cta hover:text-cta/80 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta rounded">
          Xem tất cả
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse">
          <thead>
            <tr className="border-b border-slate-700/60">
              {['Ngày', 'Loại phỏng vấn', 'Điểm', 'Thời lượng', 'Trạng thái'].map((h) => (
                <th
                  key={h}
                  className="font-body text-xs font-medium text-slate-500 uppercase tracking-wider text-left pb-3 pr-4 last:pr-0"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_DATA.map((row) => {
              const cfg = STATUS_CONFIG[row.status]
              return (
                <tr
                  key={row.id}
                  className="group border-b border-slate-700/40 last:border-0 cursor-pointer hover:bg-slate-700/20 transition-colors duration-200"
                >
                  <td className="font-body text-sm text-slate-400 py-3.5 pr-4 whitespace-nowrap">{row.date}</td>
                  <td className="font-body text-sm text-white py-3.5 pr-4 font-medium">{row.type}</td>
                  <td className="font-heading text-sm font-bold py-3.5 pr-4">
                    <span className={row.score >= 70 ? 'text-cta' : row.score >= 60 ? 'text-amber-400' : 'text-rose-400'}>
                      {row.score}
                    </span>
                    <span className="text-slate-500 font-normal">/100</span>
                  </td>
                  <td className="font-body text-sm text-slate-400 py-3.5 pr-4 whitespace-nowrap">{row.duration}</td>
                  <td className="py-3.5">
                    <span className={`inline-flex items-center gap-1 font-body text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.color} ${cfg.bg}`}>
                      <cfg.Icon size={11} />
                      {cfg.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
