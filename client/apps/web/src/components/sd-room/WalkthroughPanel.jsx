import { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Mic, MicOff, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { appendTranscriptRequest } from '../../store/slices/sdSessionSlice'

function formatTime(isoStr) {
  const d = new Date(isoStr)
  return d.toTimeString().slice(0, 8)
}

export default function WalkthroughPanel() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const transcriptHistory = useSelector((s) => s.sdSession.transcriptHistory)

  const [textInput, setTextInput] = useState('')
  const bottomRef = useRef(null)
  const prevListeningRef = useRef(false)

  const { isListening, transcript, isSupported, startListening, stopListening, resetTranscript } =
    useVoiceInput({ lang: 'vi-VN' })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcriptHistory])

  useEffect(() => {
    if (prevListeningRef.current && !isListening && transcript.trim()) {
      dispatch(
        appendTranscriptRequest({
          text: transcript.trim(),
          timestamp: new Date().toISOString(),
          source: 'voice',
        })
      )
      resetTranscript()
    }
    prevListeningRef.current = isListening
  }, [isListening, transcript, dispatch, resetTranscript])

  const handleVoiceToggle = () => {
    if (isListening) stopListening()
    else startListening()
  }

  const handleSendText = () => {
    const text = textInput.trim()
    if (!text) return
    dispatch(
      appendTranscriptRequest({
        text,
        timestamp: new Date().toISOString(),
        source: 'text',
      })
    )
    setTextInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendText()
    }
  }

  return (
    <aside className="w-80 h-full bg-card border-l border-border flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">{t('sdRoom.walkthrough.transcript')}</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {transcriptHistory.map((entry, i) => (
          <div key={i} className="text-xs text-foreground leading-relaxed">
            <span className="text-muted-foreground mr-2">[{formatTime(entry.timestamp)}]</span>
            <span className="mr-1">{entry.source === 'voice' ? '🎤' : '💬'}</span>
            <span>{entry.text}</span>
          </div>
        ))}
        {isListening && transcript && (
          <div className="text-xs text-muted-foreground italic">{transcript}</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-3 flex flex-col gap-2">
        {isSupported && (
          <button
            onClick={handleVoiceToggle}
            className={`flex items-center justify-center gap-2 w-full py-2 rounded-md text-sm font-medium transition-colors ${
              isListening
                ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                : 'bg-background border border-border text-foreground hover:border-cta hover:text-cta'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isListening ? 'Stop Recording' : t('sdRoom.walkthrough.voiceButton')}
          </button>
        )}
        <div className="flex gap-2">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('sdRoom.walkthrough.textPlaceholder')}
            rows={2}
            className="flex-1 resize-none text-xs bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-cta"
          />
          <button
            onClick={handleSendText}
            disabled={!textInput.trim()}
            className="px-3 py-2 rounded-md bg-cta text-cta-foreground text-xs font-medium hover:bg-cta/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
