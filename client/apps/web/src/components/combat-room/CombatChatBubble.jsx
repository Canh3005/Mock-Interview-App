import { Bot, User } from 'lucide-react';

export default function CombatChatBubble({ msg, isStreamingTarget, streamingText, userAvatar }) {
  const isAi = msg.role === 'ai';
  const content = isStreamingTarget ? streamingText : msg.content;

  return (
    <div className={`flex gap-3 ${isAi ? 'justify-start' : 'justify-end'}`}>
      {isAi && (
        <div className="w-8 h-8 rounded-full bg-cta/20 border border-cta/40 flex items-center justify-center flex-shrink-0 mt-1">
          <Bot className="w-4 h-4 text-cta" />
        </div>
      )}

      <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
        isAi
          ? 'bg-slate-800 border border-slate-700 text-slate-100 rounded-tl-md'
          : 'bg-cta/15 border border-cta/30 text-slate-100 rounded-tr-md'
      }`}>
        {isStreamingTarget && !content ? (
          <span className="inline-flex gap-1 items-center text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        ) : (
          <span className="whitespace-pre-wrap">{content}</span>
        )}
        {isStreamingTarget && content && (
          <span className="inline-block w-0.5 h-4 bg-cta animate-pulse ml-0.5 align-middle" />
        )}
      </div>

      {!isAi && (
        <div className="w-8 h-8 rounded-full border border-slate-600 flex-shrink-0 mt-1 overflow-hidden flex items-center justify-center bg-slate-700">
          {userAvatar ? (
            <img src={userAvatar} alt="User" className="w-full h-full object-cover" />
          ) : (
            <User className="w-4 h-4 text-slate-400" />
          )}
        </div>
      )}
    </div>
  );
}
