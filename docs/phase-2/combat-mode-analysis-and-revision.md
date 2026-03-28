# Phân tích & Chỉnh sửa Epic 3-4: Combat Mode — Trải nghiệm Phỏng vấn Thật

> **Tác giả:** System Architecture Review
> **Ngày:** 2026-03-28
> **Mục tiêu:** Đánh giá Epic 3 (Multimodal Engine) & Epic 4 (Proctoring Shield), xác định GAP so với mục tiêu "trải nghiệm phỏng vấn thật", và đề xuất chỉnh sửa toàn diện.

---

## I. ĐÁNH GIÁ TỔNG QUAN

### Điểm mạnh của thiết kế hiện tại

| Khía cạnh | Đánh giá |
|---|---|
| **Edge Computing** (Epic 3) | Xuất sắc — toàn bộ ML inference chạy client, server chỉ nhận JSON metadata. Đảm bảo privacy, giảm bandwidth, không phụ thuộc GPU server |
| **Silent Flagging** (Epic 4) | Rất tốt — không gây áp lực tâm lý cho ứng viên, giảm false-positive impact |
| **Graceful Degradation** (Task 4.7) | Tốt — IndexedDB + sendBeacon đảm bảo không mất data khi mất mạng |
| **Privacy-first** | Tốt — không lưu video, chỉ JSON metadata, tuân thủ GDPR |
| **Scoring pipeline thuần code** (Task 3.6) | Hợp lý — dùng formula cố định cho score, LLM chỉ sinh narrative feedback |

### 5 LỖ HỔNG NGHIÊM TRỌNG (Critical Gaps)

Epic 3-4 hiện tại chỉ thiết kế **lớp phân tích & giám sát thụ động** — chúng thu thập data từ camera/mic và chấm điểm sau phiên. Nhưng **hoàn toàn thiếu phần cốt lõi** để tạo trải nghiệm phỏng vấn thật:

---

### GAP 1: KHÔNG CÓ AI VOICE OUTPUT (TTS) — "Người phỏng vấn câm"

**Hiện trạng:** AI chỉ trả text qua SSE streaming. Ứng viên đọc text trên màn hình.

**Vấn đề:** Trong phỏng vấn thật, người phỏng vấn **nói**. Việc đọc text phá vỡ hoàn toàn illusion. Ứng viên phải liên tục nhìn xuống đọc → eye-tracking sẽ luôn là "LOOKING_AWAY" (nhìn vào text, không nhìn camera) → multimodal scoring bị sai lệch.

**Mức độ:** 🔴 Critical — Không có TTS thì không thể gọi là "trải nghiệm phỏng vấn thật".

---

### GAP 2: KHÔNG CÓ AUTO STAGE TRANSITION — "AI không chủ động"

**Hiện trạng:** User phải bấm "Next Stage" thủ công (`POST /behavioral/sessions/:id/next-stage`).

**Vấn đề:** Trong phỏng vấn thật, interviewer tự quyết định khi nào chuyển chủ đề. Ứng viên không bao giờ nói "ok giờ tôi muốn chuyển sang phần tiếp theo". Combat mode cần AI **tự chuyển stage** dựa trên:
- Đã đủ turns cho stage hiện tại
- Chất lượng câu trả lời (từ Socratic Probing) đã đạt hoặc candidate đã hit ceiling
- Thời gian stage đã hết budget

**Mức độ:** 🔴 Critical — UI-driven stage transition phá vỡ flow phỏng vấn thật.

---

### GAP 3: VOICE-TO-VOICE LOOP CHƯA ĐÓNG KÍN — "Nửa vời"

**Hiện trạng:**
- ✅ Ứng viên nói → STT (Web Speech API) → text → gửi BE
- ❌ BE trả text → ??? → không có đường nào biến thành voice cho ứng viên nghe

**Vấn đề:** Hiện tại flow là: Ứng viên nói → AI trả text → Ứng viên đọc text → Ứng viên nói lại. Đây là **voice-to-text**, không phải **voice-to-voice**. Để voice-to-voice, cần:
```
Ứng viên nói → STT → text → AI xử lý → text response → TTS → voice output → Ứng viên nghe
```

**Mức độ:** 🔴 Critical — Đây là yêu cầu cốt lõi.

---

### GAP 4: CAMERA DATA KHÔNG FEED VÀO AI BEHAVIOR — "Thu thập nhưng không dùng real-time"

**Hiện trạng:** Camera data (expression, eye-tracking) chỉ được thu thập để chấm điểm cuối phiên. AI interviewer không biết ứng viên đang stressed hay confused.

**Vấn đề:** Interviewer thật quan sát body language để điều chỉnh:
- Thấy candidate bối rối → rephrase câu hỏi
- Thấy candidate tự tin → tăng độ khó
- Thấy candidate stressed → nói chậm lại, cho thêm thời gian

**Mức độ:** 🟡 Important (không critical) — Là differentiator lớn nhưng có thể ship v1 không có.

---

### GAP 5: THIẾU INTERVIEW ORCHESTRATOR CHO COMBAT MODE — "Không có nhạc trưởng"

**Hiện trạng:** Behavioral session service quản lý flow nhưng theo kiểu request-response: user gửi message → AI trả lời. Không có concept về:
- **Turn-taking control** (AI quyết định khi nào nói, khi nào nghe)
- **Time budgeting** per stage (stage 1 nên chiếm bao nhiêu % tổng thời gian)
- **Silence handling** (ứng viên im lặng > 15s → AI phải react)
- **Interruption handling** (ứng viên nói xen khi AI đang "nói")

**Mức độ:** 🔴 Critical — Không có orchestrator thì combat mode chỉ là practice mode + camera.

---

## II. KIẾN TRÚC COMBAT MODE ĐỀ XUẤT

### Tầm nhìn: 3 lớp kiến trúc

