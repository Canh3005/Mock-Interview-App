import { Clock, Video, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const SESSIONS = [
  { id: 1, monthKey: 'oct', day: '24', topicKey: 'frontend', time: '14:00 - 15:30', typeKey: 'videoCall', statusKey: 'upcoming', tone: 'dash-chip border' },
  { id: 2, monthKey: 'oct', day: '26', topicKey: 'systemDesign', time: '09:00 - 10:00', typeKey: 'mockTest', statusKey: 'confirmed', tone: 'dash-badge border' },
  { id: 3, monthKey: 'nov', day: '02', topicKey: 'behavioral', time: '15:00 - 16:00', typeKey: 'videoCall', statusKey: 'scheduled', tone: 'dash-badge border' },
]

export default function UpcomingSessions({ colSpan = '', compact = false }) {
  const { t } = useTranslation()
  const gridClass = compact
    ? 'grid grid-cols-1 gap-3'
    : 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'

  return (
    <section className={[colSpan, 'dash-card rounded-[20px] p-5 transition-colors duration-200 sm:p-6'].join(' ')}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="dash-card-title">{t('dashboard.upcoming.title')}</h2>
          <p className="dash-subtle mt-1 text-xs font-medium">{t('dashboard.upcoming.subtitle')}</p>
        </div>
        <button className="dash-chip inline-flex h-10 items-center justify-center gap-2 rounded-[13px] border px-3 text-sm font-semibold transition-colors hover:opacity-85">
          <Plus size={16} />
          {t('dashboard.upcoming.newSchedule')}
        </button>
      </div>

      <div className={gridClass}>
        {SESSIONS.map((session) => (
          <article
            key={session.id}
            className="dash-muted-panel group flex gap-3 rounded-[16px] border p-3.5 transition-colors hover:bg-[var(--dash-surface-raised)]"
          >
            <div className="flex min-w-14 flex-col items-center justify-center rounded-[13px] border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] p-2.5 shadow-[var(--dash-shadow-control)]">
              <span className="text-[10px] font-bold uppercase text-[var(--dash-danger)]">
                {t(`dashboard.upcoming.month.${session.monthKey}`)}
              </span>
              <span className="dash-text text-2xl font-bold leading-none">{session.day}</span>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="dash-text truncate text-sm font-semibold transition-colors group-hover:text-[var(--dash-accent-text)]">
                {t(`dashboard.upcoming.topic.${session.topicKey}`)}
              </h3>
              <div className="dash-muted mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="inline-flex items-center gap-1">
                  <Clock size={13} />
                  {session.time}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Video size={13} />
                  {t(`dashboard.upcoming.type.${session.typeKey}`)}
                </span>
              </div>
              <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${session.tone}`}>
                {t(`dashboard.upcoming.status.${session.statusKey}`)}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
