import { CheckCircle, XCircle, AlertTriangle, TrendingUp, Brain, Code2 } from 'lucide-react'
import SolutionWalkthrough from './SolutionWalkthrough'

const APPROACH_VERDICT_STYLE = {
  STRONG:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  ADEQUATE: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  WEAK:     'text-amber-400 bg-amber-500/10 border-amber-500/30',
  FAILED:   'text-red-400 bg-red-500/10 border-red-500/30',
}

function SectionLabel({ icon: Icon, color, children }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{children}</p>
    </div>
  )
}

function ProblemCard({ index, problemId, debrief, finalCode, language }) {
  const verdictStyle = APPROACH_VERDICT_STYLE[debrief?.approachVerdict] ?? APPROACH_VERDICT_STYLE.WEAK
  const hasDebrief = !!debrief

  return (
    <div className="border border-slate-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white">Bài {index + 1}</span>
        </div>
        {hasDebrief && debrief.approachVerdict && (
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${verdictStyle}`}>
            {debrief.approachVerdict}
          </span>
        )}
        {!hasDebrief && (
          <span className="text-xs text-slate-500 italic">Chưa có nhận xét</span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-4">
        {hasDebrief ? (
          <>
            {/* Complexity Analysis */}
            {debrief.complexityAnalysis && (
              <div>
                <SectionLabel icon={TrendingUp} color="text-cyan-400">Độ phức tạp</SectionLabel>
                {typeof debrief.complexityAnalysis === 'string' ? (
                  <p className="text-xs text-slate-300 leading-relaxed">{debrief.complexityAnalysis}</p>
                ) : (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {debrief.complexityAnalysis.submitted && (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        Submitted: {debrief.complexityAnalysis.submitted}
                      </span>
                    )}
                    {debrief.complexityAnalysis.optimal && (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono">
                        Optimal: {debrief.complexityAnalysis.optimal}
                      </span>
                    )}
                    {debrief.complexityAnalysis.verdict && (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 italic">
                        {debrief.complexityAnalysis.verdict}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Stuck Points */}
            {debrief.stuckPoints?.length > 0 && (
              <div>
                <SectionLabel icon={AlertTriangle} color="text-amber-400">Điểm bị mắc</SectionLabel>
                <ul className="flex flex-col gap-1">
                  {debrief.stuckPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                      <XCircle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Follow-up Performance */}
            {debrief.followUpPerformance && (
              <div>
                <SectionLabel icon={Brain} color="text-purple-400">Trả lời follow-up</SectionLabel>
                <p className="text-xs text-slate-300 leading-relaxed">{debrief.followUpPerformance}</p>
              </div>
            )}

            {/* Actionable Suggestion */}
            {debrief.actionableSuggestion && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                <SectionLabel icon={CheckCircle} color="text-blue-400">Gợi ý cải thiện</SectionLabel>
                <p className="text-xs text-slate-300 leading-relaxed">{debrief.actionableSuggestion}</p>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-500 italic text-center py-2">
            AI chưa hoàn tất nhận xét cho bài này.
          </p>
        )}

        {/* Submitted code */}
        <SolutionWalkthrough code={finalCode} language={language} />
      </div>
    </div>
  )
}

export default function DSAScoringTab({ session }) {
  if (!session) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        Không có dữ liệu DSA & Live Coding.
      </div>
    )
  }

  const problemIds = session.problemIds ?? []
  const finalScore = session.finalScore ?? {}
  const finalCode = session.finalCode ?? {}
  const language = session.language ?? 'python'

  if (!problemIds.length) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        Không có bài nào được ghi nhận trong phiên này.
      </div>
    )
  }

  return (
    <div className="flex flex-col max-w-2xl mx-auto py-6 px-4 gap-4">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
        DSA & Live Coding — {problemIds.length} bài
      </h2>
      {problemIds.map((problemId, i) => (
        <ProblemCard
          key={problemId}
          index={i}
          problemId={problemId}
          debrief={finalScore[problemId]}
          finalCode={finalCode[problemId]}
          language={language}
        />
      ))}
    </div>
  )
}