```
┌─────────────────────────────────────────────────────────┐
│                   INTERACTION LAYER                      │
│  (Voice Loop, TTS/STT, Turn Control, Auto Transitions)  │
│  → Epic 3A (MỚI): Combat Voice Engine                   │
├─────────────────────────────────────────────────────────┤
│                   ANALYSIS LAYER                         │
│  (Eye-tracking, Filler Words, Micro-expressions)         │
│  → Epic 3B (HIỆN TẠI): Multimodal Analysis               │
├─────────────────────────────────────────────────────────┤
│                   SHIELD LAYER                           │
│  (Tab Monitor, Face Detection, Voice Detection)          │
│  → Epic 4 (HIỆN TẠI): Proctoring Shield                 │
└─────────────────────────────────────────────────────────┘
```

**Epic 3 hiện tại chỉ cover lớp Analysis.** Cần tách thành 3A (Interaction) + 3B (Analysis) hoặc gộp thêm tasks vào Epic 3.

---

## III. ĐỀ XUẤT CHI TIẾT — EPIC 3 REVISED

### Cấu trúc mới:

```
Epic 3: Combat Mode Core Engine
├── 3.0  Combat Interview Orchestrator (MỚI — nhạc trưởng)
├── 3.1  TTS Engine Integration (MỚI — AI nói)
├── 3.2  Voice-to-Voice Loop (MỚI — đóng kín loop)
├── 3.3  Auto Stage Transition (MỚI — AI tự chuyển stage)
├── 3.4  Silence & Interruption Handling (MỚI — xử lý edge case voice)
├── 3.5  Multimodal Engine Startup (HIỆN TẠI — Task 3.1)
├── 3.6  Eye-Tracking Analyzer (HIỆN TẠI — Task 3.2)
├── 3.7  Filler Word Counter (HIỆN TẠI — Task 3.3)
├── 3.8  Micro-Expression Detector (HIỆN TẠI — Task 3.4)
├── 3.9  Metrics Ingestion API (HIỆN TẠI — Task 3.5)
├── 3.10 Multimodal Scoring Pipeline (HIỆN TẠI — Task 3.6, mở rộng)
└── 3.11 Real-time Context Feed to AI (MỚI — camera data → AI behavior)
```

---

### Task 3.0: Combat Interview Orchestrator (MỚI)

**Mô tả:** Singleton service đóng vai "nhạc trưởng" điều phối toàn bộ combat session. Khác với practice mode (user-driven), combat mode là **AI-driven** — AI quyết định flow.

**Chi tiết công việc:**

1. **State Machine cho Combat Session:**
   ```ts
   type CombatState =
     | 'GREETING'           // AI chào và giới thiệu (30s)
     | 'STAGE_INTRO'        // AI giới thiệu stage mới (10s)
     | 'AI_ASKING'          // AI đang đặt câu hỏi (TTS playing)
     | 'CANDIDATE_THINKING' // Silence buffer sau câu hỏi (max 10s)
     | 'CANDIDATE_SPEAKING' // Ứng viên đang trả lời (STT active)
     | 'AI_PROCESSING'      // AI đang xử lý response
     | 'AI_FOLLOW_UP'       // AI hỏi follow-up (TTS playing)
     | 'STAGE_TRANSITION'   // Chuyển stage (AI nói transition phrase)
     | 'CLOSING'            // AI kết thúc phỏng vấn
     | 'COMPLETED';         // Phiên kết thúc

   interface CombatOrchestratorState {
     currentState: CombatState;
     currentStage: number;        // 1-6
     stageTimeBudget: number;     // ms — thời gian tối đa cho stage này
     stageElapsed: number;         // ms — đã dùng bao lâu
     turnsInStage: number;
     totalElapsed: number;         // ms — tổng thời gian phỏng vấn
     totalTimeBudget: number;      // ms — tổng budget (vd: 45 phút)
     silenceStartedAt: number | null;
   }
   ```

2. **Time Budgeting theo stage:**
   ```ts
   // Tổng 45 phút = 2,700,000ms
   const STAGE_TIME_ALLOCATION = {
     1: 0.15,  // Culture Fit: ~6.75 phút
     2: 0.20,  // Tech Stack: ~9 phút
     3: 0.20,  // Domain: ~9 phút
     4: 0.20,  // CV Deep-dive: ~9 phút
     5: 0.15,  // Soft Skills: ~6.75 phút
     6: 0.10,  // Reverse Interview: ~4.5 phút
   };
   ```

3. **Auto-transition logic:**
   ```ts
   function shouldTransitionStage(): boolean {
     // Điều kiện OR — bất kỳ điều kiện nào đúng thì chuyển
     return (
       stageElapsed >= stageTimebudget ||        // Hết time budget
       turnsInStage >= MAX_TURNS_PER_STAGE ||    // Đủ turns (4-6)
       drillDepthExhausted ||                     // Từ Socratic Probing: candidate hit ceiling
       offTopicCount >= 3                          // Candidate off-topic liên tục
     );
   }
   ```

4. **Event-driven architecture (FE):**
   ```ts
   // CombatOrchestrator phát events, UI subscribe
   orchestrator.on('stateChange', (newState: CombatState) => {
     switch (newState) {
       case 'AI_ASKING':
         // Disable mic, show AI speaking indicator
         break;
       case 'CANDIDATE_THINKING':
         // Show "Bạn có thể trả lời..." prompt, start thinking timer
         break;
       case 'CANDIDATE_SPEAKING':
         // Enable mic, start STT, show recording indicator
         break;
       case 'STAGE_TRANSITION':
         // Show transition animation, AI announces next stage
         break;
     }
   });
   ```

5. **Silence Handling:**
   ```ts
   // Khi ở state CANDIDATE_THINKING hoặc CANDIDATE_SPEAKING
   if (silenceDuration > 10_000) {
     // AI nhẹ nhàng: "Bạn cần thêm thời gian suy nghĩ không?"
     transitionTo('AI_FOLLOW_UP', { type: 'silence_prompt' });
   }
   if (silenceDuration > 30_000) {
     // AI: "Không sao, chúng ta sẽ chuyển sang câu hỏi tiếp theo nhé."
     transitionTo('AI_ASKING', { type: 'skip_question' });
   }
   ```

