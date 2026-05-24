import { Clock, Video, Plus } from 'lucide-react'

const SESSIONS = [
  { id: 1, month: 'Th 10', day: '24', topic: 'Mock Interview: Frontend', time: '14:00 - 15:30', type: 'Video Call', status: 'Sắp diễn ra', tone: 'dash-chip border' },
  { id: 2, month: 'Th 10', day: '26', topic: 'System Design Practice', time: '09:00 - 10:00', type: 'Mock Test', status: 'Đã xác nhận', tone: 'dash-badge border' },
  { id: 3, month: 'Th 11', day: '02', topic: 'Behavioral Q&A', time: '15:00 - 16:00', type: 'Video Call', status: 'Lên lịch', tone: 'dash-badge border' },
]

export default function UpcomingSessions({ colSpan = '', compact = false }) {
  const gridClass = compact
    ? 'grid grid-cols-1 gap-3'
    : 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'

  return (
    <section className={[colSpan, 'dash-card rounded-[20px] p-5 transition-colors duration-200 sm:p-6'].join(' ')}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="dash-card-title">Lịch phỏng vấn sắp tới</h2>
          <p className="dash-subtle mt-1 text-xs font-medium">Các phiên đã lên lịch</p>
        </div>
        <button className="dash-chip inline-flex h-10 items-center justify-center gap-2 rounded-[13px] border px-3 text-sm font-semibold transition-colors hover:opacity-85">
          <Plus size={16} />
          Đặt lịch mới
        </button>
      </div>

      <div className={gridClass}>
        {SESSIONS.map((session) => (
          <article
            key={session.id}
            className="dash-muted-panel group flex gap-3 rounded-[16px] border p-3.5 transition-colors hover:bg-[var(--dash-surface-raised)]"
          >
            <div className="flex min-w-14 flex-col items-center justify-center rounded-[13px] border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] p-2.5 shadow-[var(--dash-shadow-control)]">
              <span className="text-[10px] font-bold uppercase text-[var(--dash-danger)]">{session.month}</span>
              <span className="dash-text text-2xl font-bold leading-none">{session.day}</span>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="dash-text truncate text-sm font-semibold transition-colors group-hover:text-[var(--dash-accent-text)]">
                {session.topic}
              </h3>
              <div className="dash-muted mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="inline-flex items-center gap-1">
                  <Clock size={13} />
                  {session.time}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Video size={13} />
                  {session.type}
                </span>
              </div>
              <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${session.tone}`}>
                {session.status}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
