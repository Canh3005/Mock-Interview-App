/**
 * ProblemStatement — Rendered problem description for the interview question.
 * Displays: title, tags, constraints, and example I/O.
 */
export default function ProblemStatement() {
  return (
    <article className="p-4 space-y-4 font-['Fira_Sans',sans-serif]" aria-label="Đề bài phỏng vấn">
      {/* Title */}
      <div>
        <h2 className="font-['Fira_Code',monospace] text-sm font-bold text-white leading-snug">
          #42 · Two Sum
        </h2>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {['Array', 'Hash Map', 'Easy'].map(tag => (
            <span
              key={tag}
              className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                tag === 'Easy'
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
        Cho một mảng số nguyên <code className="font-['Fira_Code',monospace] text-[#22C55E] bg-[#22C55E]/10 px-1 py-0.5 rounded text-xs">nums</code> và
        một số nguyên đích <code className="font-['Fira_Code',monospace] text-[#22C55E] bg-[#22C55E]/10 px-1 py-0.5 rounded text-xs">target</code>,
        hãy trả về
        {' '}<em className="text-slate-200 not-italic font-medium">chỉ số</em> của hai số có tổng bằng{' '}
        <code className="font-['Fira_Code',monospace] text-[#22C55E] bg-[#22C55E]/10 px-1 py-0.5 rounded text-xs">target</code>.
      </p>

      <p className="text-xs text-slate-400 leading-relaxed">
        Giả sử rằng mỗi đầu vào chỉ có <strong className="text-slate-300">đúng một</strong> cặp đáp án,
        và bạn không thể sử dụng cùng một phần tử hai lần.
      </p>

      {/* Examples */}
      <div className="space-y-3">
        <h3 className="font-['Fira_Code',monospace] text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Ví dụ
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
          Ràng buộc
        </h3>
        <ul className="space-y-1">
          {[
            '2 ≤ nums.length ≤ 10⁴',
            '-10⁹ ≤ nums[i] ≤ 10⁹',
            '-10⁹ ≤ target ≤ 10⁹',
            'Chỉ có đúng một đáp án hợp lệ.',
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
