# Case Study: Second Voice Detection Logic Enhancement

**Ngày**: 2026-04-08  
**Tác giả**: Case Study Analysis  
**Status**: 🔴 CRITICAL VULNERABILITY

---

## 📌 Vấn đề Hiện Tại

### Current Implementation (combatProctoring.js:426-471)

```javascript
_startSecondVoiceMonitor() {
  // Mỗi 200ms (SECOND_VOICE_TICK_MS)
  this.secondVoiceInterval = window.setInterval(() => {
    const state = this.getOrchestratorState?.() ?? ''
    const ttsPlaying = this.isAiSpeaking?.() ?? false
    const shouldRun =
      (state === 'CANDIDATE_THINKING' || state === 'CANDIDATE_SPEAKING') &&
      !ttsPlaying

    if (!shouldRun) {
      this.secondVoiceCounter = 0
      return
    }

    const vadResult = this.getVadResult?.()
    const rms = vadResult?.rmsLevel ?? 0
    const isSpeechDetected = rms > SPEECH_RMS_THRESHOLD (0.05)

    if (!isSpeechDetected) {
      this.secondVoiceCounter = Math.max(0, this.secondVoiceCounter - 1)
    } else if (state === 'CANDIDATE_THINKING') {
      // CASE 1: Tư duy có tiếng → chắc là người khác
      this.secondVoiceCounter += 1
    } else {
      // CASE 2: Ứng viên đang nói (CANDIDATE_SPEAKING)
      const lastTranscriptTs = this.getLastTranscriptTs?.() ?? 0
      const hasNewTranscript = lastTranscriptTs > Date.now() - 500
      if (!hasNewTranscript) {
        // Không có transcript → second voice
        this.secondVoiceCounter += 1
      } else {
        // Có transcript mới → là ứng viên
        this.secondVoiceCounter = Math.max(0, this.secondVoiceCounter - 1)
      }
    }

    if (this.secondVoiceCounter >= SECOND_VOICE_TICKS_TO_FLAG (25 ticks = 5s)) {
      this._enqueue({
        ts: Date.now(),
        type: 'SECOND_VOICE',
        severity: 'HIGH',
        metadata: { orchestratorState: state, rmsLevel: rms }
      })
      this.secondVoiceCounter = 0
    }
  }, SECOND_VOICE_TICK_MS)
}
```

### 🔴 Critical Flaw

**Scenario**: Người ngoài muốn giúp ứng viên
```
Timeline:
[T=0]     Ứng viên: "Đây là câu trả lời..."
          transcript → lastTranscriptTs = 0
          
[T=1s]    Người khác: "Nói thêm rằng... "
          transcript từ Whisper API (Speech-to-Text chỉ nhận âm)
          → lastTranscriptTs = 1000
          → counter RESET!
          
[T=2s]    Tiếp tục...
          hasNewTranscript = true
          → counter RESET!
          
Result: Counter luôn < 25, không bao giờ flag! 🚨
```

**Tại sao?**: Hệ thống chỉ dùng `lastTranscriptTs` để phân biệt. Nếu người khác nói theo pace của ứng viên → transcript liên tục → logic này vô dụng.

---

## 🧠 Các Yếu Tố Có Sẵn

### 1. **Voice Activity Detector (VoiceActivityDetector.js)**
- RMS level: đo intensity của âm thanh
- `SILENCE_THRESHOLD = 0.02`
- `SPEECH_THRESHOLD = 0.05`
- **Khả năng**: Có thể phát hiện **số người nói cùng lúc** (overlapping speech)

### 2. **Multimodal Engine (MultimodalEngine.js)**
- Eye tracking
- Filler word counter (từ cắt như "uh", "um")
- **Micro-expression detection** (facial expression buffer)
- **Key insight**: Expressiveness có thể khác khi người khác nói giúp

### 3. **Transcript Data**
- `lastTranscriptTs`: Thời điểm gần nhất có transcript
- Whisper API: Chỉ nhận và ghi âm, không biết ai nói

### 4. **Behavioral Session Data** (Từ EyeTrackingAnalyzer, MultimodalEngine)
```typescript
// Từ integrity-calculator.service.ts
const dominant = await this.correlationQuery.getSessionDominantExpression(behavioralSessionId)
// Có thể query: dominant expression, gaze pattern, filler rate, etc.
```

---

## 💡 Các Cách Cải Tiến

### **Approach 1: Voice Signature & Spectral Analysis**
**Ý tưởng**: Phân tích Frequency Domain thay vì chỉ RMS

```
Dữ liệu: VAD result có thể mở rộng để include FFT spectrum
Phát hiện:
- Fundamental frequency khác nhau
- Formant pattern (cấu trúc tần số đặc trưng của cộng)
- Vocal timbre shift

Ưu điểm: ✅ Khó giả mạo, ✅ Real-time
Nhược điểm: ❌ Phức tạp ML, ❌ Cần training voice model
```

### **Approach 2: Prosody + Linguistic Features**
**Ý tưởng**: Tần số say (pitch), speed, intonation của ứng viên vs người khác