**Lưu ý kiến trúc:**
- Orchestrator chạy trên FE (client-side) vì cần phản hồi nhanh với voice events.
- BE vẫn quản lý session state, nhưng FE orchestrator ra quyết định khi nào gọi BE.
- Mỗi state change được log để replay/debug.

---

### Task 3.1: TTS Engine Integration (MỚI)

**Mô tả:** Tích hợp Text-to-Speech để AI interviewer "nói" thay vì chỉ hiện text. Đây là yếu tố then chốt tạo cảm giác phỏng vấn thật.

**Phân tích lựa chọn TTS:**

| Giải pháp | Latency | Chất lượng | Chi phí | Offline |
|---|---|---|---|---|
| **Web Speech API** (native) | ~100ms | Thấp-TB (robotic) | Free | ✅ |
| **OpenAI TTS** (`tts-1`) | 300-800ms | Cao (natural) | $15/1M chars | ❌ |
| **ElevenLabs** | 200-500ms | Rất cao | $5-99/mo | ❌ |
| **Google Cloud TTS** | 200-400ms | Cao | $4/1M chars | ❌ |
| **Coqui TTS** (self-hosted) | 100-300ms | TB-Cao | Infra cost | ✅ (server) |

**Đề xuất: Hybrid 2-tier approach:**

```
Tier 1 (Primary):   Cloud TTS API (OpenAI tts-1 hoặc Google Cloud TTS)
                     → Chất lượng cao, giọng tự nhiên
                     → Streaming support (chunked audio)

Tier 2 (Fallback):  Web Speech API (SpeechSynthesis)
                     → Khi mất mạng hoặc TTS API fail
                     → Chất lượng thấp hơn nhưng vẫn hoạt động
```

**Chi tiết công việc:**

1. **BE — TTS Proxy Service:**
   ```ts
   // server/src/tts/tts.service.ts
   @Injectable()
   export class TtsService {
     // Streaming TTS: nhận text từ LLM stream, convert thành audio chunks
     async streamTts(
       text: string,
       options: { voice: string; speed: number }
     ): AsyncGenerator<Buffer> {
       // Gọi OpenAI TTS API với streaming
       const response = await this.openai.audio.speech.create({
         model: 'tts-1',
         voice: options.voice,  // 'alloy', 'echo', 'nova'...
         input: text,
         response_format: 'opus',  // Nhẹ, streaming-friendly
         speed: options.speed,
       });
       // Yield audio chunks
       for await (const chunk of response.body) {
         yield chunk;
       }
     }
   }
   ```

2. **Sentence-level TTS streaming (quan trọng cho latency):**
   ```
   Vấn đề: Đợi LLM sinh xong toàn bộ text rồi mới TTS → delay 3-5s
   Giải pháp: TTS từng câu (sentence-level chunking)

   LLM Stream: "Câu hỏi tiếp theo. | Bạn có thể chia sẻ | về kinh nghiệm..."
                        ↓ (detect sentence boundary: ".", "?", "!")
                   TTS("Câu hỏi tiếp theo.") → Audio chunk 1 → Play immediately
                        ↓
                   TTS("Bạn có thể chia sẻ về kinh nghiệm...") → Audio chunk 2 → Queue
   ```

   ```ts
   // FE — Sentence buffer cho TTS
   class SentenceTtsBuffer {
     private buffer = '';
     private audioQueue: AudioBuffer[] = [];
     private isPlaying = false;

     // Nhận token từ SSE stream
     appendToken(token: string): void {
       this.buffer += token;

       // Detect sentence boundary
       const sentenceEnd = /[.?!。？！]\s*/;
       const match = this.buffer.match(sentenceEnd);
       if (match) {
         const sentence = this.buffer.slice(0, match.index! + match[0].length);
         this.buffer = this.buffer.slice(match.index! + match[0].length);
         this.requestTts(sentence);
       }
     }

     private async requestTts(sentence: string): Promise<void> {
       const audio = await fetch(`/api/tts/synthesize`, {
         method: 'POST',
         body: JSON.stringify({ text: sentence, sessionId }),
       });
       const audioBuffer = await audio.arrayBuffer();
       this.audioQueue.push(audioBuffer);
       if (!this.isPlaying) this.playNext();
     }

     private playNext(): void {
       if (this.audioQueue.length === 0) {
         this.isPlaying = false;
         this.onFinished?.(); // Notify orchestrator AI done speaking
         return;
       }
       this.isPlaying = true;
       const buffer = this.audioQueue.shift()!;
       playAudio(buffer).then(() => this.playNext());
     }
   }
   ```

3. **BE — TTS Endpoint:**
   ```ts
   // POST /api/tts/synthesize
   @Post('synthesize')
   async synthesize(@Body() dto: { text: string; voice?: string }) {
     const audioStream = this.ttsService.streamTts(dto.text, {
       voice: dto.voice || 'nova',
       speed: 1.0,
     });
     // Return audio/opus stream
     res.setHeader('Content-Type', 'audio/opus');
     for await (const chunk of audioStream) {
       res.write(chunk);
     }
     res.end();
   }
   ```

4. **Voice Selection dựa trên persona:**
   ```ts
   const VOICE_MAP = {
     // Giọng phù hợp với mỗi level persona
     junior: 'nova',    // Warm, friendly — phù hợp mentor tone
     mid: 'echo',       // Professional, neutral
     senior: 'onyx',    // Deep, authoritative — engineering manager
   };
   ```

