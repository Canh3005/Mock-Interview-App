import { useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  COMBAT_START_SESSION,
  COMBAT_SEND_MESSAGE,
  COMBAT_COMPLETE,
  COMBAT_START_ENGINE,
  COMBAT_INPUT_MODE,
} from '../../store/sagas/combatSaga';
import { inputModeChanged, silenceUpdated, resetCombatOrchestrator } from '../../store/slices/combatOrchestratorSlice';
import { resetBehavioral } from '../../store/slices/behavioralSlice';
import { resetSetup } from '../../store/slices/interviewSetupSlice';
import { COMBAT_STATES } from '../../services/CombatOrchestrator';
import { multimodalEngine } from '../../services/MultimodalEngine';
import { VoiceActivityDetector } from '../../services/VoiceActivityDetector';
import CombatHeader from './CombatHeader';
import CombatSidebar from './CombatSidebar';
import CombatChatArea from './CombatChatArea';
import CombatInputBar from './CombatInputBar';
import CombatModals from './CombatModals';

// ─── Constants ────────────────────────────────────────────────────────────────
const SILENCE_HINT_MS       = 5000;
const SILENCE_PROMPT_MS     = 10000;
const SILENCE_OFFER_SKIP_MS = 20000;
const SILENCE_AUTO_SKIP_MS  = 30000;
const AUTO_SEND_SILENCE_MS  = 3000;
const MIN_WORDS_FOR_AUTO_SEND = 5;

