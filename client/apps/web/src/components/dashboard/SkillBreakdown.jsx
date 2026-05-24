import { useTranslation } from 'react-i18next'

function ScoreBar({ score }) {
  return (
    <div className="dash-progress-track h-2 rounded-full">
      <div className="h-full rounded-full bg-cta transition-all duration-500" style={{ width: `${score}%` }} />
    </div>
  )
}

export default function SkillBreakdown({ colSpan = '' }) {
  const { t } = useTranslation()

  const skills = [
    { name: t('dashboard.skillBreakdown.skills.algorithms'), score: 85 },
    { name: t('dashboard.skillBreakdown.skills.systemDesign'), score: 62 },
    { name: t('dashboard.skillBreakdown.skills.problemSolving'), score: 90 },
    { name: t('dashboard.skillBreakdown.skills.communication'), score: 78 },
  ]

  return (
    <div className={[colSpan, 'dash-card rounded-[20px] p-5 transition-colors duration-200 sm:p-6'].join(' ')}>
      <div className="mb-7 flex items-center justify-between gap-4">
        <div>
          <h2 className="dash-card-title">Phân tích kỹ năng chi tiết</h2>
          <p className="dash-subtle mt-1 text-xs font-medium">Điểm trung bình mỗi nhóm năng lực</p>
        </div>
        <button className="dash-accent text-sm font-semibold transition-colors hover:opacity-80">
          Xem tất cả
        </button>
      </div>

      <div className="flex flex-col gap-5">
        {skills.map((skill) => (
          <div key={skill.name}>
            <div className="mb-2.5 flex items-end justify-between gap-4">
              <span className="dash-text text-sm font-semibold sm:text-base">
                {skill.name}
              </span>
              <span className="dash-text text-sm font-semibold tabular-nums">
                {skill.score}%
              </span>
            </div>
            <ScoreBar score={skill.score} />
          </div>
        ))}
      </div>
    </div>
  )
}