5. **FE — Audio playback với Web Audio API:**
   ```ts
   class TtsPlayer {
     private audioContext: AudioContext;
     private gainNode: GainNode;

     async play(audioData: ArrayBuffer): Promise<void> {
       const buffer = await this.audioContext.decodeAudioData(audioData);
       const source = this.audioContext.createBufferSource();
       source.buffer = buffer;
       source.connect(this.gainNode);
       this.gainNode.connect(this.audioContext.destination);
       source.start();
       return new Promise(resolve => { source.onended = resolve; });
     }

     setVolume(level: number): void {
       this.gainNode.gain.value = level;
     }

     // Cho phép user điều chỉnh tốc độ (0.8x - 1.5x)
     setPlaybackRate(rate: number): void {
       // Áp dụng cho source nodes tiếp theo
     }
   }
   ```

**Quản trị rủi ro TTS:**

| Rủi ro | Giải pháp |
|---|---|
| TTS API latency cao (>1s) | Sentence-level chunking + preload câu đầu tiên |
| TTS API down | Fallback sang Web Speech API (SpeechSynthesis) |
| Chi phí TTS cao | Cache câu hỏi opening/transition (reusable), chỉ TTS phần dynamic |
| Giọng TTS không tự nhiên tiếng Việt | Dùng Google Cloud TTS (hỗ trợ vi-VN tốt) hoặc ElevenLabs multilingual |
| Audio overlap khi user nói xen | Orchestrator dừng TTS khi detect user speech (barge-in) |

---

### Task 3.2: Voice-to-Voice Communication Loop (MỚI)

**Mô tả:** Đóng kín vòng lặp giao tiếp voice: AI hỏi (TTS) → Ứng viên nghe → Ứng viên trả lời (STT) → AI xử lý → AI phản hồi (TTS) → lặp lại.

**Chi tiết công việc:**

1. **Full Voice Loop Sequence:**
   ```
   ┌─────────────────────────────────────────────────────────┐
   │ 1. AI_ASKING                                            │
   │    Orchestrator triggers AI question                     │
   │    → LLM generates text (SSE stream)                    │
   │    → SentenceTtsBuffer converts to audio                │
   │    → TtsPlayer plays audio                              │
   │    → Mic DISABLED (avoid feedback loop)                  │
   │    → Text cũng hiện trên screen (subtitle mode)          │
   ├─────────────────────────────────────────────────────────┤
   │ 2. CANDIDATE_THINKING                                   │
   │    TTS audio ends → onFinished callback                  │
   │    → Short beep/visual cue: "Your turn"                  │
   │    → Mic stays OFF for 2s (thinking buffer)              │
   │    → Timer hiển thị (max 10s thinking time)              │
   ├─────────────────────────────────────────────────────────┤
   │ 3. CANDIDATE_SPEAKING                                   │
   │    → Mic ON, STT starts (continuous mode)                │
   │    → Real-time transcript hiện trên screen               │
   │    → Voice Activity Detection (VAD) monitors silence     │
   │    → Nếu silence > 3s: auto-stop STT, transition tiếp   │
   │    → Nếu user bấm "Done" / nói "xong": stop ngay        │
   ├─────────────────────────────────────────────────────────┤
   │ 4. AI_PROCESSING                                        │
   │    → STT transcript gửi lên BE                           │
   │    → Show "AI đang suy nghĩ..." indicator                │
   │    → BE processes: quality check → LLM → response        │
   │    → Response stream bắt đầu                             │
   ├─────────────────────────────────────────────────────────┤
   │ 5. AI_FOLLOW_UP (hoặc STAGE_TRANSITION)                 │
   │    → Quay lại bước 1 với câu hỏi tiếp                   │
   └─────────────────────────────────────────────────────────┘
   ```

2. **Hybrid Mode (Text-to-Voice):**
   ```ts
   // Ứng viên chọn input mode, AI luôn output voice
   type CombatInputMode = 'voice' | 'text';
   type CombatOutputMode = 'voice+text'; // AI luôn có cả 2

   // Nếu user chọn text input:
   // - Mic OFF, user gõ text
   // - AI vẫn output voice (TTS) + text (subtitle)
   // - Voice loop vẫn hoạt động, chỉ input channel khác

   // Nếu user chọn voice input:
   // - Full voice-to-voice experience
   // - Text hiển thị dạng subtitle (assistive)
   ```

3. **Barge-in Handling (Ứng viên nói xen khi AI đang nói):**
   ```ts
   // Trong CANDIDATE_SPEAKING hoặc CANDIDATE_THINKING state
   // nếu VAD detect voice activity trong khi TTS đang play:
   function handleBargeIn(): void {
     ttsPlayer.stop();                    // Dừng AI nói
     orchestrator.transition('CANDIDATE_SPEAKING');
     // Ghi nhận incomplete AI utterance
     logEvent({ type: 'BARGE_IN', aiUtteranceCompleted: false });
   }
   ```

4. **Echo Cancellation:**
   ```ts
   // Khi AI đang phát audio qua speaker, mic sẽ bắt được echo
   // Giải pháp:
   // 1. Mic OFF khi TTS đang play (primary — đơn giản, reliable)
   // 2. Nếu cần barge-in: dùng echoCancellation constraint
   const stream = await navigator.mediaDevices.getUserMedia({
     audio: {
       echoCancellation: true,
       noiseSuppression: true,
       autoGainControl: true,
     }
   });
   ```

5. **Dual Display Mode:**
   ```
   ┌──────────────────────────────────────┐
   │  🎥 Camera Preview (nhỏ, góc trên)   │
   │                                       │
   │  ┌─────────────────────────────┐      │
   │  │   AI Interviewer Avatar      │      │
   │  │   [Animated speaking icon]   │      │
   │  │   "Bạn có thể chia sẻ..."   │ ← subtitle
   │  └─────────────────────────────┘      │
   │                                       │
   │  ┌─────────────────────────────┐      │
   │  │ 🎤 Đang nghe...              │      │
   │  │ "Dạ, trong dự án trước..."   │ ← real-time transcript
   │  └─────────────────────────────┘      │
   │                                       │
   │  [Stage 2/6] ████░░░ 12:30 remaining │
   └──────────────────────────────────────┘
   ```

---

