import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { silenceTriggerRequest } from '../store/slices/sdInterviewerSlice';

const SILENCE_THRESHOLDS = {
  CLARIFICATION: 90_000,
  DESIGN: 90_000,
  DEEP_DIVE: 90_000,
  WRAP_UP: 120_000,
};
const MAX_TRIGGERS = 2;

export function useSilenceDetection({ phase, isAiLoading, isListening, isDrawingSubState }) {
  const dispatch = useDispatch();
  const chatHistory = useSelector((s) => s.sdInterviewer.chatHistory);
  const silenceCount = useSelector((s) => s.sdInterviewer.silenceCount);

  const totalTimerRef = useRef(null);

  const silenceCountRef = useRef(silenceCount);
  silenceCountRef.current = silenceCount;
  const isAiLoadingRef = useRef(isAiLoading);
  isAiLoadingRef.current = isAiLoading;
  const isListeningRef = useRef(isListening);
  isListeningRef.current = isListening;

  const lastRelevantEntry = useMemo(() => {
    return [...chatHistory].reverse().find((m) => m.role === 'user');
  }, [chatHistory]);

  // Total silence timer — paused during DESIGN drawing sub-state
  useEffect(() => {
    const threshold = SILENCE_THRESHOLDS[phase];
    if (!threshold || silenceCount >= MAX_TRIGGERS || isAiLoading || isListening || isDrawingSubState) return;

    clearTimeout(totalTimerRef.current);
    totalTimerRef.current = setTimeout(() => {
      dispatch(silenceTriggerRequest({ triggerType: 'TOTAL_SILENCE', nodes: '' }));
    }, threshold);

    return () => clearTimeout(totalTimerRef.current);
  }, [lastRelevantEntry, silenceCount, isAiLoading, isListening, phase, dispatch, isDrawingSubState]);

  // Cleanup on unmount
  useEffect(
    () => () => { clearTimeout(totalTimerRef.current); },
    [],
  );

  const cancelTriggers = useCallback(() => {
    clearTimeout(totalTimerRef.current);
  }, []);

  return { cancelTriggers };
}
