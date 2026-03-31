/**
 * Task 4.2 — Face Detector (MediaPipe Face Detection)
 *
 * Lightweight face detection (bounding box only, NOT FaceMesh landmarks).
 * Dual-purpose:
 *   1. CombatPermissionGate — verify exactly 1 face before entering exam
 *   2. Proctoring Shield — continuous multi-face / no-face detection during exam
 *
 * Usage:
 *   await faceDetector.init();
 *   faceDetector.start(videoElement, ({ ts, faceCount, boxes }) => { ... });
 *   faceDetector.stop();
 */

const DEFAULT_INTERVAL_MS = 1000;
const CDN_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4.1646425229';

export class FaceDetector {
  constructor() {
    this._detection = null;
    this._intervalId = null;
    this._videoEl = null;
    this._canvas = null;
    this._ctx = null;
    this._onResult = null;
    this._ready = false;
    this._processing = false;
  }

  /**
   * Load MediaPipe Face Detection model.
   * Tries window.FaceDetection first (CDN script already loaded),
   * otherwise dynamically injects the CDN script.
   */
  async init() {
    if (this._ready) return true;

    // If not on window, load the CDN script
    if (!window.FaceDetection) {
      try {
        await this._loadScript(`${CDN_BASE}/face_detection.js`);
      } catch {
        console.warn('[FaceDetector] Failed to load MediaPipe Face Detection CDN');
        return false;
      }
    }

    if (!window.FaceDetection) {
      console.warn('[FaceDetector] MediaPipe FaceDetection not available');
      return false;
    }

    this._detection = new window.FaceDetection({
      locateFile: (f) => `${CDN_BASE}/${f}`,
    });
    this._detection.setOptions({
      model: 'short',
      minDetectionConfidence: 0.5,
    });
    this._detection.onResults((results) => this._handleResults(results));

    await this._detection.initialize();
    this._ready = true;
    return true;
  }

  /**
   * Start continuous face detection.
   * @param {HTMLVideoElement} videoElement
   * @param {(result: { ts: number, faceCount: number, boxes: Array }) => void} onResult
   * @param {number} intervalMs — capture interval (default 1000ms)
   */
  start(videoElement, onResult, intervalMs = DEFAULT_INTERVAL_MS) {
    if (!this._ready) return;
    this._videoEl = videoElement;
    this._onResult = onResult;
    this._canvas = document.createElement('canvas');
    this._ctx = this._canvas.getContext('2d');
    this._intervalId = setInterval(() => this._capture(), intervalMs);
    // Run first capture immediately
    this._capture();
  }

  stop() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    this._onResult = null;
    this._videoEl = null;
  }

  get ready() {
    return this._ready;
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  async _capture() {
    if (this._processing) return;
    if (!this._videoEl || this._videoEl.readyState < 2) return;

    this._processing = true;
    try {
      this._canvas.width = this._videoEl.videoWidth || 320;
      this._canvas.height = this._videoEl.videoHeight || 240;
      this._ctx.drawImage(this._videoEl, 0, 0);
      await this._detection.send({ image: this._canvas });
    } catch {
      // Frame dropped — non-fatal
    } finally {
      this._processing = false;
    }
  }

  _handleResults(results) {
    const detections = results.detections || [];
    this._onResult?.({
      ts: Date.now(),
      faceCount: detections.length,
      boxes: detections.map((d) => d.boundingBox),
    });
  }

  _loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        // Script tag exists, wait for load
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing.dataset.loaded === 'true') return resolve();
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.crossOrigin = 'anonymous';
      script.addEventListener('load', () => {
        script.dataset.loaded = 'true';
        resolve();
      }, { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.appendChild(script);
    });
  }
}

export const faceDetector = new FaceDetector();
export default FaceDetector;
