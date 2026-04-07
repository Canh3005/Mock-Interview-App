/**
 * Task 3.6 — Multimodal Engine
 * Singleton orchestrator cho Analysis Layer:
 * - Khởi động EyeTracking + FillerWord + MicroExpression analyzers
 * - Gom buffer mỗi 5 giây → POST /api/combat/sessions/:id/metrics
 * - Expose snapshot cho CombatOrchestrator (Task 3.12)
 */
import { EyeTrackingAnalyzer } from './EyeTrackingAnalyzer';
import { FillerWordCounter } from './FillerWordCounter';
import { MicroExpressionDetector } from './MicroExpressionDetector';
import { combatApi } from '../api/combat.api';

const FLUSH_INTERVAL_MS = 15_000;

class MultimodalEngine {
  constructor() {
    this._sessionId = null;
    this._mediaStream = null;
    this._videoEl = null;

    this._eyeAnalyzer = new EyeTrackingAnalyzer();
    this._fillerCounter = new FillerWordCounter();
    this._exprDetector = new MicroExpressionDetector();

    // Buffers
    this._eyeBuffer = [];
    this._fillerBuffer = null;
    this._exprBuffer = [];

    // Latest snapshot for AI context
    this._latestSnapshot = {
      dominantExpression: 'neutral',
      expressionConfidence: 0,
      gazeOnScreenPercent: 100,
      fillerRate: 0,
      speakingPaceWpm: 0,
      turnDurationMs: 0,
    };

    this._flushInterval = null;
    this._status = 'idle'; // idle | loading | running | stopped
    this._turnStartTs = null;
    this._turnWordCount = 0;
    this._turnEyeFrames = [];
    this._turnExprFrames = [];
  }

  get status() {
    return this._status;
  }

  async start(mediaStream, sessionId, videoElement) {
    if (this._status === 'running') return;
    this._status = 'loading';
    this._sessionId = sessionId;
    this._mediaStream = mediaStream;
    this._videoEl = videoElement;

    // Init Eye Tracking
    const eyeReady = await this._eyeAnalyzer.init().catch(() => false);
    if (eyeReady) {
      this._eyeAnalyzer.start(videoElement, (frame) => {
        this._eyeBuffer.push(frame);
        this._turnEyeFrames.push(frame);
      });
    }

    // Filler counter
    this._fillerCounter.start((frame) => {
      this._fillerBuffer = frame;
    });

    // Expression detector — piggybacks on EyeAnalyzer's shared results listener
    if (eyeReady) {
      this._exprDetector.start(videoElement, this._eyeAnalyzer, (frame) => {
        this._exprBuffer.push(frame);
        this._turnExprFrames.push(frame);
      });
    }

    // Flush every 5s
    this._flushInterval = setInterval(() => this._flush(), FLUSH_INTERVAL_MS);
    this._status = 'running';
  }

  stop() {
    if (this._status === 'stopped') return;
    this._eyeAnalyzer.stop();
    this._fillerCounter.stop();
    this._exprDetector.stop();
    if (this._flushInterval) {
      clearInterval(this._flushInterval);
      this._flushInterval = null;
    }
    this._flush(); // Final flush
    this._status = 'stopped';
  }

  /** Gọi khi ứng viên bắt đầu nói — reset turn buffers */
  startTurn() {
    this._turnStartTs = Date.now();
    this._turnWordCount = 0;
    this._turnEyeFrames = [];
    this._turnExprFrames = [];
  }

  /** Gọi khi ứng viên gửi câu trả lời — tính snapshot rồi trả về */
  endTurn(transcript = '') {
    const turnDurationMs = this._turnStartTs
      ? Date.now() - this._turnStartTs
      : 0;
    const words = transcript.trim().split(/\s+/).filter(Boolean);
    const speakingPaceWpm =
      turnDurationMs > 0
        ? Math.round((words.length / turnDurationMs) * 60000)
        : 0;

    // Gaze %
    const totalEye = this._turnEyeFrames.length;
    const screenEye = this._turnEyeFrames.filter(
      (f) => f.gaze === 'screen',
    ).length;
    const gazeOnScreenPercent =
      totalEye > 0 ? Math.round((screenEye / totalEye) * 100) : 100;

    // Filler rate
    const fillerRate = this._fillerBuffer?.fillerRate ?? 0;

    // Dominant expression
    const validExprs = this._turnExprFrames.filter((f) => f.confidence >= 0.6);
    const exprCounts = {};
    for (const f of validExprs) {
      exprCounts[f.expression] = (exprCounts[f.expression] ?? 0) + 1;
    }
    const sortedExprs = Object.entries(exprCounts).sort((a, b) => b[1] - a[1]);
    const dominantExpression = sortedExprs[0]?.[0] ?? 'neutral';
    const expressionConfidence =
      validExprs.length > 0
        ? validExprs.reduce((s, f) => s + f.confidence, 0) / validExprs.length
        : 0;

    this._latestSnapshot = {
      dominantExpression,
      expressionConfidence,
      gazeOnScreenPercent,
      fillerRate,
      speakingPaceWpm,
      turnDurationMs,
    };

    return this._latestSnapshot;
  }

  /** Gọi từ Orchestrator để inject vào AI context */
  getLatestSnapshot() {
    return { ...this._latestSnapshot };
  }

  /** Gọi từ FillerWordCounter khi nhận transcript STT */
  feedTranscript(text) {
    this._fillerCounter.processTranscript(text);
  }

  async _flush() {
    if (!this._sessionId) return;
    if (
      this._eyeBuffer.length === 0 &&
      !this._fillerBuffer &&
      this._exprBuffer.length === 0
    )
      return;

    const now = Date.now();
    const batchStartTs = now - FLUSH_INTERVAL_MS;

    const payload = {
      sessionId: this._sessionId,
      batchStartTs,
      batchEndTs: now,
      eyeTracking: [...this._eyeBuffer],
      fillerWords: this._fillerBuffer ?? undefined,
      expressions: [...this._exprBuffer],
    };

    // Clear buffers before async call to avoid double-sending
    this._eyeBuffer = [];
    this._fillerBuffer = null;
    this._exprBuffer = [];

    try {
      await combatApi.ingestMetrics(this._sessionId, payload);
    } catch (err) {
      console.warn('[MultimodalEngine] Metrics flush failed:', err);
    }
  }
}

export const multimodalEngine = new MultimodalEngine();
export default MultimodalEngine;
