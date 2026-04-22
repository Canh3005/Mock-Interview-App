import { useDispatch, useSelector } from 'react-redux'
import { switchProblem } from '../../store/slices/dsaSessionSlice'
import { CheckCircle, Circle } from 'lucide-react'

const DIFFICULTY_COLOR = { EASY: 'text-emerald-400', MEDIUM: 'text-yellow-400', HARD: 'text-red-400' }

export default function ProblemPicker() {
  const dispatch = useDispatch()
  const { problems, activeProblemId, problemProgress } = useSelector((s) => s.dsaSession)

  if (problems.length <= 1) return null

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {problems.map((p, i) => {
        const progress = problemProgress[p.id]
        const isDone = progress?.submittedAt
        const isActive = p.id === activeProblemId

        return (
          <button
            key={p.id}
            onClick={() => dispatch(switchProblem(p.id))}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
              isActive
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
            ].join(' ')}
          >
            {isDone
              ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              : <Circle className="w-3.5 h-3.5" />}
            <span>Bài {i + 1}</span>
            <span className={`${DIFFICULTY_COLOR[p.difficulty] ?? ''}`}>
              {p.difficulty?.[0]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