### Task 3.3: Auto Stage Transition Engine (MỚI)

**Mô tả:** AI tự động chuyển stage mà không cần user bấm nút. Transition diễn ra tự nhiên như interviewer thật.

**Chi tiết công việc:**

1. **Decision logic (chạy trên BE sau mỗi AI response):**
   ```ts
   // server/src/combat/combat-transition.service.ts
   @Injectable()
   export class CombatTransitionService {
     async evaluateTransition(
       session: BehavioralSession,
       currentStageMetrics: StageMetrics,
     ): Promise<TransitionDecision> {
       const { turnsInStage, stageElapsed, timeBudget, drillDepth } = currentStageMetrics;

       // Hard limits — chuyển bắt buộc
       if (stageElapsed >= timeBudget) {
         return { shouldTransition: true, reason: 'TIME_BUDGET_EXCEEDED' };
       }
       if (turnsInStage >= MAX_TURNS[session.candidateLevel]) {
         return { shouldTransition: true, reason: 'MAX_TURNS_REACHED' };
       }

       // Soft signals — hỏi LLM quyết định
       // (inject vào system prompt, LLM trả metadata "should_advance": true/false)
       if (drillDepth >= 3 && lastResponseQuality === 'shallow') {
         return { shouldTransition: true, reason: 'CANDIDATE_CEILING_REACHED' };
       }

       return { shouldTransition: false };
     }
   }
   ```

2. **Natural transition phrases (AI nói):**
   ```ts
   const TRANSITION_PHRASES = {
     TIME_BUDGET: [
       "Được rồi, cảm ơn bạn về phần chia sẻ vừa rồi. Bây giờ mình muốn chuyển sang một chủ đề khác nhé.",
       "Rất hay. Mình ghi nhận phần này. Giờ mình sẽ hỏi bạn về một khía cạnh khác.",
     ],
     CEILING_REACHED: [
       "OK, mình hiểu rồi. Chúng ta sẽ chuyển sang phần tiếp theo nhé.",
       "Được, mình đã nắm được quan điểm của bạn. Giờ mình muốn tìm hiểu thêm về...",
     ],
     NATURAL_FLOW: [
       "Nói về {topic} làm mình nghĩ đến một câu hỏi liên quan. Trong vai trò của bạn...",
     ],
   };
   ```

3. **BE response metadata mở rộng:**
   ```json
   // SSE final event bây giờ bao gồm:
   {
     "done": true,
     "meta": {
       "starStatus": { "S": true, "T": true, "A": false, "R": false },
       "stageTransition": {
         "shouldTransition": true,
         "reason": "TIME_BUDGET_EXCEEDED",
         "nextStage": 3,
         "transitionPhrase": "Được rồi, cảm ơn bạn..."
       }
     }
   }
   ```

4. **FE Orchestrator xử lý transition:**
   ```ts
   // Khi nhận stageTransition signal từ BE
   if (meta.stageTransition?.shouldTransition) {
     orchestrator.transition('STAGE_TRANSITION');
     // TTS nói transition phrase
     await ttsBuffer.appendText(meta.stageTransition.transitionPhrase);
     await ttsPlayer.waitUntilDone();
     // Gọi BE next-stage
     await api.nextStage(sessionId);
     // AI tự hỏi câu đầu tiên của stage mới
     orchestrator.transition('AI_ASKING');
   }
   ```

---

### Task 3.4: Silence & Interruption Handling (MỚI)

**Mô tả:** Xử lý các edge case trong voice communication — im lặng kéo dài, tiếng ồn, ứng viên nói xen.

**Chi tiết công việc:**

1. **Voice Activity Detection (VAD):**
   ```ts
   class VoiceActivityDetector {
     private analyser: AnalyserNode;
     private silenceStart: number | null = null;
     private readonly SILENCE_THRESHOLD = 0.02; // RMS threshold
     private readonly SPEECH_THRESHOLD = 0.05;

     // Gọi mỗi 100ms
     detect(): VadResult {
       const rms = this.calculateRMS();
       if (rms < this.SILENCE_THRESHOLD) {
         if (!this.silenceStart) this.silenceStart = Date.now();
         return {
           isSpeaking: false,
           silenceDurationMs: Date.now() - this.silenceStart,
         };
       } else {
         this.silenceStart = null;
         return { isSpeaking: true, silenceDurationMs: 0 };
       }
     }
   }
   ```

2. **Silence Escalation Protocol:**
   ```
   Silence 0-5s:    Bình thường (candidate đang nghĩ)
   Silence 5-10s:   Hiện visual hint nhẹ: "Bạn có thể bắt đầu trả lời..."
   Silence 10-20s:  AI prompt nhẹ (TTS): "Bạn cần mình nhắc lại câu hỏi không?"
   Silence 20-30s:  AI offer skip: "Không sao, chúng ta có thể chuyển sang câu khác."
   Silence > 30s:   Auto-skip, log as 'NO_RESPONSE', move to next question
   ```

3. **Interruption Categories:**
   ```ts
   type InterruptionType =
     | 'BARGE_IN'           // User nói khi AI đang nói → Dừng TTS, chuyển sang nghe
     | 'BACKGROUND_NOISE'   // Tiếng ồn nhưng không phải speech → Ignore
     | 'CLARIFICATION'      // "Xin lỗi, bạn có thể nhắc lại?" → AI repeat
     | 'DONE_SIGNAL'        // "Xong rồi", "Hết rồi" → Stop STT, AI responds
     ;
   ```

4. **Auto-send khi user dừng nói:**
   ```ts
   // Thay vì user phải bấm "Send":
   // Khi VAD detect silence > 3s sau khi user đã nói ít nhất 5 từ:
   //   → Auto-finalize transcript
   //   → Gửi lên BE
   //   → Transition sang AI_PROCESSING

   // Configurable: user có thể tắt auto-send, bấm thủ công
   ```

---

### Task 3.11: Real-time Context Feed to AI (MỚI)

