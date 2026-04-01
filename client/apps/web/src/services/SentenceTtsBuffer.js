/**
 * Task 3.2 — Sentence-level TTS Streaming Buffer
 * Nhận từng token từ LLM stream, tách thành câu, TTS từng câu song song
 * để giảm latency (không cần đợi LLM xong mới nói).
 */
import { ttsPlayer } from './TtsPlayer';
import { ttsFallback } from './TtsFallback';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export class SentenceTtsBuffer {
  constructor() {
    this._textBuffer = '';
    this._audioQueue = [];
    this._isPlaying = false;
    this._fetchInFlight = 0;
    this._onFinished = null;
    this._stopped = false;
    this._hasStarted = false; // true sau khi _requestTts được gọi ít nhất 1 lần
    this._accessToken = null;
    this._voiceOptions = {};
    // Ordered slots to prevent out-of-order TTS playback
    this._slots = {};
    this._nextSlotIndex = 0;  // index assigned to next sentence
    this._playSlotIndex = 0;  // index of next slot to drain into queue
  }

  // Nếu set onFinished sau khi TTS đã xong → gọi ngay (tránh race condition)
  // Chỉ fire nếu _hasStarted=true để tránh false-positive ngay sau reset()
  get onFinished() { return this._onFinished; }
  set onFinished(fn) {
    this._onFinished = fn;
    if (fn && this._hasStarted && this._isDone()) {
      this._onFinished = null;
      fn();
    }
  }

  _isDone() {
    return (
      !this._isPlaying &&
      this._audioQueue.length === 0 &&
      this._fetchInFlight === 0 &&
      !this._stopped
    );
  }

  init(accessToken, voiceOptions = {}) {
    this._accessToken = accessToken;
    this._voiceOptions = voiceOptions;
    this._stopped = false;
  }

  /** Nhận từng token từ SSE stream */
  appendToken(token) {
    if (this._stopped) return;
    this._textBuffer += token;

    // Detect sentence boundary: . ? ! với khoảng trắng sau
    const match = this._textBuffer.match(/[.?!。？！]\s+/);
    if (match && match.index !== undefined) {
      const sentence = this._textBuffer
        .slice(0, match.index + match[0].length)
        .trim();
      this._textBuffer = this._textBuffer.slice(
        match.index + match[0].length,
      );
      if (sentence.length > 0) {
        this._requestTts(sentence);
      }
    }
  }

  /** Flush phần text còn lại khi LLM stream kết thúc */
  flush() {
    if (this._stopped) return;
    const remaining = this._textBuffer.trim();
    if (remaining.length > 0) {
      this._requestTts(remaining);
      this._textBuffer = '';
    }
  }

  async _requestTts(sentence) {
    this._hasStarted = true;
    this._fetchInFlight++;

    // Reserve ordered slot BEFORE async fetch so order is always preserved
    const slotIndex = this._nextSlotIndex++;
    this._slots[slotIndex] = null; // null = pending

    try {
      const res = await fetch(`${BASE_URL}/tts/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this._accessToken}`,
        },
        body: JSON.stringify({
          text: sentence,
          ...this._voiceOptions,
        }),
      });

      if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);
      const audioData = await res.arrayBuffer();

      if (!this._stopped) {
        this._slots[slotIndex] = { audioData, text: sentence };
        this._drainSlots();
      }
    } catch (err) {
      console.warn('[SentenceTtsBuffer] TTS fetch failed, using fallback:', err);
      if (!this._stopped) {
        this._slots[slotIndex] = { fallback: true, text: sentence };
        this._drainSlots();
      }
    } finally {
      this._fetchInFlight--;
      this._checkFinished();
    }
  }

  /** Drain completed slots into _audioQueue in order, blocked by any pending slot */
  _drainSlots() {
    while (
      this._playSlotIndex in this._slots &&
      this._slots[this._playSlotIndex] !== null
    ) {
      this._audioQueue.push(this._slots[this._playSlotIndex]);
      delete this._slots[this._playSlotIndex];
      this._playSlotIndex++;
    }
    if (!this._isPlaying) this._playNext();
  }

  async _playNext() {
    if (this._stopped || this._audioQueue.length === 0) {
      this._isPlaying = false;
      this._checkFinished();
      return;
    }
    this._isPlaying = true;
    const item = this._audioQueue.shift();

    if (item.fallback) {
      await ttsFallback.speak(item.text);
    } else {
      await ttsPlayer.play(item.audioData);
    }

    this._playNext();
  }

  _checkFinished() {
    if (this._isDone()) {
      const cb = this._onFinished;
      this._onFinished = null;
      cb?.();
    }
  }

  stop() {
    this._stopped = true;
    this._audioQueue = [];
    this._isPlaying = false;
    this._fetchInFlight = 0;
    ttsPlayer.stop();
    ttsFallback.stop();
  }

  /** Trả về Promise resolve khi toàn bộ TTS xong. Dùng với yield call() trong saga. */
  waitForFinish() {
    return new Promise((resolve) => {
      this.onFinished = resolve;
    });
  }

  reset() {
    this.stop();
    this._stopped = false;
    this._textBuffer = '';
    this._hasStarted = false;
    this._slots = {};
    this._nextSlotIndex = 0;
    this._playSlotIndex = 0;
  }
}

export const sentenceTtsBuffer = new SentenceTtsBuffer();
export default SentenceTtsBuffer;
