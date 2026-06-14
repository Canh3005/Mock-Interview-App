import { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../router/routes';
import { Loader2, AlertTriangle, CheckCircle2, Clock, AlertCircle, LogOut, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { loadRequest, resetNSDSession, canvasChanged } from '../../store/slices/nsdSessionSlice';
import { resetNSDInterviewer, startSessionRequest, sendMessageRequest } from '../../store/slices/nsdInterviewerSlice';
import { evaluationReset } from '../../store/slices/nsdEvaluatorSlice';
import { resetSetup } from '../../store/slices/interviewSetupSlice';
import SystemDesignCanvas from '../system-design-canvas/SystemDesignCanvas';
import NodeLibrary from '../system-design-canvas/NodeLibrary';
import ResizeDivider from '../shared/ui/ResizeDivider';

const NSD_PHASES = ['PHASE_1_FR', 'PHASE_2_NFR', 'PHASE_3_SCALE', 'PHASE_4_HLD', 'PHASE_5_DEEP_DIVE'];

const PHASE_LABELS = {
  PHASE_1_FR: 'Functional Req.',
  PHASE_2_NFR: 'Non-Functional',
  PHASE_3_SCALE: 'Scale',
  PHASE_4_HLD: 'HLD',
  PHASE_5_DEEP_DIVE: 'Deep Dive',
  EVALUATING: 'Evaluating',
  COMPLETED: 'Completed',
};

const RIGHT_PANEL_MIN = 280;
const RIGHT_PANEL_MAX = 560;
const RIGHT_PANEL_DEFAULT = 340;

function AutoSaveIndicator({ status }) {
  if (status === 'saving')
    return (
      <span className="flex items-center gap-1 text-xs text-slate-500">
        <Clock className="w-3 h-3 animate-spin" />
        Saving…
      </span>
    );
  if (status === 'saved')
    return (
      <span className="flex items-center gap-1 text-xs text-green-400">
        <CheckCircle2 className="w-3 h-3" />
        Saved
      </span>
    );
  if (status === 'error')
    return (
      <span className="flex items-center gap-1 text-xs text-red-400">
        <AlertCircle className="w-3 h-3" />
        Save failed
      </span>
    );
  return null;
}

function PhaseProgressBar({ phase }) {
  const activeIdx = NSD_PHASES.indexOf(phase);
  return (
    <div className="flex items-center gap-1">
      {NSD_PHASES.map((p, i) => (
        <div key={p} className="flex items-center gap-1">
          <div
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
              i < activeIdx
                ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                : i === activeIdx
                ? 'bg-cta/15 text-cta border border-cta/30'
                : 'bg-slate-800 text-slate-500 border border-slate-700'
            }`}
          >
            {PHASE_LABELS[p]}
          </div>
          {i < NSD_PHASES.length - 1 && <div className="w-3 h-px bg-slate-700" />}
        </div>
      ))}
    </div>
  );
}

function NSDChatBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex flex-col gap-0.5 ${isUser ? 'items-end' : 'items-start'}`}>
      <span className="text-xs text-slate-500">[{new Date(msg.timestamp).toTimeString().slice(0, 8)}]</span>
      <div
        className={`max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
          isUser
            ? 'bg-cta text-cta-foreground'
            : msg.wasFill
            ? 'bg-yellow-500/10 border border-yellow-500/30 text-slate-200'
            : 'bg-slate-800 border border-slate-700 text-slate-200'
        }`}
      >
        {msg.wasFill && (
          <div className="flex items-center gap-1 mb-1 text-yellow-400 font-medium text-[10px]">
            <AlertCircle className="w-3 h-3" />
            Fill provided
          </div>
        )}
        {msg.content}
      </div>
    </div>
  );
}

function NSDChatPanel() {
  const dispatch = useDispatch();
  const { chatHistory, streamingMessage, loading } = useSelector((s) => s.nsdInterviewer);
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, streamingMessage]);

  const handleSend = () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    dispatch(sendMessageRequest({ userMessage: msg }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {chatHistory.map((msg, i) => (
          <NSDChatBubble key={i} msg={msg} />
        ))}
        {streamingMessage && (
          <div className="flex items-start">
            <div className="max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed bg-slate-800 border border-slate-700 text-slate-200">
              {streamingMessage}
              <span className="inline-block w-1 h-3 ml-0.5 bg-cta animate-pulse align-middle" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 border-t border-slate-800 p-2">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('sdRoom.aiChat.inputPlaceholder')}
            disabled={loading}
            rows={2}
            className="flex-1 resize-none rounded-[12px] bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cta/60 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="shrink-0 flex items-center justify-center w-9 h-9 rounded-[12px] bg-cta text-cta-foreground disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExitConfirmModal({ onCancel, onConfirm }) {
  const { t } = useTranslation();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="dash-card w-full max-w-sm rounded-[20px] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-red-500/30 bg-red-500/10 text-red-500">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h2 className="dash-text text-base font-bold">{t('dashboard.focus.exitModal.title')}</h2>
            <p className="dash-subtle mt-1 text-sm">{t('dashboard.focus.exitModal.description')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="dash-control flex-1 rounded-[14px] border px-4 py-2.5 text-sm font-semibold">
            {t('dashboard.focus.exitModal.cancel')}
          </button>
          <button onClick={onConfirm} className="flex-1 rounded-[14px] bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500">
            {t('dashboard.focus.exitModal.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NSDRoomPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const nsdSessionId = useSelector((s) => s.interviewSetup.session?.nsdSessionId);
  const { loading, error, phase, autoSaveStatus, canvasMode, canvasJSON } = useSelector((s) => s.nsdSession);
  const [rightWidth, setRightWidth] = useState(RIGHT_PANEL_DEFAULT);
  const [showExitModal, setShowExitModal] = useState(false);

  useEffect(() => {
    if (nsdSessionId) {
      dispatch(loadRequest(nsdSessionId));
    }
    return () => {
      dispatch(resetNSDSession());
      dispatch(resetNSDInterviewer());
    };
  }, [nsdSessionId, dispatch]);

  // Start session once loaded
  useEffect(() => {
    if (!loading && !error && nsdSessionId && phase === 'PHASE_1_FR') {
      dispatch(startSessionRequest());
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightWidth;
    const onMouseMove = (mv) => {
      const next = Math.min(RIGHT_PANEL_MAX, Math.max(RIGHT_PANEL_MIN, startWidth + startX - mv.clientX));
      setRightWidth(next);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [rightWidth]);

  const handleCanvasChange = useCallback(({ nodes, edges }) => {
    dispatch(canvasChanged({ nodes, edges }));
  }, [dispatch]);

  const handleConfirmExit = () => {
    dispatch(resetNSDSession());
    dispatch(resetNSDInterviewer());
    dispatch(evaluationReset());
    dispatch(resetSetup());
    navigate(ROUTES.DASHBOARD);
  };

  const isCanvasLocked = canvasMode === 'locked';
  const isCanvasViewOnly = false; // NSD never has view_only — only locked or editable

  if (loading)
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center">
        <div className="dash-card flex flex-col items-center gap-3 rounded-[20px] p-8">
          <Loader2 className="w-8 h-8 text-cta animate-spin" />
        </div>
      </div>
    );

  if (error)
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center">
        <div className="dash-card flex max-w-sm flex-col items-center gap-4 rounded-[20px] p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400" />
          <p className="dash-subtle text-sm">{error}</p>
          <button onClick={() => dispatch(loadRequest(nsdSessionId))} className="dash-control rounded-[14px] border px-5 py-2 text-sm font-semibold">
            Retry
          </button>
        </div>
      </div>
    );

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-2 overflow-hidden p-2 text-[var(--dash-text)] sm:gap-3 sm:p-3">
      <nav className="flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-2 rounded-[18px] border border-slate-800/60 bg-slate-900 px-3 py-2 shadow-shell">
        <PhaseProgressBar phase={phase} />
        <div className="flex shrink-0 items-center gap-4">
          <AutoSaveIndicator status={autoSaveStatus} />
          <button
            onClick={() => setShowExitModal(true)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Exit
          </button>
        </div>
      </nav>

      <div className="flex min-h-0 flex-1 overflow-hidden gap-0">
        <NodeLibrary />
        <div className="flex-1 flex flex-col rounded-xl overflow-hidden border border-slate-800/60 ml-1.5">
          <SystemDesignCanvas
            value={canvasJSON}
            isLocked={isCanvasLocked}
            isViewOnly={isCanvasViewOnly}
            onChange={handleCanvasChange}
          />
        </div>
        <ResizeDivider onMouseDown={handleResizeStart} />
        <div
          style={{ width: rightWidth }}
          className="flex-shrink-0 flex flex-col rounded-xl overflow-hidden bg-slate-900 border border-slate-800/60"
        >
          <div className="shrink-0 px-3 py-2 border-b border-slate-800 text-xs font-medium text-slate-400">
            AI Interviewer
          </div>
          <div className="flex-1 min-h-0">
            <NSDChatPanel />
          </div>
        </div>
      </div>

      {showExitModal && (
        <ExitConfirmModal onCancel={() => setShowExitModal(false)} onConfirm={handleConfirmExit} />
      )}
    </div>
  );
}
