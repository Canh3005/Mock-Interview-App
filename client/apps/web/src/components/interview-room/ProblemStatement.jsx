/**
 * ProblemStatement — Rendered problem description for the interview question.
 * Displays: title, tags, constraints, and example I/O.
 */
import { useTranslation } from 'react-i18next'

export default function ProblemStatement() {
  const { t } = useTranslation()
  
  return (
    <article className="p-4 space-y-4 font-['Fira_Sans',sans-serif]" aria-label={t('interviewRoom.problem')}>
      {/* Title */}
      <div>
        <h2 className="font-['Fira_Code',monospace] text-sm font-bold text-white leading-snug">
          #42 · {t('interviewRoom.problemTitle')}
        </h2>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {['Array', 'Hash Map', t('interviewRoom.difficulty.easy')].map(tag => (
            <span
              key={tag}
              className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                tag === t('interviewRoom.difficulty.easy')
                  ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]'
                  : 'bg-slate-700/50 border-slate-600/60 text-slate-400'
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-300 leading-relaxed">
        {t('interviewRoom.problemDescription')}
      </p>

      <p className="text-xs text-slate-400 leading-relaxed">
        {t('interviewRoom.problemNote')}
      </p>

      {/* Examples */}
      <div className="space-y-3">
        <h3 className="font-['Fira_Code',monospace] text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          {t('interviewRoom.examples')}
        </h3>

        {[
          {
            id: 1,
            input: 'nums = [2,7,11,15], target = 9',
            output: '[0, 1]',
            explain: 'nums[0] + nums[1] = 2 + 7 = 9',
          },
          {
            id: 2,
            input: 'nums = [3,2,4], target = 6',
            output: '[1, 2]',
            explain: 'nums[1] + nums[2] = 2 + 4 = 6',
          },
        ].map(ex => (
          <div
            key={ex.id}
            className="bg-[#0D1424] border border-slate-700/50 rounded-lg p-3 space-y-1.5"
          >
            <p className="font-['Fira_Code',monospace] text-[11px] text-slate-400">
              <span className="text-slate-500">Input: </span>
              <span className="text-sky-300">{ex.input}</span>
            </p>
            <p className="font-['Fira_Code',monospace] text-[11px] text-slate-400">
              <span className="text-slate-500">Output: </span>
              <span className="text-[#22C55E]">{ex.output}</span>
            </p>
            <p className="font-['Fira_Code',monospace] text-[11px] text-slate-500">
              <span>// </span>{ex.explain}
            </p>
          </div>
        ))}
      </div>

      {/* Constraints */}
      <div>
        <h3 className="font-['Fira_Code',monospace] text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          {t('interviewRoom.constraints')}
        </h3>
        <ul className="space-y-1">
          {[
            '2 ≤ nums.length ≤ 10⁴',
            '-10⁹ ≤ nums[i] ≤ 10⁹',
            '-10⁹ ≤ target ≤ 10⁹',
            t('interviewRoom.constraintsList.c1'),
          ].map((c, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-600 flex-shrink-0" aria-hidden="true" />
              <span className="font-['Fira_Code',monospace] text-[11px] text-slate-400">{c}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Follow-up */}
      <div className="pt-2 border-t border-slate-700/40">
        <p className="text-[11px] text-slate-500 font-['Fira_Sans',sans-serif] leading-relaxed">
          <span className="text-amber-400 font-semibold">Follow-up:</span>{' '}
          Bạn có thể nghĩ ra thuật toán có độ phức tạp thời gian dưới O(n²) không?
        </p>
      </div>
    </article>
  )
}
