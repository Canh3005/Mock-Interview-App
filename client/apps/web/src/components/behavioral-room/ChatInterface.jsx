import { useEffect, useRef, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Mic, MicOff, Send, AlertTriangle, Bot, User } from 'lucide-react'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { submitAnswer } from '../../store/slices/behavioralSlice'

const MAX_CHARS = 2000
const WARN_CHARS = 1600
const MIN_CHARS = 100

// ─── Chat bubble: interviewer hoặc candidate ─────────────────────────────────
function _ChatBubble({ turn, isStreamingTarget, streamingText, userAvatar }) {
  const { t } = useTranslation()
  const isInterviewer = turn.role === 'interviewer'
  const content = isStreamingTarget ? streamingText : turn.content

  return (
    <div className={`flex gap-3 ${isInterviewer ? 'justify-start' : 'justify-end'}`}>
      {isInterviewer && (
        <div className="dash-chip mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border">
          <Bot className="w-4 h-4 text-cta" />
        </div>
      )}
      <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
        isInterviewer
          ? 'dash-muted-panel border rounded-tl-md'
          : 'border border-cta/30 bg-cta/10 text-[var(--dash-text)] rounded-tr-md'
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
      {!isInterviewer && (
      <div className="dash-muted-panel mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border">
          {userAvatar ? (
            <img src={userAvatar} alt={t('combatRoom.chat.userAlt')} className="w-full h-full object-cover" />
          ) : (
            <User className="w-4 h-4 text-slate-400" />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Evaluating indicator: dots khi scoring đang chạy ────────────────────────
function _EvaluatingBubble({ label }) {
  return (
    <div className="flex gap-3 justify-start">
      <div className="dash-chip mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border">
        <Bot className="w-4 h-4 text-cta" />
      </div>
      <div className="dash-muted-panel max-w-[78%] rounded-2xl rounded-tl-md border px-4 py-3 text-sm">
        <span className="inline-flex gap-1 items-center">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          <span className="text-slate-500 text-xs ml-1">{label}</span>
        </span>
      </div>
    </div>
  )
}

export default function ChatInterface({ combat = false }) {
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const { turns, isStreaming, isEvaluating, streamingText } = useSelector((s) => s.behavioral)
  const { user } = useSelector((s) => s.auth)

  const [text, setText] = useState('')
  const [voiceMode, setVoiceMode] = useState(false)
  const [pasteWarning, setPasteWarning] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const autoVoiceStartedRef = useRef(false)

  const { isListening, transcript, isSupported, startListening, stopListening, resetTranscript } =
    useVoiceInput()

  useEffect(() => {
    if (voiceMode && transcript) setText(transcript)
  }, [transcript, voiceMode])

  // Combat: phỏng vấn voice-driven — bật voice mode mặc định 1 lần khi vào phòng.
  // Vẫn giữ text input làm fallback nếu STT lỗi.
  useEffect(() => {
    if (!combat || !isSupported || autoVoiceStartedRef.current) return
    autoVoiceStartedRef.current = true
    setVoiceMode(true)
    resetTranscript()
    startListening()
  }, [combat, isSupported, startListening, resetTranscript])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, streamingText, isEvaluating])

  useEffect(() => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
    }
  }, [text])

  const _handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || isStreaming || isEvaluating) return
    dispatch(submitAnswer(trimmed.slice(0, MAX_CHARS)))
    setText('')
    resetTranscript()
    if (isListening) stopListening()
  }, [text, isStreaming, isEvaluating, dispatch, resetTranscript, stopListening, isListening])

  const _handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      _handleSend()
    }
  }

  const _handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text')
    if (pasted.length > 500) {
      setPasteWarning(true)
      setTimeout(() => setPasteWarning(false), 4000)
    }
  }

  const _toggleVoice = () => {
    if (!voiceMode) {
      setVoiceMode(true)
      setText('')
      resetTranscript()
      startListening()
    } else {
      setVoiceMode(false)
      stopListening()
    }
  }

  const _handleSendTruncated = () => {
    setText((t) => t.slice(0, MAX_CHARS))
    setTimeout(_handleSend, 0)
  }

  const charCount = text.length
  const counterColor =
    charCount > MAX_CHARS ? 'text-red-400'
    : charCount > WARN_CHARS ? 'text-amber-400'
    : charCount > 0 ? 'text-emerald-400'
    : 'text-slate-600'

  const inputDisabled = isStreaming || isEvaluating
  const sendDisabled = inputDisabled || !text.trim() || charCount > MAX_CHARS

  // Turn cuối cùng của interviewer đang được stream
  const lastTurn = turns[turns.length - 1]
  const isLastTurnStreaming = isStreaming && lastTurn?.role === 'interviewer'

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        {turns.map((turn, idx) => {
          const isLast = idx === turns.length - 1
          const isStreamTarget = isLast && isLastTurnStreaming
          return (
            <_ChatBubble
              key={turn.id}
              turn={turn}
              isStreamingTarget={isStreamTarget}
              streamingText={streamingText}
              userAvatar={user?.avatarUrl}
            />
          )
        })}

        {/* Streaming bubble khi AI đang stream nhưng turn chưa push vào turns */}
        {isStreaming && lastTurn?.role === 'candidate' && (
          <div className="flex gap-3 justify-start">
            <div className="dash-chip mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border">
              <Bot className="w-4 h-4 text-cta" />
            </div>
            <div className="dash-muted-panel max-w-[78%] rounded-2xl rounded-tl-md border px-4 py-3 text-sm">
              {streamingText ? (
                <>
                  <span className="whitespace-pre-wrap">{streamingText}</span>
                  <span className="inline-block w-0.5 h-4 bg-cta animate-pulse ml-0.5 align-middle" />
                </>
              ) : (
                <span className="inline-flex gap-1 items-center text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </div>
          </div>
        )}

        {/* Evaluating indicator */}
        {isEvaluating && (
          <_EvaluatingBubble label={t('behavioralRoom.chat.evaluating')} />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Paste warning */}
      {pasteWarning && (
        <div className="mx-4 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          {t('behavioralRoom.chat.pasteWarning')}
        </div>
      )}

      {/* Input area */}
      <div className="dash-border flex flex-col gap-2 border-t px-4 pb-4 pt-3">
        {charCount > WARN_CHARS && charCount <= MAX_CHARS && (
          <p className="text-xs text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {t('behavioralRoom.chat.charApproaching')}
          </p>
        )}
        {charCount > MAX_CHARS && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {t('behavioralRoom.chat.charExceeded')}
          </p>
        )}
        {charCount > 0 && charCount < MIN_CHARS && (
          <p className="dash-subtle text-xs">{t('behavioralRoom.chat.charMin')}</p>
        )}

        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={_handleKeyDown}
              onPaste={_handlePaste}
              placeholder={
                voiceMode
                  ? isListening ? t('behavioralRoom.chat.listening') : t('behavioralRoom.chat.voicePrompt')
                  : t('behavioralRoom.chat.textPrompt')
              }
              disabled={inputDisabled}
              rows={1}
              className={`dash-input w-full resize-none rounded-[14px] px-4 py-3 text-sm placeholder:text-[var(--dash-subtle)] focus:outline-none transition-colors disabled:opacity-50 ${
                charCount > MAX_CHARS
                  ? 'border-red-500/50 focus:ring-red-500/50'
                  : charCount > WARN_CHARS
                  ? 'border-amber-500/50 focus:ring-amber-500/50'
                  : ''
              }`}
            />
            <span className={`absolute bottom-2 right-3 text-[10px] font-mono transition-colors ${counterColor}`}>
              {charCount}/{MAX_CHARS}
            </span>
          </div>

          {isSupported && (
            <button
              onClick={_toggleVoice}
              className={`flex-shrink-0 rounded-[14px] border p-3 transition-all ${
                isListening
                  ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                  : voiceMode
                  ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                  : 'dash-control text-[var(--dash-muted)] hover:text-[var(--dash-text)]'
              }`}
              title={isListening ? t('behavioralRoom.chat.stopVoice') : t('behavioralRoom.chat.enableVoice')}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}

          {charCount <= MAX_CHARS ? (
            <button
              onClick={_handleSend}
              disabled={sendDisabled}
              className="dash-primary-button flex-shrink-0 rounded-[14px] p-3 font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40"
              title={t('behavioralRoom.chat.send')}
            >
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={_handleSendTruncated}
              className="px-3 py-3 rounded-xl bg-amber-500/20 border border-amber-500 text-amber-400 text-xs font-semibold transition-all flex-shrink-0 whitespace-nowrap"
            >
              {t('behavioralRoom.chat.sendTruncated')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
