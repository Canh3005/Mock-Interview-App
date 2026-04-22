import { Bot } from 'lucide-react'

export default function AIChat({ messages, problemId }) {
  const filtered = messages?.filter((m) => m.problemId === problemId) ?? []

  if (!filtered.length) {
    return (
      <div className="text-slate-600 text-xs text-center py-4 italic">
        AI Interviewer sẽ hỏi khi cần thiết
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {filtered.map((msg, i) => (
        <div key={i} className={`flex gap-2 ${msg.role === 'ai' ? 'items-start' : 'items-start flex-row-reverse'}`}>
          {msg.role === 'ai' && (
            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot className="w-3.5 h-3.5 text-blue-400" />
            </div>
          )}
          <div className={`text-xs rounded-xl px-3 py-2 max-w-[85%] leading-relaxed ${
            msg.role === 'ai'
              ? 'bg-slate-800 text-slate-200'
              : 'bg-cta/10 text-slate-300 border border-cta/20'
          }`}>
            {msg.content}
          </div>
        </div>
      ))}
    </div>
  )
}
