import { useState, useRef, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { MessageSquare, Lightbulb, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  startSessionRequest,
  sendMessageRequest,
  requestHintRequest,
} from '../../store/slices/sdInterviewerSlice'
import { useSilenceDetection } from '../../hooks/useSilenceDetection'

function _formatTime(iso) {
  return new Date(iso).toTimeString().slice(0, 8)
}

function ChatBubble({ msg }) {
  const { t } = useTranslation()
  const isUser = msg.role === 'user'
  const isHint = msg.role === 'hint'

  return (
    <div className={`flex flex-col gap-0.5 ${isUser ? 'items-end' : 'items-start'}`}>
      <span className="text-xs text-slate-500">[{_formatTime(msg.timestamp)}]</span>
      <div
        className={`max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
          isUser
            ? 'bg-cta text-cta-foreground'
            : isHint
            ? 'bg-yellow-500/10 border border-yellow-500/30 text-slate-200'
            : 'bg-slate-800 border border-slate-700 text-slate-200'
        }`}
      >
        {isHint && (
          <div className="flex items-center gap-1 mb-1 text-yellow-400 font-medium">
            <Lightbulb className="w-3 h-3" />
            <span>{t('sdRoom.aiChat.hint')}</span>
          </div>
        )}
        {msg.content}
      </div>
    </div>
  )
}

export default function AiChatPanel() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { chatHistory, streamingMessage, componentCoverage, hintsUsed, loading, hintLoading } =
    useSelector((s) => s.sdInterviewer)
  const phase = useSelector((s) => s.sdSession.phase)
  const [inputValue, setInputValue] = useState('')
  const bottomRef = useRef(null)

  // isListening hardcoded false until voice input is integrated into SD room
  const { cancelTriggers } = useSilenceDetection({ phase, isAiLoading: loading, isListening: false })

  useEffect(() => {
    dispatch(startSessionRequest())
  }, [dispatch])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, streamingMessage])

  const _handleSend = useCallback(() => {
    const text = inputValue.trim()
    if (!text || loading) return
    dispatch(sendMessageRequest({ userMessage: text }))
    setInputValue('')
  }, [inputValue, loading, dispatch])

  const _handleHint = useCallback(() => {
    if (hintLoading || loading) return
    dispatch(requestHintRequest())
  }, [hintLoading, loading, dispatch])

  const _handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        _handleSend()
      }
    },
    [_handleSend],
  )

  const _handleInputChange = useCallback(
    (e) => {
      cancelTriggers()
      setInputValue(e.target.value)
    },
    [cancelTriggers],
  )

  return (
    <div className="flex flex-col h-full">
      {/* Coverage badge */}
      <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-cta" />
          <span className="text-xs text-slate-400">
            {t('sdRoom.aiChat.coverage', { percent: componentCoverage })}
          </span>
        </div>
        <span className="text-[10px] text-slate-500 italic">{t('sdRoom.aiChat.hintPenaltyNote')}</span>
      </div>

      {/* Chat history */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {chatHistory.map((msg, i) => (
          <ChatBubble key={i} msg={msg} />
        ))}

        {loading && !streamingMessage && (
          <div className="flex flex-col gap-0.5 items-start">
            <div className="max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed bg-slate-800 border border-slate-700 text-slate-200">
              <span className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        {streamingMessage && (
          <div className="flex flex-col gap-0.5 items-start">
            <div className="max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed bg-slate-800 border border-slate-700 text-slate-200">
              {streamingMessage}
              <span className="animate-pulse ml-0.5">▌</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Hint button */}
      <div className="px-3 py-2 border-t border-slate-800">
        <button
          onClick={_handleHint}
          disabled={hintLoading || loading}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          {hintLoading
            ? t('sdRoom.aiChat.hintLoading')
            : t('sdRoom.aiChat.requestHint', { count: hintsUsed })}
        </button>
      </div>

      {/* Input */}
      <div className="px-3 pb-3 flex gap-2">
        <textarea
          value={inputValue}
          onChange={_handleInputChange}
          onKeyDown={_handleKeyDown}
          placeholder={t('sdRoom.aiChat.inputPlaceholder')}
          disabled={loading}
          rows={2}
          className="flex-1 resize-none text-xs bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder:text-slate-500 outline-none focus:border-cta disabled:opacity-50 transition-colors"
        />
        <button
          onClick={_handleSend}
          disabled={!inputValue.trim() || loading}
          className="self-end px-3 py-2 rounded-lg bg-cta text-cta-foreground text-xs font-medium hover:bg-cta/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