**Mô tả:** Inject multimodal signals (expression, gaze) vào AI context để AI điều chỉnh behavior real-time, giống interviewer thật.

**Chi tiết công việc:**

1. **Aggregated context mỗi turn (không phải mỗi frame):**
   ```ts
   // Trước khi gửi user message lên BE, FE đính kèm context snapshot
   interface MultimodalContext {
     dominantExpression: MicroExpression;  // 'stressed' | 'confident' | 'neutral'
     expressionConfidence: number;
     gazeOnScreenPercent: number;           // % time nhìn camera trong turn này
     fillerRate: number;                    // Filler rate trong turn này
     speakingPace: 'slow' | 'normal' | 'fast';  // Words per minute
     turnDurationMs: number;
   }
   ```

2. **BE inject vào system prompt (lightweight):**
   ```ts
   // Chỉ inject khi có signal đáng chú ý, không phải mọi turn
   function buildMultimodalHint(ctx: MultimodalContext): string | null {
     const hints: string[] = [];

     if (ctx.dominantExpression === 'stressed' && ctx.expressionConfidence > 0.7) {
       hints.push('Candidate appears stressed — consider using a warmer tone and give more time.');
     }
     if (ctx.gazeOnScreenPercent < 40) {
       hints.push('Candidate frequently looks away — they might be reading notes.');
     }
     if (ctx.speakingPace === 'fast' && ctx.fillerRate > 0.15) {
       hints.push('Candidate is speaking quickly with many filler words — they may be nervous. Slow down your pace.');
     }

     return hints.length > 0
       ? `\n[Observation: ${hints.join(' ')}]`
       : null;
   }
   ```

3. **Nguyên tắc:**
   - Hint là **suggestion**, không phải command. LLM tự quyết định có dùng hay không.
   - Không gửi raw data (landmarks, RMS levels) — chỉ gửi human-readable hint.
   - Rate-limit: Tối đa 1 hint mỗi 2 turns để không pollute context.

---

## IV. ĐỀ XUẤT CHI TIẾT — EPIC 4 REVISED

### Cấu trúc mới (giữ nguyên + bổ sung):

```
Epic 4: Proctoring Shield
├── 4.1  Tab/Focus Monitoring (HIỆN TẠI — giữ nguyên)
├── 4.2  Multi-Face Detection (HIỆN TẠI — giữ nguyên)
├── 4.3  Second Voice Detection (HIỆN TẠI — cần chỉnh sửa)
├── 4.4  Proctoring Event Ingestion API (HIỆN TẠI — giữ nguyên)
├── 4.5  Integrity Score Calculator (HIỆN TẠI — mở rộng)
├── 4.6  Proctoring Status Indicator (HIỆN TẠI — giữ nguyên)
├── 4.7  Graceful Degradation (HIỆN TẠI — giữ nguyên)
├── 4.8  AI TTS vs Second Voice Disambiguation (MỚI)
└── 4.9  Screen Recording Detection (MỚI — optional)
```

### Chỉnh sửa Task 4.3: Second Voice Detection

**Vấn đề hiện tại:** Task 4.3 thiết kế detect second voice bằng cách kiểm tra "có audio nhưng không có STT transcript". Nhưng khi thêm TTS (Task 3.1), **AI speaker output sẽ tạo audio feedback vào mic** → false positive liên tục.

**Chỉnh sửa:**

```ts
// TRƯỚC (sẽ false positive với TTS):
if (isSpeaking && !hasTranscript) {
  flagPotentialSecondVoice(); // ❌ AI TTS cũng trigger này
}

// SAU (có TTS-awareness):
if (isSpeaking && !hasTranscript && !ttsPlayer.isCurrentlyPlaying) {
  // Chỉ flag khi:
  // 1. Có âm thanh từ mic
  // 2. STT không nhận ra transcript
  // 3. AI KHÔNG đang phát TTS (nếu AI đang nói thì mic bắt được là bình thường)
  flagPotentialSecondVoice();
}

// Hoặc tốt hơn: Mic OFF khi TTS playing (đã đề cập ở Task 3.2)
// → Loại bỏ hoàn toàn vấn đề echo
```

**Thêm logic:**
```ts
// State diagram cho second voice detection:
// 1. Khi orchestrator.state === 'AI_ASKING': Mic OFF → Không detect
// 2. Khi orchestrator.state === 'CANDIDATE_SPEAKING': Mic ON → Detect active
// 3. Khi orchestrator.state === 'CANDIDATE_THINKING': Mic OFF nhưng VAD vẫn chạy
//    → Nếu detect voice trong khi candidate đang "nghĩ" → Possible second voice
```

---

### Task 4.8: AI TTS vs External Voice Disambiguation (MỚI)

**Mô tả:** Khi hệ thống có TTS output, cần phân biệt: âm thanh từ AI speaker vs tiếng nói người thứ 2 trong phòng.

**Chi tiết công việc:**

1. **Primary approach — Mic muting:**
   ```ts
   // Đơn giản và hiệu quả nhất:
   // Khi TTS đang phát → Mic stream bị mute (gainNode.gain.value = 0)
   // → Mọi audio analysis pause
   // → Khi TTS kết thúc → Mic unmute, resume analysis
   // → 200ms buffer sau khi TTS kết thúc (echo decay)
   ```

2. **Secondary approach — Audio fingerprinting (nếu cần barge-in):**
   ```ts
   // Nếu cho phép user nói xen khi AI đang nói (barge-in mode):
   // Cần phân biệt AI TTS audio vs human voice
   // → So sánh frequency spectrum: TTS output có pattern ổn định,
   //   human voice có variation lớn hơn
   // → Dùng cross-correlation giữa TTS output buffer và mic input
   //   → High correlation = echo from speaker → Ignore
   //   → Low correlation = independent voice source → Flag or process
   ```

