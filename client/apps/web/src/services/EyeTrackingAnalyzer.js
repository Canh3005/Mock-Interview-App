/**
 * Task 3.7 — Eye-Tracking Analyzer (MediaPipe Face Mesh)
 * Inference chạy trên browser, KHÔNG gửi video về server.
 * Chạy mỗi 500ms để tiết kiệm CPU.
 */

const INTERVAL_MS = 500;
const AWAY_ANGLE_THRESHOLD = 20; // degrees

export class EyeTrackingAnalyzer {
  constructor() {
    this._faceMesh = null;
    this._intervalId = null;
    this._videoEl = null;
    this._canvas = document.createElement('canvas');
    this._ctx = this._canvas.getContext('2d');
    this._onFrame = null;    // (EyeTrackingFrame) => void
    this._resultsListeners = []; // Extra listeners (e.g. MicroExpressionDetector)
    this._ready = false;
    this._lastFaceCount = 0;
  }

  /** Register an additional raw-results listener without re-registering onResults */
  addResultsListener(fn) {
    this._resultsListeners.push(fn);
  }

  async init() {
    if (!window.FaceMesh) {
      console.warn('[EyeTracking] MediaPipe FaceMesh not available on window');
      return false;
    }
    this._faceMesh = new window.FaceMesh({
      locateFile: (f) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
    });
    this._faceMesh.setOptions({
      maxNumFaces: 3,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    // Single onResults handler — dispatches to all listeners
    this._faceMesh.onResults((results) => {
      this._handleResults(results);
      for (const fn of this._resultsListeners) fn(results);
    });
    await this._faceMesh.initialize();
    this._ready = true;
    return true;
  }

  start(videoElement, onFrame) {
    if (!this._ready) return;
    this._videoEl = videoElement;
    this._onFrame = onFrame;
    this._intervalId = setInterval(() => this._capture(), INTERVAL_MS);
  }

  stop() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  getLastFaceCount() {
    return this._lastFaceCount;
  }

  async _capture() {
    if (!this._videoEl || this._videoEl.readyState < 2) return;
    this._canvas.width = this._videoEl.videoWidth || 320;
    this._canvas.height = this._videoEl.videoHeight || 240;
    this._ctx.drawImage(this._videoEl, 0, 0);
    await this._faceMesh.send({ image: this._canvas });
  }

  _handleResults(results) {
    const ts = Date.now();
    this._lastFaceCount = results.multiFaceLandmarks?.length ?? 0;
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      this._onFrame?.({ ts, gaze: 'away', awayAngleDeg: 90 });
      return;
    }

    const landmarks = results.multiFaceLandmarks[0];
    const gaze = this._classifyGaze(landmarks);
    this._onFrame?.(gaze);
  }

  _classifyGaze(landmarks) {
    const ts = Date.now();
    try {
      // Iris landmarks (requires refineLandmarks: true)
      // Left iris center: 468, Right iris center: 473
      // Left eye corners: 33 (outer), 133 (inner)
      // Right eye corners: 362 (outer), 263 (inner)
      const leftIris = landmarks[468];
      const rightIris = landmarks[473];
      const leftOuter = landmarks[33];
      const leftInner = landmarks[133];
      const rightOuter = landmarks[362];
      const rightInner = landmarks[263];

      // Gaze ratio for each eye: 0=far left, 1=far right, 0.5=center
      const leftRatio = leftIris
        ? (leftIris.x - leftOuter.x) / (leftInner.x - leftOuter.x)
        : 0.5;
      const rightRatio = rightIris
        ? (rightIris.x - rightInner.x) / (rightOuter.x - rightInner.x)
        : 0.5;
      const avgRatio = (leftRatio + rightRatio) / 2;

      // Vertical gaze
      const leftEyeTop = landmarks[159];
      const leftEyeBot = landmarks[145];
      const leftIrisY = leftIris?.y ?? 0.5;
      const vertRatio = leftEyeTop && leftEyeBot
        ? (leftIrisY - leftEyeTop.y) / (leftEyeBot.y - leftEyeTop.y)
        : 0.5;

      // Check eyes closed (blink)
      const eyeOpenRatio = leftEyeTop && leftEyeBot
        ? Math.abs(leftEyeBot.y - leftEyeTop.y)
        : 0.05;
      if (eyeOpenRatio < 0.01) {
        return { ts, gaze: 'closed' };
      }

      // Horizontal deviation from center
      const horzDeviation = Math.abs(avgRatio - 0.5);
      const vertDeviation = Math.abs(vertRatio - 0.5);
      const angleDeg = Math.sqrt(horzDeviation ** 2 + vertDeviation ** 2) * 180;

      if (angleDeg > AWAY_ANGLE_THRESHOLD) {
        return { ts, gaze: 'away', awayAngleDeg: Math.round(angleDeg) };
      }
      return { ts, gaze: 'screen' };
    } catch {
      return { ts, gaze: 'screen' };
    }
  }
}

export default EyeTrackingAnalyzer;
