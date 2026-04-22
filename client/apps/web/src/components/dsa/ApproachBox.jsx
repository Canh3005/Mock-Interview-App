import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Lightbulb, ArrowRight } from 'lucide-react'

export default function ApproachBox({ problemId, onSubmit }) {
  const dispatch = useDispatch()
  const savedApproach = useSelector((s) => s.dsaSession.approachTexts[problemId] ?? '')
  const [text, setText] = useState(savedApproach)
  const loading = useSelector((s) => s.dsaSession.loading)

  const handleSubmit = () => {
    if (!text.trim()) return
    onSubmit(problemId, text.trim())
  }

  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-900 border border-slate-700 rounded-xl">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-yellow-400" />
        <span className="text-sm font-semibold text-white">Approach của bạn</span>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Trước khi code, hãy ghi ra: thuật toán định dùng, độ phức tạp ước tính, edge case nhận ra.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="VD: Dùng two-pointer. O(n) time, O(1) space. Edge case: mảng rỗng..."
        rows={4}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:ring-1 focus:ring-cta/50"
      />

      <button
        disabled={!text.trim() || loading}
        onClick={handleSubmit}
        className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-cta hover:bg-cta/90 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-sm transition-colors"
      >
        Xác nhận approach & mở editor
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}