3. **State tracking:**
   ```ts
   interface AudioSourceState {
     ttsPlaying: boolean;
     ttsEndedAt: number | null;
     micMuted: boolean;
     echoDecayMs: 200;         // Wait 200ms after TTS ends before analyzing mic
   }
   ```

---

### Chỉnh sửa Task 4.5: Integrity Score Calculator — Mở rộng

**Bổ sung scoring inputs từ multimodal data:**

```ts
// HIỆN TẠI: Chỉ dựa trên proctoring events (tab switch, multi-face, second voice)
// MỞ RỘNG: Kết hợp với multimodal signals để tăng accuracy

interface EnrichedIntegrityInput {
  // Proctoring events (hiện tại)
  proctoringFlags: ProctoringFlag[];

  // Multimodal correlation signals (mới)
  gazeCorrelation: {
    // Khi tab bị ẩn, ứng viên có quay lại nhìn camera không?
    // → Nếu tab hidden nhưng gaze vẫn "screen" → có thể false positive
    tabHiddenButGazeOnScreen: number;  // count — có thể dismiss flag
    // Khi có second voice, expression có chuyển thành "uncertain" không?
    // → Correlation cao = có thể thật sự đang nhờ người khác
    secondVoiceWithUncertainExpression: number;
  };

  // Response quality correlation
  responseQuality: {
    // Nếu câu trả lời quality tăng đột biến sau khi tab hidden
    // → Suspicious: có thể đã tra cứu đáp án
    qualitySpikeAfterTabSwitch: boolean;
  };
}
```

**Điểm integrity mới:**
```
Base score: 100

Deductions (hiện tại):
  TAB_HIDDEN > 10s:       -15 (HIGH)
  MULTIPLE_FACES > 3s:    -15 (HIGH)
  SECOND_VOICE > 5s:      -15 (HIGH)
  NO_FACE > 15s:          -7  (MEDIUM)
  TAB_HIDDEN 3-10s:       -7  (MEDIUM)
  WINDOW_BLUR < 3s:       -2  (LOW)

Mitigations (MỚI — giảm bớt deduction nếu có evidence ngược):
  Tab hidden nhưng gaze on screen:  +5 per occurrence (max +10)
  Flag isolated, no pattern:         +3 (single occurrence, không lặp lại)

Aggravations (MỚI — tăng deduction nếu có correlation):
  Quality spike after tab switch:    -10 thêm
  Second voice + uncertain expression: -5 thêm
  Multiple flag types trong cùng 30s window: -10 (pattern suspicious)
```

---

## V. TỔNG HỢP — COMBAT MODE FULL EXPERIENCE FLOW

```
══════════════════════════════════════════════════════════════
                    COMBAT MODE FLOW
══════════════════════════════════════════════════════════════

1. PRE-INTERVIEW
   ├── Preflight check (CV + JD ready)
   ├── Mode Selection → Combat
   ├── Permission Gate (webcam + mic + speaker test)
   ├── Preload: MediaPipe WASM + TTS voice model warm-up
   └── Session Init → sessionId

2. INTERVIEW START
   ├── Multimodal Engine starts (eye-tracking, expression, filler)
   ├── Proctoring Shield activates (tab monitor, face detection)
   ├── Combat Orchestrator initializes state machine
   ├── AI Greeting (TTS):
   │   "Xin chào [Tên], tôi là [AI Name], hôm nay tôi sẽ phỏng vấn
   │    bạn cho vị trí [Job Title]. Buổi phỏng vấn sẽ kéo dài khoảng
   │    45 phút với 6 phần. Bạn đã sẵn sàng chưa?"
   └── Wait for candidate response ("Sẵn sàng" / nod)

3. INTERVIEW LOOP (6 stages × N turns)
   ┌──────────────────────────────────────────────────────┐
   │  STAGE_INTRO:                                         │
   │    AI (TTS): "Phần tiếp theo, mình muốn tìm hiểu     │
   │    về [stage topic]..."                                │
   │                                                       │
   │  AI_ASKING:                                           │
   │    AI generates question → TTS plays audio             │
   │    Subtitle hiện trên screen                           │
   │    Mic OFF (avoid echo)                                │
   │    Multimodal: track expression during question        │
   │                                                       │
   │  CANDIDATE_THINKING:                                  │
   │    Visual cue: "Your turn" + thinking timer            │
   │    Max 10s silence before AI prompts                   │
   │                                                       │
   │  CANDIDATE_SPEAKING:                                  │
   │    Mic ON → STT → real-time transcript                 │
   │    VAD monitors for end-of-speech (3s silence)         │
   │    Multimodal: track gaze, expression, filler words    │
   │    Proctoring: face detection, second voice check      │
   │                                                       │
   │  AI_PROCESSING:                                       │
   │    Transcript → BE                                     │
   │    Quality check + Relevance check                     │
   │    Multimodal context hint injected (if significant)   │
   │    LLM generates response                              │
   │                                                       │
   │  AI_FOLLOW_UP (or STAGE_TRANSITION):                  │
   │    Check: shouldTransitionStage()?                     │
   │    If no → Loop back to AI_ASKING with follow-up       │
   │    If yes → Natural transition → next stage            │
   └──────────────────────────────────────────────────────┘

4. INTERVIEW END
   ├── AI Closing (TTS):
   │   "Cảm ơn bạn đã dành thời gian hôm nay. Phần phỏng vấn
   │    đã hoàn tất. Kết quả sẽ được gửi cho bạn trong ít phút."
   ├── Multimodal Engine stops
   ├── Proctoring Shield final flush
   ├── Trigger scoring pipelines:
   │   ├── Behavioral scoring (LLM evaluation)
   │   ├── Multimodal scoring (eye + filler + expression)
   │   └── Integrity scoring (proctoring events + correlation)
   └── Navigate to Scorecard (polling for results)

5. SCORECARD (Enhanced for Combat)
   ├── Overall Score: XX/100
   ├── Breakdown by stage (radar chart)
   ├── STAR Analysis
   ├── Soft Skills (from multimodal): eye contact, fluency, confidence
   ├── Integrity Badge: CLEAN / MINOR_FLAGS / SUSPICIOUS
   ├── Communication Insights:
   │   ├── Speaking pace trend (nervous start → calm finish?)
   │   ├── Top filler words
   │   └── Expression timeline (stress map)
   └── Actionable Feedback (AI-generated narrative)

══════════════════════════════════════════════════════════════
```