```
Dữ liệu: 
- pitch extraction từ FFT
- speech rate từ filler word counter
- pause pattern từ silenceDurationMs

Logic:
1. Build candidate profile từ 30s đầu (CANDIDATE_SPEAKING state)
   → baseline pitch, speech rate
2. Khi detect second voice:
   → Compare pitch / rate shift
   → If > 15% deviation → likely second voice

Ưu điểm: ✅ ML-light, ✅ Không cần training
Nhược điểm: ⚠️ Có thể false positive (ứng viên thay đổi tone)
```

### **Approach 3: Behavioral Coherence**
**Ý tưởng**: Khi có second voice, behavior sẽ mất consistency

```
Dữ liệu:
- Gaze pattern (eye tracking)
- Facial expression (dominant expression từ MultimodalEngine)
- Filler word rate
- Speech duration

Logic:
1. Xây dựng "behavioral baseline" từ 1 phút đầu
   baseline = {
     avgGazeOnScreen: 85%,
     dominantExpr: 'focused',
     fillerRate: 0.12,
     avgSpeechDuration: 8s
   }

2. Khi second voice counter > 0:
   - Kiểm tra behavioral snapshot hiện tại
   - Nếu gaze shift (↓20%), expression mất focus → likely second voice
   - Nếu filler rate spikes (↑50%) → person changing

Ưu điểm: ✅ Holistic, ✅ Khó bypass (cần control full body)
Nhược điểm: ⚠️ Cần synchronize với eye tracking
```

### **Approach 4: Audio Fingerprinting (Advanced)**
**Ý tưởng**: Dùng ML model nhẹ để embedding voice → so sánh

```
Dữ liệu: Raw audio từ WebRTC stream
Dùng: TensorFlow.js speaker diarization model

Logic:
1. Lấy sample 2-3 câu đầu từ ứng viên
   → Generate voice embedding [256 dims]
2. Khi speech detect:
   → Generate embedding của speech hiện tại
   → cosine similarity > 0.8 → same speaker
   → < 0.8 → different speaker → flag

Ưu điểm: ✅ Cực chính xác, ✅ State-of-art
Nhược điểm: ❌ Heavy model (~5MB), ❌ Latency
```

---

## 📊 Comparison Matrix

| Approach | Accuracy | Complexity | Latency | Bypassable? | Best For |
|----------|----------|-----------|---------|-----------|----------|
| **1. Voice Signature** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | High | Very Hard | High-security exams |
| **2. Prosody** | ⭐⭐⭐ | ⭐⭐ | Very Low | Medium | Medium-security, quick flag |
| **3. Behavioral Coherence** | ⭐⭐⭐⭐ | ⭐⭐⭐ | Low | Hard | Holistic integrity |
| **4. Audio Fingerprinting** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Medium | Extremely Hard | Very high-security |

---

## 🎯 Khuyến Nghị Tối Ưu

### **Phase 1 (Quick Win)**: Prosody + Transcript Consistency Check

```javascript
// Thay vì chỉ check hasNewTranscript
// Cộng thêm:

const transcriptDensity = 
  recentTranscripts.filter(t => t.ts > Date.now() - 5000).length / (5000 / SECOND_VOICE_TICK_MS)

// Nếu transcript quá dense (>80%) + RMS stable → suspicious pattern
// Normal: ~40-50% ticks có transcript
// Anomaly: ~80%+ mỗi tick đều có transcript (người khác nói liên tục)

if (transcriptDensity > 0.75 && isSpeechDetected) {
  this.secondVoiceCounter += 2  // Boost!
}
```

### **Phase 2 (Medium-term)**: Behavioral Baseline

```javascript
// Khi CANDIDATE_SPEAKING state bắt đầu
// Snapshot baseline:

this.candidateBaseline = {
  avgGaze: multimodalEngine.getSnapshot().gazeOnScreenPercent,
  dominantExpr: multimodalEngine.getSnapshot().dominantExpression,
  avgPitch: vadResult?.estimatedPitch ?? 0,
  speechRate: fillerWordCounter.getRate()
}

// Khi second voice flag
// So sánh:

const deviation = {
  gaze: Math.abs(current.gaze - baseline.gaze),
  expr: current.expr !== baseline.expr ? 1 : 0,
  pitch: Math.abs(current.pitch - baseline.pitch) / baseline.pitch
}

// Confidence score
const suspicionScore = (deviation.gaze * 0.4 + deviation.expr * 0.3 + deviation.pitch * 0.3)
// Flag only if > 0.5
```

---

## ❓ Questions for Discussion

1. **What's the target security level?**
   - Medium (dùng Prosody)
   - High (Behavioral + Prosody)
   - Very High (Audio Fingerprinting)

2. **Latency constraint?**
   - Must be real-time (< 100ms)?
   - OK with batch check (< 1s)?

3. **False positive tolerance?**
   - Can we flag 10% false second-voice? (→ HR review)
   - Need < 5%?

4. **Data availability?**
   - Hiện tại có access Filler word data real-time?
   - Can we get pitch từ VAD?
   - EyeTracking always available?

---

## 🔗 Related Files

- `combatProctoring.js`: Client-side detection
- `VoiceActivityDetector.js`: VAD API
- `MultimodalEngine.js`: Behavioral snapshots
- `integrity-calculator.service.ts`: Backend scoring
- `CorrelationQueryService`: Behavioral queries

