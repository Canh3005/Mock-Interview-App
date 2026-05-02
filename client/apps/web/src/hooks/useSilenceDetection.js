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

export function useSilenceDetection({ phase, isAiLoading, isListening }) {
  const dispatch = useDispatch();
  const chatHistory = useSelector((s) => s.sdInterviewer.chatHistory);
  const silenceCount = useSelector((s) => s.sdInterviewer.silenceCount);
  const architectureJSON = useSelector((s) => s.sdSession.architectureJSON);

  const totalTimerRef = useRef(null);
  const canvasTimerRef = useRef(null);
  const prevNodeIdsRef = useRef(new Set());
  const pendingNodesRef = useRef([]);

  // Refs for values read in timeout callbacks to avoid stale closure
  const silenceCountRef = useRef(silenceCount);
  silenceCountRef.current = silenceCount;
  const isAiLoadingRef = useRef(isAiLoading);
  isAiLoadingRef.current = isAiLoading;
  const isListeningRef = useRef(isListening);
  isListeningRef.current = isListening;

  const lastRelevantEntry = useMemo(() => {
    return [...chatHistory].reverse().find((m) => m.role === 'user');
  }, [chatHistory]);

  // Total silence timer — all phases
  // silenceCount in deps so a fresh window opens after each trigger fires
  // isAiLoading/isListening in deps so timer clears immediately when blocked conditions start
  useEffect(() => {
    const threshold = SILENCE_THRESHOLDS[phase];
    if (!threshold || silenceCount >= MAX_TRIGGERS || isAiLoading || isListening) return;

    clearTimeout(totalTimerRef.current);
    totalTimerRef.current = setTimeout(() => {
      clearTimeout(canvasTimerRef.current);
      dispatch(silenceTriggerRequest({ triggerType: 'TOTAL_SILENCE', nodes: '' }));
    }, threshold);

    return () => clearTimeout(totalTimerRef.current);
  }, [lastRelevantEntry, silenceCount, isAiLoading, isListening, phase, dispatch]);

  // Canvas-watch timer — DESIGN phase only
  // silenceCount not in deps: timer resets only on new node additions.
  // Stale-closure guard via silenceCountRef/isAiLoadingRef inside the callback.
  useEffect(() => {
    if (phase !== 'DESIGN') return;

    const nodes = architectureJSON?.nodes ?? [];
    const newNodes = nodes.filter((n) => !prevNodeIdsRef.current.has(n.id));
    nodes.forEach((n) => prevNodeIdsRef.current.add(n.id));

    if (newNodes.length === 0) return;
    pendingNodesRef.current = [...pendingNodesRef.current, ...newNodes];

    if (silenceCountRef.current >= MAX_TRIGGERS) return;

    clearTimeout(canvasTimerRef.current);
    canvasTimerRef.current = setTimeout(() => {
      if (silenceCountRef.current >= MAX_TRIGGERS || isAiLoadingRef.current || isListeningRef.current) return;
      clearTimeout(totalTimerRef.current);
      const nodeNames = pendingNodesRef.current
        .map((n) => n.data?.label ?? n.type)
        .join(', ');
      dispatch(silenceTriggerRequest({ triggerType: 'DRAWING_SILENCE', nodes: nodeNames }));
      pendingNodesRef.current = [];
    }, 90_000);
  }, [architectureJSON, phase, dispatch]);

  // Cancel canvas timer when user sends a message (lastRelevantEntry = last user msg in non-DEEP_DIVE)
  useEffect(() => {
    clearTimeout(canvasTimerRef.current);
    pendingNodesRef.current = [];
  }, [lastRelevantEntry]);

  // Reset node tracking when phase changes
  useEffect(() => {
    prevNodeIdsRef.current = new Set();
    pendingNodesRef.current = [];
  }, [phase]);

  // Cleanup both timers on unmount
  useEffect(
    () => () => {
      clearTimeout(totalTimerRef.current);
      clearTimeout(canvasTimerRef.current);
    },
    [],
  );

  // Exposed to AiChatPanel: call on input onChange to cancel pending trigger on first keypress
  const cancelTriggers = useCallback(() => {
    clearTimeout(totalTimerRef.current);
  }, []);

  return { cancelTriggers };
}
