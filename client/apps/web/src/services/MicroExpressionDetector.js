/**
 * Task 3.9 — Micro-Expression Detector (MediaPipe Face Mesh + rule-based)
 * Reuse FaceMesh instance từ EyeTrackingAnalyzer — KHÔNG tạo instance mới.
 * Chạy mỗi 2 giây.
 */

const INTERVAL_MS = 2000;
const MIN_CONFIDENCE = 0.6;

export class MicroExpressionDetector {
  constructor() {
    this._videoEl = null;
    this._onFrame = null; // (ExpressionFrame) => void
    this._faceMeshRef = null; // shared FaceMesh instance từ EyeTrackingAnalyzer
    this._lastFrameTs = 0;
  }

  /**
   * @param {HTMLVideoElement} videoElement
   * @param {import('./EyeTrackingAnalyzer').EyeTrackingAnalyzer} eyeAnalyzer - shared analyzer
   * @param {function} onFrame
   */
  start(videoElement, eyeAnalyzer, onFrame) {
    this._videoEl = videoElement;
    this._faceMeshRef = eyeAnalyzer._faceMesh;
    this._onFrame = onFrame;
    // Piggyback on EyeTrackingAnalyzer's single onResults — no re-registration
    eyeAnalyzer.addResultsListener((results) => this._handleResults(results));
  }

  stop() {} // No-op: results come from shared EyeTrackingAnalyzer listener

  _handleResults(results) {
    // Throttle to INTERVAL_MS (2s) — EyeTracker fires every 500ms
    const now = Date.now();
    if (now - this._lastFrameTs < INTERVAL_MS) return;
    this._lastFrameTs = now;
    const ts = Date.now();
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0)
      return;

    const landmarks = results.multiFaceLandmarks[0];
    const { expression, confidence } = this._classifyExpression(landmarks);

    if (confidence < MIN_CONFIDENCE) return; // Discard low-confidence frames

    this._onFrame?.({ ts, expression, confidence });
  }

  _classifyExpression(landmarks) {
    try {
      // Eyebrow raise — landmarks 70 (left brow), 300 (right brow) vs eye corners
      const leftBrow = landmarks[70];
      const rightBrow = landmarks[300];
      const leftEyeTop = landmarks[159];
      const rightEyeTop = landmarks[386];
      const browRaise =
        leftBrow && leftEyeTop
          ? (leftEyeTop.y - leftBrow.y + (rightEyeTop.y - rightBrow.y)) / 2
          : 0;

      // Lip corner angle — landmarks 61 (left), 291 (right), 0 (top lip)
      const leftLip = landmarks[61];
      const rightLip = landmarks[291];
      const lipWidth = leftLip && rightLip
        ? Math.abs(rightLip.x - leftLip.x)
        : 0;
      const lipTopCenter = landmarks[0];
      const lipCornerHeight =
        leftLip && lipTopCenter
          ? (leftLip.y + rightLip.y) / 2 - lipTopCenter.y
          : 0;

      // Lip press — upper lip landmark 13 vs lower lip 14
      const upperLip = landmarks[13];
      const lowerLip = landmarks[14];
      const lipGap =
        upperLip && lowerLip ? Math.abs(lowerLip.y - upperLip.y) : 0.05;

      // Rule-based classification
      const isSmiling = lipCornerHeight > 0.015 && lipWidth > 0.1;
      const isTense = browRaise > 0.03 && lipGap < 0.005;
      const isUncertain = browRaise > 0.04 && !isSmiling;

      let expression = 'neutral';
      let confidence = 0.7;

      if (isSmiling) {
        expression = 'confident';
        confidence = Math.min(0.95, 0.7 + lipWidth * 2);
      } else if (isTense) {
        expression = 'stressed';
        confidence = Math.min(0.9, 0.65 + browRaise * 5);
      } else if (isUncertain) {
        expression = 'uncertain';
        confidence = 0.65;
      }

      return { expression, confidence };
    } catch {
      return { expression: 'neutral', confidence: 0.5 };
    }
  }
}

export default MicroExpressionDetector;