export default function CombatInterviewRoom({ interviewSessionId, navigate }) {
  const dispatch = useDispatch();

  const {
    sessionId, currentStage, stageName, candidateLevel,
    messages, isStreaming, streamingText,
  } = useSelector((s) => s.behavioral);

  const {
    combatState, inputMode, isAiSpeaking, isCandidateSpeaking,
  } = useSelector((s) => s.combatOrchestrator);

  const { user } = useSelector((s) => s.auth);

  const videoRef       = useRef(null);
  const mediaStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const vadRef         = useRef(null);
  const audioCtxRef    = useRef(null);
  const initDoneRef    = useRef(false);
  const sessionTextRef = useRef('');

  const [transcript,      setTranscript]      = useState('');
  const [textInput,       setTextInput]       = useState('');
  const [silenceFlags,    setSilenceFlags]    = useState({ shownHint: false, promptedRepeat: false, offeredSkip: false });
  const [elapsedMs,       setElapsedMs]       = useState(0);
  const [showExitModal,   setShowExitModal]   = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setElapsedMs((ms) => ms + 1000), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Init / cleanup ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;
    initCombatSession();
    return () => cleanup();
  }, []);

  // ── Start multimodal engine once sessionId is available ──────────────────────
  const engineStartedRef = useRef(false);
  useEffect(() => {
    if (!sessionId || engineStartedRef.current || !mediaStreamRef.current) return;
    engineStartedRef.current = true;
    dispatch({
      type: COMBAT_START_ENGINE,
      payload: { mediaStream: mediaStreamRef.current, sessionId, videoElement: videoRef.current },
    });
  }, [sessionId]);

  async function initCombatSession() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      dispatch({ type: COMBAT_START_SESSION, payload: { interviewSessionId, inputMode: 'voice' } });
    } catch (err) {
      console.error('[CombatRoom] Init failed:', err);
    }
  }

  // ── Orchestrator state transitions ────────────────────────────────────────
  useEffect(() => {
    if (combatState === COMBAT_STATES.CANDIDATE_THINKING) {
      setTimeout(() => { if (inputMode === 'voice') startSTT(); }, 200);
    }
    if (combatState === COMBAT_STATES.CANDIDATE_SPEAKING) startSilenceWatch();
    if ([COMBAT_STATES.AI_ASKING, COMBAT_STATES.AI_FOLLOW_UP, COMBAT_STATES.AI_PROCESSING].includes(combatState)) {
      stopSTT();
      stopSilenceWatch();
    }
    if (combatState === COMBAT_STATES.COMPLETED) navigate('scoring');
  }, [combatState]);

  // ── STT ────────────────────────────────────────────────────────────────────
  function startSTT() {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) return;
    if (recognitionRef.current) stopSTT();

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'vi-VN';
    sessionTextRef.current = '';

    recognition.onresult = (event) => {
      if (recognitionRef.current !== recognition) return;
      let interim = '', final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) {
        sessionTextRef.current += final;
        multimodalEngine.feedTranscript(final);
      }
      setTranscript((sessionTextRef.current + interim).trim());
    };

    recognition.onstart = () => {
      dispatch({ type: 'combatOrchestrator/stateChanged', payload: { combatState: COMBAT_STATES.CANDIDATE_SPEAKING } });
      multimodalEngine.startTurn();
    };

    recognition.start();
    recognitionRef.current = recognition;
  }
  // Stop STT and clear interim results buffer in browser
  function stopSTT() {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    recognition?.stop();
  }

  // ── Silence detection ─────────────────────────────────────────────────────
  function startSilenceWatch() {
    if (!mediaStreamRef.current) return;
    if (!audioCtxRef.current)
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (vadRef.current) vadRef.current.stop();

    const vad = new VoiceActivityDetector(audioCtxRef.current, mediaStreamRef.current);
    vad.start(({ isSpeaking, silenceDurationMs: silMs }) => {
      dispatch(silenceUpdated(silMs));
      if (!isSpeaking) handleSilence(silMs);
    });
    vadRef.current = vad;
  }
  // Stop silence watch and reset all related flags
  function stopSilenceWatch() {
    vadRef.current?.stop();
    vadRef.current = null;
    setSilenceFlags({ shownHint: false, promptedRepeat: false, offeredSkip: false });
  }

  function handleSilence(silenceMs) {
    const isCandidate =
      combatState === COMBAT_STATES.CANDIDATE_THINKING ||
      combatState === COMBAT_STATES.CANDIDATE_SPEAKING;
    if (!isCandidate) return;

    if (silenceMs > SILENCE_AUTO_SKIP_MS) {
      handleSendMessage();
    } else if (silenceMs > SILENCE_OFFER_SKIP_MS && !silenceFlags.offeredSkip) {
      setSilenceFlags((f) => ({ ...f, offeredSkip: true }));
    } else if (silenceMs > SILENCE_PROMPT_MS && !silenceFlags.promptedRepeat) {
      setSilenceFlags((f) => ({ ...f, promptedRepeat: true }));
    } else if (silenceMs > SILENCE_HINT_MS && !silenceFlags.shownHint) {
      setSilenceFlags((f) => ({ ...f, shownHint: true }));
    }

    const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
    if (silenceMs > AUTO_SEND_SILENCE_MS && wordCount >= MIN_WORDS_FOR_AUTO_SEND && isCandidateSpeaking) {
      handleSendMessage();
    }
  }

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSendMessage = useCallback(() => {
    const content = inputMode === 'voice' ? transcript.trim() : textInput.trim();
    if (!content || !sessionId) return;

    stopSTT();
    stopSilenceWatch();
    dispatch({
      type: COMBAT_SEND_MESSAGE,
      payload: { sessionId, content, inputType: inputMode, voiceTranscript: inputMode === 'voice' ? transcript : undefined },
    });
    setTranscript('');
    setTextInput('');
  }, [transcript, textInput, inputMode, sessionId]);

  function handleSkip() {
    if (!sessionId) return;
    stopSTT();
    stopSilenceWatch();
    dispatch({
      type: COMBAT_SEND_MESSAGE,
      payload: { sessionId, content: '(Bỏ qua)', inputType: inputMode },
    });
    setTranscript('');
  }

  function handleComplete() {
    if (!sessionId) return;
    dispatch({ type: COMBAT_COMPLETE, payload: { sessionId } });
  }

  function handleExit() {
    cleanup();
    dispatch(resetBehavioral());
    dispatch(resetCombatOrchestrator());
    dispatch(resetSetup());
    navigate('dashboard');
  }

  function handleFinishClick() {
    if (isLastStageFinished) {
      handleComplete();
    } else {
      setShowFinishModal(true);
    }
  }

  function handleConfirmFinish() {
    setShowFinishModal(false);
    handleComplete();
  }

  function cleanup() {
    stopSTT();
    stopSilenceWatch();
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    multimodalEngine.stop();
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const isRecording = isCandidateSpeaking && inputMode === 'voice';
  const isWaitingForCandidate =
    combatState === COMBAT_STATES.CANDIDATE_THINKING ||
    combatState === COMBAT_STATES.CANDIDATE_SPEAKING;
  const canSend = inputMode === 'voice' ? transcript.trim().length > 0 : textInput.trim().length > 0;
  const isLastStageFinished = combatState === COMBAT_STATES.COMPLETED || currentStage >= 6;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <CombatHeader
        currentStage={currentStage}
        stageName={stageName}
        candidateLevel={candidateLevel}
        combatState={combatState}
        isAiSpeaking={isAiSpeaking}
        isRecording={isRecording}
        isWaitingForCandidate={isWaitingForCandidate}
        isStreaming={isStreaming}
        elapsedMs={elapsedMs}
        isLastStageFinished={isLastStageFinished}
        onExit={() => setShowExitModal(true)}
        onFinish={handleFinishClick}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <CombatSidebar
          videoRef={videoRef}
          isRecording={isRecording}
          isAiSpeaking={isAiSpeaking}
          currentStage={currentStage}
        />

        <main className="flex-1 min-w-0 flex flex-col relative">
          <CombatChatArea
            messages={messages}
            isStreaming={isStreaming}
            streamingText={streamingText}
            userAvatar={user?.avatarUrl}
            silenceFlags={silenceFlags}
            isWaitingForCandidate={isWaitingForCandidate}
            onSkip={handleSkip}
          />
          <CombatInputBar
            inputMode={inputMode}
            transcript={transcript}
            textInput={textInput}
            setTextInput={setTextInput}
            isRecording={isRecording}
            isStreaming={isStreaming}
            isAiSpeaking={isAiSpeaking}
            canSend={canSend}
            onSend={handleSendMessage}
            onClearTranscript={() => {
              sessionTextRef.current = '';
              setTranscript('');
              // Restart recognition to flush browser's interim buffer
              if (recognitionRef.current) {
                stopSTT();
                setTimeout(() => startSTT(), 100);
              }
            }}
            onSwitchToVoice={() => {
              dispatch(inputModeChanged('voice'));
              dispatch({ type: COMBAT_INPUT_MODE, payload: 'voice' });
              if (isWaitingForCandidate) setTimeout(() => startSTT(), 100);
            }}
            onSwitchToText={() => {
              stopSTT();
              dispatch(inputModeChanged('text'));
              dispatch({ type: COMBAT_INPUT_MODE, payload: 'text' });
            }}
          />
        </main>
      </div>

      <CombatModals
        showExitModal={showExitModal}
        showFinishModal={showFinishModal}
        currentStage={currentStage}
        onCloseExit={() => setShowExitModal(false)}
        onConfirmExit={handleExit}
        onCloseFinish={() => setShowFinishModal(false)}
        onConfirmFinish={handleConfirmFinish}
      />
    </div>
  );
}
