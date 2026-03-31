import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, MessageCircle, Repeat2 } from 'lucide-react';
import CombatChatBubble from './CombatChatBubble';

export default function CombatChatArea({
  messages, isStreaming, streamingText, userAvatar,
  silenceFlags, isWaitingForCandidate, onSkip,
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 min-h-0">
      {messages.map((msg, idx) => {
        const isLast = idx === messages.length - 1;
        const isStreamTarget = isLast && isStreaming && msg.role !== 'user';
        return (
          <CombatChatBubble
            key={msg.id ?? idx}
            msg={msg}
            isStreamingTarget={isStreamTarget}
            streamingText={streamingText}
            userAvatar={userAvatar}
          />
        );
      })}

      {isStreaming && messages[messages.length - 1]?.role === 'user' && (
        <div className="flex gap-3 justify-start">
          <div className="w-8 h-8 rounded-full bg-cta/20 border border-cta/40 flex items-center justify-center flex-shrink-0 mt-1">
            <Bot className="w-4 h-4 text-cta" />
          </div>
          <div className="max-w-[78%] px-4 py-3 rounded-2xl text-sm bg-slate-800 border border-slate-700 rounded-tl-md">
            {streamingText ? (
              <>
                <span className="whitespace-pre-wrap text-slate-100">{streamingText}</span>
                <span className="inline-block w-0.5 h-4 bg-cta animate-pulse ml-0.5 align-middle" />
              </>
            ) : (
              <span className="inline-flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            )}
          </div>
        </div>
      )}

      <div ref={bottomRef} />

      {/* Silence warnings — rendered inside scroll container so they appear above input */}
      <AnimatePresence>
        {silenceFlags.shownHint && isWaitingForCandidate && (
          <motion.div
            key="hint"
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-xs"
          >
            <MessageCircle className="w-3 h-3 flex-shrink-0" />
            Bạn có thể bắt đầu trả lời bất cứ lúc nào...
          </motion.div>
        )}
        {silenceFlags.promptedRepeat && isWaitingForCandidate && (
          <motion.div
            key="repeat"
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs"
          >
            <Repeat2 className="w-3 h-3 flex-shrink-0" />
            Bạn cần mình nhắc lại câu hỏi không?
          </motion.div>
        )}
        {silenceFlags.offeredSkip && isWaitingForCandidate && (
          <motion.div
            key="skip"
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-xs"
          >
            <span className="flex-1">Bạn có muốn bỏ qua câu này?</span>
            <button
              onClick={onSkip}
              className="text-slate-300 border border-slate-600 px-2 py-0.5 rounded-md hover:bg-slate-700 transition-colors"
            >
              Bỏ qua
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
