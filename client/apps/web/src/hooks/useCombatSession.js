import { useEffect, useRef, useState } from 'react'
import { multimodalEngine } from '../services/MultimodalEngine'
import { sentenceTtsBuffer } from '../services/SentenceTtsBuffer'
import { CombatProctoringMonitor } from '../services/proctoring/combatProctoring'

/**
 * Session-neutral combat engine hook. Drives webcam capture, multimodal
 * analysis, proctoring and TTS for any interview session (DSA, behavior, …).
 *
 * @param {object}  args
 * @param {string}  args.mode               'practice' | 'combat' | 'solo'
 * @param {string}  args.interviewSessionId combat aggregate key
 * @param {object}  args.videoRef           ref to a hidden <video> element
 * @param {Array}   args.aiConversation     [{ role: 'ai'|'user', content }]
 * @param {object} [args.ttsOptions]        passed to sentenceTtsBuffer.init
 */
export function useCombatSession({ mode, interviewSessionId, videoRef, aiConversation, ttsOptions }) {
  const [mediaStream, setMediaStream] = useState(null)
  const monitorRef = useRef(null)
  const engineStartedRef = useRef(false)
  const isAiSpeakingRef = useRef(false)
  const processedCountRef = useRef(0)

  useEffect(() => {
    if (mode !== 'combat' || !interviewSessionId) return

    let cancelled = false

    async function _init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        setMediaStream(stream)
        sentenceTtsBuffer.init(ttsOptions ?? {})

        if (!engineStartedRef.current) {
          engineStartedRef.current = true
          const videoEl = videoRef?.current ?? null
          if (videoEl) {
            videoEl.srcObject = stream
            await videoEl.play().catch(() => {})
          }
          await multimodalEngine.start(stream, interviewSessionId, videoEl)
        }

        const monitor = new CombatProctoringMonitor({
          sessionId: interviewSessionId,
          interviewSessionId,
          isAiSpeaking: () => isAiSpeakingRef.current,
          getFaceCount: () => multimodalEngine.getFaceCount?.() ?? 1,
          getVadResult: () => ({ rmsLevel: 0 }),
          getLastTranscriptTs: () => 0,
          getOrchestratorState: () => 'CANDIDATE_THINKING',
        })
        monitorRef.current = monitor
        monitor.start()
      } catch {
        // getUserMedia denied — user already cleared permission gate, shouldn't occur
      }
    }

    _init()

    return () => {
      cancelled = true
      monitorRef.current?.stop()
      monitorRef.current = null
      setMediaStream((prev) => {
        prev?.getTracks().forEach((t) => t.stop())
        return null
      })
      multimodalEngine.stop()
      engineStartedRef.current = false
    }
  }, [mode, interviewSessionId])

  useEffect(() => {
    if (mode !== 'combat' || !aiConversation?.length) return

    const lastIdx = aiConversation.length - 1
    if (lastIdx < processedCountRef.current) return
    processedCountRef.current = aiConversation.length

    const last = aiConversation[lastIdx]
    if (last?.role !== 'ai') return

    const text = last.content ?? ''
    if (!text) return

    isAiSpeakingRef.current = true
    sentenceTtsBuffer.appendToken(text)
    sentenceTtsBuffer.flush()
    sentenceTtsBuffer.waitForFinish().then(() => {
      isAiSpeakingRef.current = false
    }).catch(() => {
      isAiSpeakingRef.current = false
    })
  }, [aiConversation?.length, mode])

  return { mediaStream }
}
