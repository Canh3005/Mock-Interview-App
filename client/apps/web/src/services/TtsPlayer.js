/**
 * Task 3.2 — TTS Audio Player
 * Dùng Web Audio API để phát audio buffer (OGG/OPUS từ server).
 */
class TtsPlayer {
  constructor() {
    this._ctx = null;
    this._gainNode = null;
    this._currentSource = null;
  }

  _ensureContext() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._gainNode = this._ctx.createGain();
      this._gainNode.connect(this._ctx.destination);
    }
    // Resume if suspended (autoplay policy)
    if (this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
  }

  /** Play an ArrayBuffer of audio data. Resolves when playback ends. */
  play(audioData) {
    this._ensureContext();
    if (!audioData || audioData.byteLength === 0) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this._ctx.decodeAudioData(
        audioData.slice(0),
        (buffer) => {
          const source = this._ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(this._gainNode);
          this._currentSource = source;
          source.onended = () => {
            this._currentSource = null;
            console.debug('TTS playback ended');
            resolve();
          };
          source.start();
        },
        (_err) => {
          // Decode failed (e.g. empty/invalid data) — skip silently
          console.error('Failed to decode TTS audio data');
          resolve();
        },
      );
    });
  }

  stop() {
    if (this._currentSource) {
      try {
        this._currentSource.stop();
      } catch (_) {
        // Ignore if already stopped
      }
      this._currentSource = null;
    }
  }

  get isPlaying() {
    return this._currentSource !== null;
  }

  setVolume(level) {
    this._ensureContext();
    this._gainNode.gain.value = Math.max(0, Math.min(1, level));
  }
}

export const ttsPlayer = new TtsPlayer();
export default TtsPlayer;