---

## VI. PRIORITY IMPLEMENTATION ROADMAP

### Phase A: Voice Foundation (PHẢI LÀM ĐẦU TIÊN)
```
Ưu tiên: 🔴 Critical
Timeline: Sprint 1-2

Tasks:
  3.0  Combat Interview Orchestrator (state machine)
  3.1  TTS Engine Integration (sentence-level streaming)
  3.2  Voice-to-Voice Loop (close the loop)
  3.4  Silence & Interruption Handling

Kết quả: AI có thể "nói" và nghe candidate trả lời qua voice.
         Flow phỏng vấn chạy tự động, AI-driven.
```

### Phase B: Auto-Intelligence (LÀM TIẾP)
```
Ưu tiên: 🔴 Critical
Timeline: Sprint 2-3

Tasks:
  3.3  Auto Stage Transition Engine
  4.8  AI TTS vs Second Voice Disambiguation

Kết quả: AI tự chuyển stage. Proctoring hoạt động đúng với TTS.
```

### Phase C: Multimodal Analysis (HIỆN TẠI EPIC 3)
```
Ưu tiên: 🟡 Important
Timeline: Sprint 3-4

Tasks:
  3.5  Multimodal Engine Startup (hiện tại 3.1)
  3.6  Eye-Tracking Analyzer (hiện tại 3.2)
  3.7  Filler Word Counter (hiện tại 3.3)
  3.8  Micro-Expression Detector (hiện tại 3.4)
  3.9  Metrics Ingestion API (hiện tại 3.5)

Kết quả: Camera & mic phân tích soft-skills.
```

### Phase D: Proctoring & Scoring (HIỆN TẠI EPIC 4)
```
Ưu tiên: 🟡 Important
Timeline: Sprint 4-5

Tasks:
  4.1-4.7  Toàn bộ Epic 4 hiện tại
  3.10     Multimodal Scoring Pipeline
  3.11     Real-time Context Feed to AI

Kết quả: Chống gian lận + scoring tổng hợp hoàn chỉnh.
```

---

## VII. SO SÁNH TRƯỚC & SAU

| Khía cạnh | Epic 3-4 Hiện tại | Epic 3-4 Sau chỉnh sửa |
|---|---|---|
| **AI output** | Text only | Voice (TTS) + Text subtitle |
| **Communication** | User-driven (bấm send) | AI-driven (voice loop tự động) |
| **Stage transition** | Manual (user bấm nút) | Automatic (AI quyết định) |
| **Silence handling** | Không có | 4-level escalation protocol |
| **Camera data usage** | Chỉ scoring cuối phiên | Real-time hints cho AI + scoring |
| **Proctoring + TTS** | Không xét conflict | TTS-aware detection |
| **Trải nghiệm** | Practice mode + camera | Phỏng vấn thật — AI nói, tự hỏi, tự chuyển topic |
| **Input mode** | Voice OR text | Voice-to-voice HOẶC Text-to-voice (AI luôn nói) |

---

## VIII. RỦI RO KỸ THUẬT & GIẢI PHÁP

| # | Rủi ro | Impact | Giải pháp |
|---|---|---|---|
| 1 | TTS latency tạo dead air giữa câu | Cao | Sentence-level TTS streaming, preload câu chào/transition |
| 2 | TTS cost scale lên nhanh | TB | Cache reusable phrases, dùng Web Speech API cho fallback |
| 3 | Echo/feedback loop giữa TTS và mic | Cao | Mic muting khi TTS play, 200ms echo decay buffer |
| 4 | Web Speech API STT không ổn định trên mọi browser | TB | Feature detection + fallback sang Whisper API nếu cần |
| 5 | Orchestrator state desync giữa FE và BE | Cao | BE là source of truth, FE sync qua response metadata |
| 6 | Auto-transition cắt ngang ý chưa xong | TB | Grace period 5s sau khi candidate dừng nói mới transition |
| 7 | MediaPipe + TTS + STT cùng chạy → CPU overload | Cao | Giảm Face Mesh xuống 1fps, TTS decode dùng Web Worker |
| 8 | Tiếng Việt TTS chất lượng kém | TB | Dùng Google Cloud TTS (vi-VN tốt nhất) hoặc ElevenLabs multilingual v2 |
| 9 | User dùng headphone → second voice detect fail | Thấp | Headphone actually giúp — loại bỏ TTS echo, mic chỉ bắt human voice |
| 10 | Realtime context hints làm LLM confused | Thấp | Rate-limit 1 hint/2 turns, dùng observation format rõ ràng |

---

## IX. KẾT LUẬN

Epic 3-4 hiện tại thiết kế rất tốt cho **lớp phân tích & giám sát**, nhưng thiếu hoàn toàn **lớp tương tác voice** — thứ tạo nên trải nghiệm phỏng vấn thật. Cần bổ sung:

1. **TTS Engine** — AI phải "nói" được
2. **Combat Orchestrator** — State machine điều phối toàn bộ flow
3. **Voice Loop** — Đóng kín vòng lặp voice-to-voice
4. **Auto Transition** — AI chủ động chuyển stage
5. **TTS-aware Proctoring** — Cập nhật detection logic khi có TTS

Sau khi bổ sung, Combat Mode sẽ tạo trải nghiệm: ứng viên ngồi trước máy tính, AI interviewer hỏi bằng giọng nói, ứng viên trả lời voice (hoặc text), AI theo dõi biểu cảm/hành vi, tự chuyển chủ đề, và cuối phiên cho ra scorecard toàn diện bao gồm cả kỹ năng cứng lẫn soft-skills.
