/**
 * Task 3.2 — TTS Fallback (Web Speech API)
 * Dùng khi Google TTS API fail hoặc không có API key.
 */
class TtsFallback {
  speak(text, lang = 'vi-VN') {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        resolve();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 1.0;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }

  stop() {
    window.speechSynthesis?.cancel();
  }
}

export const ttsFallback = new TtsFallback();
export default TtsFallback;
