/**
 * Task 3.5 — Voice Activity Detector (VAD)
 * Dùng Web Audio API AnalyserNode để phát hiện im lặng / đang nói.
 */
const SILENCE_THRESHOLD = 0.02; // RMS dưới mức này = im lặng
const SPEECH_THRESHOLD = 0.05;  // RMS trên mức này = đang nói
const CHECK_INTERVAL_MS = 100;

export class VoiceActivityDetector {
  constructor(audioContext, stream) {
    this._analyser = audioContext.createAnalyser();
    this._analyser.fftSize = 512;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(this._analyser);

    this._silenceStart = null;
    this._intervalId = null;
    this.onSpeechStart = null;   // () => void
    this.onSilence = null;       // (durationMs) => void — gọi liên tục khi im lặng
  }

  /** Bắt đầu monitoring. onTick(result) gọi mỗi 100ms */
  start(onTick) {
    if (this._intervalId) return;
    this._intervalId = setInterval(() => {
      const result = this.detect();
      onTick?.(result);
      if (!result.isSpeaking) {
        this.onSilence?.(result.silenceDurationMs);
      } else if (result.isSpeaking && this._wasSilent) {
        this.onSpeechStart?.();
      }
      this._wasSilent = !result.isSpeaking;
    }, CHECK_INTERVAL_MS);
  }

  stop() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    this._silenceStart = null;
  }

  /** Snapshot tức thì — gọi theo yêu cầu */
  detect() {
    const dataArray = new Float32Array(this._analyser.fftSize);
    this._analyser.getFloatTimeDomainData(dataArray);
    const rms = Math.sqrt(
      dataArray.reduce((sum, v) => sum + v * v, 0) / dataArray.length,
    );

    if (rms < SILENCE_THRESHOLD) {
      if (!this._silenceStart) this._silenceStart = Date.now();
      return {
        isSpeaking: false,
        silenceDurationMs: Date.now() - this._silenceStart,
        rmsLevel: rms,
      };
    } else {
      this._silenceStart = null;
      return { isSpeaking: true, silenceDurationMs: 0, rmsLevel: rms };
    }
  }

  get isSpeaking() {
    return this.detect().isSpeaking;
  }
}

export default VoiceActivityDetector;
