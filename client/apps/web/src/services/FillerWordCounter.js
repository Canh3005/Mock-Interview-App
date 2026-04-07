/**
 * Task 3.8 — Filler Word Counter
 * Reuse STT transcript stream (KHÔNG tạo SpeechRecognition mới).
 * Chỉ active khi orchestrator state = CANDIDATE_SPEAKING.
 */

const FILLER_WORDS_VI = [
  'ừm', 'ừ', 'ờ', 'à', 'ạ', 'thì', 'như là', 'kiểu như',
  'thì là', 'cái này', 'cái kia', 'ý là', 'tức là',
];
const FILLER_WORDS_EN = [
  'um', 'uh', 'like', 'you know', 'basically', 'literally',
  'kind of', 'sort of', 'right', 'actually', 'obviously',
];

const WINDOW_MS = 5000;

export class FillerWordCounter {
  constructor() {
    this._buffer = []; // { word, ts }
    this._wordCount = 0;
    this._windowStart = Date.now();
    this._frames = []; // FillerFrame[]
    this._flushTimer = null;
    this._onFrame = null; // (FillerFrame) => void
  }

  start(onFrame) {
    this._onFrame = onFrame;
    this._windowStart = Date.now();
    this._flushTimer = setInterval(() => this._flush(), WINDOW_MS);
  }

  stop() {
    if (this._flushTimer) {
      clearInterval(this._flushTimer);
      this._flushTimer = null;
    }
  }

  /** Gọi mỗi khi nhận được transcript mới từ STT */
  processTranscript(text) {
    if (!text) return;
    const words = text.toLowerCase().split(/\s+/);
    this._wordCount += words.length;

    const allFillers = [...FILLER_WORDS_VI, ...FILLER_WORDS_EN];
    const lower = text.toLowerCase();

    for (const filler of allFillers) {
      // Regex word boundary
      const regex = new RegExp(`\\b${filler.replace(/\s+/g, '\\s+')}\\b`, 'gi');
      const matches = lower.match(regex) ?? [];
      for (const match of matches) {
        this._buffer.push({ word: match, ts: Date.now() });
      }
    }
  }

  _flush() {
    const now = Date.now();
    const windowDurationMs = now - this._windowStart;
    const fillerCount = this._buffer.length;
    const fillerRate =
      this._wordCount > 0 ? fillerCount / this._wordCount : 0;
    const detectedFillers = [...new Set(this._buffer.map((b) => b.word))];

    const frame = {
      ts: now,
      windowDurationMs,
      fillerCount,
      fillerRate,
      detectedFillers,
    };

    this._frames.push(frame);
    this._onFrame?.(frame);

    // Reset window
    this._buffer = [];
    this._wordCount = 0;
    this._windowStart = now;
  }

  getFrames() {
    return [...this._frames];
  }

  reset() {
    this.stop();
    this._buffer = [];
    this._wordCount = 0;
    this._frames = [];
    this._windowStart = Date.now();
  }
}

export default FillerWordCounter;
