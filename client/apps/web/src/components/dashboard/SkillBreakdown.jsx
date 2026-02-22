/**
 * SkillBreakdown — Individual skill progress bars
 */
const SKILLS = [
  { name: 'Giao tiếp',     score: 78, category: 'Soft Skill',   color: 'bg-sky-400'    },
  { name: 'Thuật toán',    score: 85, category: 'Technical',    color: 'bg-cta'        },
  { name: 'System Design', score: 62, category: 'Technical',    color: 'bg-violet-400' },
  { name: 'Problem Solving', score: 90, category: 'Technical',  color: 'bg-cta'        },
  { name: 'Behavioral',    score: 70, category: 'Soft Skill',   color: 'bg-amber-400'  },
  { name: 'Code Quality',  score: 74, category: 'Technical',    color: 'bg-sky-400'    },
]

function ScoreBar({ score, color }) {
  return (
    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${score}%` }}
      />
    </div>
  )
}

export default function SkillBreakdown({ colSpan = '' }) {
  return (
    <div className={[colSpan, 'bg-primary border border-slate-700/60 rounded-[12px] p-6 shadow-md'].join(' ')}>
      <div className="mb-5">
        <h2 className="font-heading text-base font-semibold text-white tracking-tight">Phân tích kỹ năng</h2>
        <p className="font-body text-xs text-slate-400 mt-0.5">Điểm trung bình mỗi nhóm</p>
      </div>

      <div className="flex flex-col gap-4">
        {SKILLS.map((skill) => (
          <div
            key={skill.name}
            className="group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-body text-sm font-medium text-slate-200 group-hover:text-white transition-colors duration-200">
                  {skill.name}
                </span>
                <span className="font-body text-[10px] text-slate-500 border border-slate-700 rounded px-1.5 py-0.5">
                  {skill.category}
                </span>
              </div>
              <span className={`font-heading text-sm font-bold tabular-nums ${skill.score >= 80 ? 'text-cta' : skill.score >= 65 ? 'text-amber-400' : 'text-rose-400'}`}>
                {skill.score}%
              </span>
            </div>
            <ScoreBar score={skill.score} color={skill.color} />
          </div>
        ))}
      </div>

      {/* Summary note */}
      <div className="mt-5 pt-4 border-t border-slate-700/60">
        <p className="font-body text-xs text-slate-500">
          Dựa trên <span className="text-slate-300 font-medium">12 phiên phỏng vấn</span> trong 30 ngày qua
        </p>
      </div>
    </div>
  )
}
