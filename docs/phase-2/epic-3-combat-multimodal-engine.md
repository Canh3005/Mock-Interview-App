# Epic 3: Combat Mode Core Engine — Voice Loop, Orchestrator & Multimodal Analysis

> **Scope:** CHỈ kích hoạt trong **Combat Mode**. Practice Mode không chạy bất kỳ component nào trong Epic này.

Epic xây dựng **toàn bộ lõi trải nghiệm phỏng vấn thật** cho Combat Mode, gồm 3 lớp:

| Lớp | Mô tả | Tasks |
|-----|--------|-------|
| **Interaction Layer** | Voice loop, TTS/STT, turn control, auto transitions — tạo cảm giác đang nói chuyện với interviewer thật | 3.1 → 3.5 |
| **Analysis Layer** | Eye-tracking, filler words, micro-expressions — phân tích soft-skills không lời chạy nền trên client | 3.6 → 3.9 |
| **Scoring Layer** | Metrics ingestion, scoring pipeline, real-time context feed — tổng hợp dữ liệu và chấm điểm | 3.10 → 3.12 |

```
┌─────────────────────────────────────────────────────────┐
│                   INTERACTION LAYER                      │
│  Voice Loop · TTS/STT · Turn Control · Auto Transitions  │
│  Tasks 3.1 – 3.5                                         │
├─────────────────────────────────────────────────────────┤
│                   ANALYSIS LAYER                         │
│  Eye-tracking · Filler Words · Micro-expressions         │
│  Tasks 3.6 – 3.9 (Edge Computing — chạy trên browser)    │
├─────────────────────────────────────────────────────────┤
│                   SCORING LAYER                          │
│  Metrics Ingestion · Scoring Pipeline · Context Feed     │
│  Tasks 3.10 – 3.12                                       │
└─────────────────────────────────────────────────────────┘
```

Nguyên tắc thiết kế:
- **AI-Driven Flow** — AI chủ động hỏi, chuyển stage, xử lý im lặng. Ứng viên không cần bấm nút.
- **Edge Computing** — toàn bộ ML inference (MediaPipe) chạy trên browser, server chỉ nhận JSON metadata.
- **Voice-First** — AI "nói" bằng TTS, ứng viên trả lời voice hoặc text. Không lưu audio/video.

---

# INTERACTION LAYER (Tasks 3.1 – 3.5)

---

## Task 3.1: Combat Interview Orchestrator — State Machine

**Mô tả:** Singleton service đóng vai "nhạc trưởng" điều phối toàn bộ combat session. Khác với Practice Mode (user bấm Send, bấm Next Stage), Combat Mode là **AI-driven** — AI quyết định flow, ứng viên chỉ cần nghe và trả lời.

**Chi tiết công việc:**

1. **State Machine:**
   ```ts
   type CombatState =
     | 'INITIALIZING'        // Preload TTS, MediaPipe, warm-up
     | 'GREETING'            // AI chào và giới thiệu (~30s)
     | 'STAGE_INTRO'         // AI giới thiệu stage mới (~10s)
     | 'AI_ASKING'           // AI đang đặt câu hỏi (TTS playing)
     | 'CANDIDATE_THINKING'  // Silence buffer sau câu hỏi (max 10s)
     | 'CANDIDATE_SPEAKING'  // Ứng viên đang trả lời (STT active)
     | 'AI_PROCESSING'       // AI đang xử lý response (LLM generating)
     | 'AI_FOLLOW_UP'        // AI hỏi follow-up hoặc drill-down
     | 'STAGE_TRANSITION'    // Chuyển stage (AI nói transition phrase)
     | 'CLOSING'             // AI kết thúc phỏng vấn
     | 'COMPLETED';          // Phiên kết thúc, trigger scoring

   interface CombatOrchestratorState {
     currentState: CombatState;
     currentStage: number;          // 1-6
     stageTimeBudget: number;       // ms — thời gian tối đa cho stage hiện tại
     stageElapsed: number;          // ms — đã dùng cho stage hiện tại
     turnsInStage: number;          // Số lượt hỏi-đáp trong stage
     totalElapsed: number;          // ms — tổng thời gian phỏng vấn
     totalTimeBudget: number;       // ms — tổng budget (mặc định 45 phút)
     silenceStartedAt: number | null;
     inputMode: 'voice' | 'text';   // User chọn, AI luôn output voice
   }
   ```

2. **State Transition Diagram:**
   ```
   INITIALIZING
       ↓ (preload done)
   GREETING
       ↓ (AI chào xong, detect candidate response "Sẵn sàng")
   STAGE_INTRO (stage 1)
       ↓ (AI giới thiệu xong)
   ┌→ AI_ASKING
   │     ↓ (TTS playback xong)
   │  CANDIDATE_THINKING
   │     ↓ (VAD detect speech bắt đầu, hoặc user bắt đầu gõ text)
   │  CANDIDATE_SPEAKING
   │     ↓ (silence > 3s hoặc user bấm Done)
   │  AI_PROCESSING
   │     ↓ (LLM response ready)
   │  ┌─ shouldTransitionStage()?
   │  │   YES → STAGE_TRANSITION → STAGE_INTRO (stage+1) → AI_ASKING ─┐
   │  │   NO  → AI_FOLLOW_UP ──────────────────────────────────────────┘
   │  └─ (last stage done?) → CLOSING → COMPLETED
   └──────────────────────────────────────────────────────────────────┘
   ```

3. **Time Budgeting per stage:**
   ```ts
   // Tổng 45 phút = 2,700,000ms (configurable khi init session)
   const STAGE_TIME_ALLOCATION: Record<number, number> = {
     1: 0.15,  // Culture Fit & Company Alignment:  ~6m45s
     2: 0.20,  // Tech Stack Deep-Dive:              ~9m00s
     3: 0.20,  // Domain Knowledge:                  ~9m00s
     4: 0.20,  // Thực chiến CV:                     ~9m00s
     5: 0.15,  // Kỹ năng mềm & Xử lý tình huống:  ~6m45s
     6: 0.10,  // Reverse Interview:                 ~4m30s
   };

   function getStageBudget(stage: number, totalBudgetMs: number): number {
     return Math.floor(totalBudgetMs * STAGE_TIME_ALLOCATION[stage]);
   }
   ```

4. **Event-driven architecture (FE):**
   ```ts
   // CombatOrchestrator phát events, UI components subscribe
   class CombatOrchestrator extends EventEmitter {
     transition(newState: CombatState, payload?: any): void {
       this.state.currentState = newState;
       this.emit('stateChange', { state: newState, payload });
       this.logStateChange(newState, payload); // Ghi log để replay/debug
     }
   }

   // UI subscribe:
   orchestrator.on('stateChange', ({ state, payload }) => {
     switch (state) {
       case 'AI_ASKING':
         disableMic();
         showAiSpeakingIndicator();
         break;
       case 'CANDIDATE_THINKING':
         showThinkingPrompt("Bạn có thể trả lời khi sẵn sàng...");
         startThinkingTimer(10_000);
         break;
       case 'CANDIDATE_SPEAKING':
         enableMic();
         startSTT();
         showRecordingIndicator();
         break;
       case 'STAGE_TRANSITION':
         showStageTransitionAnimation();
         break;
     }
   });
   ```

5. **Redux slice:**
   ```ts
   // combatOrchestratorSlice
   {
     combatState: CombatState,
     currentStage: number,
     stageElapsed: number,
     totalElapsed: number,
     turnsInStage: number,
     inputMode: 'voice' | 'text',
     isAiSpeaking: boolean,       // TTS đang play
     isCandidateSpeaking: boolean, // STT đang active
     silenceDurationMs: number,
   }
   ```

**Lưu ý kiến trúc:**
- Orchestrator chạy trên **FE** vì cần phản hồi real-time với voice events (latency < 100ms).
- **BE vẫn là source of truth** cho session state (stage, turns, score). FE orchestrator gọi BE API tại mỗi transition point.
- Mỗi state change được persist vào `combatOrchestratorSlice` (Redux) và log ra `stateChangeLog[]` để debug.

---

## Task 3.2: TTS Engine — AI Interviewer "Nói"

**Mô tả:** Tích hợp Text-to-Speech để AI interviewer phát giọng nói thay vì chỉ hiện text. Đây là yếu tố then chốt tạo cảm giác phỏng vấn thật. Text vẫn hiện dạng subtitle song song.

**Phân tích lựa chọn TTS:**

| Giải pháp | Latency | Chất lượng giọng | Chi phí | Tiếng Việt | Streaming |
|---|---|---|---|---|---|
| **Web Speech API** (native) | ~100ms | Thấp (robotic) | Free | Có (hạn chế) | Không |
| **OpenAI TTS** (`tts-1`) | 300-800ms | Cao (natural) | $15/1M chars | Hạn chế | Có |
| **Google Cloud TTS** | 200-400ms | Cao | $4/1M chars | **Rất tốt (vi-VN)** | Có |
| **ElevenLabs** | 200-500ms | Rất cao | $5-99/mo | Có (multilingual v2) | Có |

**Quyết định: Hybrid 2-tier:**
```
Tier 1 (Primary):   Google Cloud TTS hoặc OpenAI TTS
                     → Chất lượng cao, giọng tự nhiên, streaming support
Tier 2 (Fallback):  Web Speech API (SpeechSynthesis)
                     → Khi mất mạng hoặc TTS API fail/timeout
```

**Chi tiết công việc:**

1. **BE — TTS Service:**
   ```ts
   // server/src/tts/tts.service.ts
   @Injectable()
   export class TtsService {
     constructor(
       private readonly configService: ConfigService,
     ) {}

     async synthesize(
       text: string,
       options: { voice?: string; speed?: number },
     ): Promise<Buffer> {
       // Gọi Cloud TTS API
       const response = await this.client.synthesizeSpeech({
         input: { text },
         voice: {
           languageCode: 'vi-VN',    // Hoặc detect từ session language
           name: options.voice || 'vi-VN-Neural2-A',
         },
         audioConfig: {
           audioEncoding: 'OGG_OPUS', // Nhẹ, streaming-friendly
           speakingRate: options.speed || 1.0,
         },
       });
       return response.audioContent;
     }
   }
   ```

2. **BE — TTS Endpoint:**
   ```ts
   // server/src/tts/tts.controller.ts
   @Post('synthesize')
   async synthesize(
     @Body() dto: { text: string; voice?: string; speed?: number },
     @Res() res: Response,
   ) {
     const audio = await this.ttsService.synthesize(dto.text, {
       voice: dto.voice,
       speed: dto.speed,
     });
     res.setHeader('Content-Type', 'audio/ogg');
     res.setHeader('Cache-Control', 'private, max-age=300'); // Cache 5 phút
     res.send(audio);
   }
   ```

3. **FE — Sentence-level TTS Streaming (giảm latency):**
   ```
   Vấn đề: Đợi LLM sinh xong toàn bộ text rồi TTS → delay 3-5 giây (dead air)
   Giải pháp: TTS từng câu (sentence-level chunking)

   LLM Stream: "Câu hỏi tiếp theo nhé. | Bạn hãy chia sẻ | về kinh nghiệm..."
                        ↓ detect sentence boundary (".", "?", "!")
                   TTS("Câu hỏi tiếp theo nhé.") → Audio 1 → Play ngay lập tức
                        ↓ (trong khi Audio 1 đang play, TTS câu 2 song song)
                   TTS("Bạn hãy chia sẻ về kinh nghiệm...") → Audio 2 → Queue
   ```

   ```ts
   // client/src/services/SentenceTtsBuffer.ts
   class SentenceTtsBuffer {
     private textBuffer = '';
     private audioQueue: ArrayBuffer[] = [];
     private isPlaying = false;
     public onFinished?: () => void;  // Callback khi toàn bộ TTS xong

     // Nhận từng token từ SSE stream
     appendToken(token: string): void {
       this.textBuffer += token;

       // Detect sentence boundary
       const match = this.textBuffer.match(/[.?!。？！]\s+/);
       if (match && match.index !== undefined) {
         const sentence = this.textBuffer.slice(0, match.index + match[0].length).trim();
         this.textBuffer = this.textBuffer.slice(match.index + match[0].length);
         if (sentence.length > 0) {
           this.requestTts(sentence);
         }
       }
     }

     // Flush remaining text khi LLM stream kết thúc
     flush(): void {
       if (this.textBuffer.trim().length > 0) {
         this.requestTts(this.textBuffer.trim());
         this.textBuffer = '';
       }
     }

     private async requestTts(sentence: string): Promise<void> {
       const res = await fetch('/api/tts/synthesize', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ text: sentence }),
       });
       const audioData = await res.arrayBuffer();
       this.audioQueue.push(audioData);
       if (!this.isPlaying) this.playNext();
     }

     private async playNext(): Promise<void> {
       if (this.audioQueue.length === 0) {
         this.isPlaying = false;
         this.onFinished?.(); // → Orchestrator chuyển sang CANDIDATE_THINKING
         return;
       }
       this.isPlaying = true;
       const buffer = this.audioQueue.shift()!;
       await ttsPlayer.play(buffer);
       this.playNext();
     }

     stop(): void {
       this.audioQueue = [];
       this.isPlaying = false;
       ttsPlayer.stop();
     }
   }
   ```

4. **FE — TTS Audio Player:**
   ```ts
   // client/src/services/TtsPlayer.ts
   class TtsPlayer {
     private audioContext: AudioContext;
     private gainNode: GainNode;
     private currentSource: AudioBufferSourceNode | null = null;

     constructor() {
       this.audioContext = new AudioContext();
       this.gainNode = this.audioContext.createGain();
       this.gainNode.connect(this.audioContext.destination);
     }

     async play(audioData: ArrayBuffer): Promise<void> {
       const buffer = await this.audioContext.decodeAudioData(audioData.slice(0));
       return new Promise((resolve) => {
         const source = this.audioContext.createBufferSource();
         source.buffer = buffer;
         source.connect(this.gainNode);
         this.currentSource = source;
         source.onended = () => {
           this.currentSource = null;
           resolve();
         };
         source.start();
       });
     }

     stop(): void {
       this.currentSource?.stop();
       this.currentSource = null;
     }

     get isPlaying(): boolean {
       return this.currentSource !== null;
     }

     setVolume(level: number): void {
       this.gainNode.gain.value = Math.max(0, Math.min(1, level));
     }
   }
   ```

5. **Voice Selection theo persona level:**
   ```ts
   // Giọng AI phù hợp với persona mỗi level
   const VOICE_MAP: Record<string, string> = {
     junior: 'vi-VN-Neural2-A',  // Giọng nữ, warm, friendly → mentor
     mid:    'vi-VN-Neural2-D',  // Giọng nam, professional → senior engineer
     senior: 'vi-VN-Neural2-D',  // Giọng nam, authoritative → engineering manager
   };

   // Fallback cho English interviews
   const VOICE_MAP_EN: Record<string, string> = {
     junior: 'en-US-Neural2-F',
     mid:    'en-US-Neural2-D',
     senior: 'en-US-Neural2-A',
   };
   ```

6. **Fallback khi TTS API fail:**
   ```ts
   class TtsFallback {
     // Web Speech API (native browser TTS)
     speak(text: string): Promise<void> {
       return new Promise((resolve) => {
         const utterance = new SpeechSynthesisUtterance(text);
         utterance.lang = 'vi-VN';
         utterance.rate = 1.0;
         utterance.onend = () => resolve();
         speechSynthesis.speak(utterance);
       });
     }
   }
   ```

7. **Reusable phrase caching (tiết kiệm cost TTS):**
   ```ts
   // Các câu lặp lại nhiều → cache audio trong IndexedDB
   const CACHEABLE_PHRASES = [
     'Bạn có thể chia sẻ thêm không?',
     'Được rồi, cảm ơn bạn.',
     'Mình hiểu rồi. Câu tiếp theo nhé.',
     'Bạn cần thêm thời gian suy nghĩ không?',
     // + greeting phrases, transition phrases
   ];
   // Cache key = hash(text + voice + speed)
   // Cache trong IndexedDB, TTL 24h
   ```

---

## Task 3.3: Voice-to-Voice Communication Loop

**Mô tả:** Đóng kín vòng lặp giao tiếp: AI hỏi bằng voice (TTS) → Ứng viên nghe → Ứng viên trả lời bằng voice (STT) hoặc text → AI xử lý → AI phản hồi bằng voice (TTS) → lặp lại. Text luôn hiển thị song song dạng subtitle.

**Chi tiết công việc:**

1. **Full Voice Loop Sequence:**
   ```
   ┌─────────────────────────────────────────────────────────┐
   │ 1. AI_ASKING                                            │
   │    BE sinh response text (SSE stream)                    │
   │    → SentenceTtsBuffer chuyển từng câu thành audio       │
   │    → TtsPlayer phát audio                                │
   │    → Mic OFF (tránh echo feedback)                       │
   │    → Text hiện subtitle trên screen                      │
   │    → Multimodal vẫn chạy (eye-tracking, expression)      │
   ├─────────────────────────────────────────────────────────┤
   │ 2. CANDIDATE_THINKING                                   │
   │    TTS audio kết thúc → onFinished callback              │
   │    → Subtle audio cue (nhẹ) + visual: "Your turn"       │
   │    → Mic vẫn OFF trong 1.5s (thinking buffer)            │
   │    → Thinking timer hiển thị (max 10s)                   │
   ├─────────────────────────────────────────────────────────┤
   │ 3. CANDIDATE_SPEAKING                                   │
   │    Nếu voice mode:                                      │
   │      → Mic ON, STT starts (continuous mode)              │
   │      → Real-time transcript hiện trên screen             │
   │      → VAD monitors silence                              │
   │      → Silence > 3s → auto-finalize & send               │
   │      → Hoặc user bấm "Done"                             │
   │    Nếu text mode:                                       │
   │      → Textarea enabled, user gõ text                    │
   │      → Bấm Send hoặc Enter để gửi                       │
   ├─────────────────────────────────────────────────────────┤
   │ 4. AI_PROCESSING                                        │
   │    → Transcript/text gửi lên BE                          │
   │    → Show "AI đang suy nghĩ..." indicator                │
   │    → BE: quality check → LLM → response stream           │
   ├─────────────────────────────────────────────────────────┤
   │ 5. Quay lại bước 1 (AI_ASKING / AI_FOLLOW_UP)           │
   │    hoặc STAGE_TRANSITION nếu đủ điều kiện               │
   └─────────────────────────────────────────────────────────┘
   ```

2. **Hybrid Input Mode (user chọn lúc bắt đầu, có thể đổi giữa chừng):**
   ```ts
   // AI OUTPUT: luôn voice (TTS) + text (subtitle) — không thay đổi
   // USER INPUT: voice hoặc text — user chọn

   type CombatInputMode = 'voice' | 'text';

   // Voice mode: Mic → STT → auto-send khi silence > 3s
   // Text mode:  Textarea → user gõ → bấm Send
   // Cả 2 mode đều gửi cùng payload lên BE:
   interface CombatMessagePayload {
     content: string;                    // Text cuối cùng
     inputType: 'voice' | 'text';
     voiceTranscript?: string;           // Raw STT output (chỉ voice mode)
     multimodalContext?: MultimodalContext; // Snapshot từ Analysis Layer
   }
   ```

3. **Echo Cancellation — Mic OFF khi AI nói:**
   ```ts
   // Primary approach: Mute mic track khi TTS đang phát
   // Đơn giản, reliable, không cần AEC phức tạp

   orchestrator.on('stateChange', ({ state }) => {
     if (state === 'AI_ASKING' || state === 'AI_FOLLOW_UP') {
       micManager.mute();      // gainNode.gain.value = 0
     }
     if (state === 'CANDIDATE_THINKING') {
       // Delay 200ms cho echo decay rồi unmute
       setTimeout(() => micManager.unmute(), 200);
     }
   });

   // Nếu cần barge-in (user nói xen khi AI đang nói):
   // Dùng echoCancellation constraint + so sánh frequency pattern
   const stream = await navigator.mediaDevices.getUserMedia({
     audio: {
       echoCancellation: true,
       noiseSuppression: true,
       autoGainControl: true,
     },
   });
   ```

4. **Barge-in Handling (ứng viên nói xen):**
   ```ts
   // Khi AI đang nói (AI_ASKING state) mà detect human voice từ mic:
   function handleBargeIn(): void {
     sentenceTtsBuffer.stop();  // Dừng TTS queue
     ttsPlayer.stop();          // Dừng audio đang phát
     orchestrator.transition('CANDIDATE_SPEAKING');
     logEvent({ type: 'BARGE_IN', aiUtteranceCompleted: false });
   }

   // Barge-in detection: chỉ enable nếu user opt-in (setting)
   // Mặc định OFF để tránh false positive từ tiếng ồn
   ```

5. **UI Layout — Combat Interview Room:**
   ```
   ┌──────────────────────────────────────────────────┐
   │ 🎥 Camera (nhỏ, góc trên phải)  │ Stage 2/6     │
   │ ┌──────┐                        │ ████░░ 12:30   │
   │ │ User │                        │                │
   │ │ face │                        │ 🔴 Giám sát    │
   │ └──────┘                        │    đang hoạt    │
   │                                 │    động         │
   ├──────────────────────────────────┴────────────────┤
   │                                                   │
   │    ┌─────────────────────────────────┐            │
   │    │    🤖 AI Interviewer             │            │
   │    │    ◉ ◉ ◉ (speaking animation)   │            │
   │    │                                  │            │
   │    │   "Bạn có thể chia sẻ về kinh   │ ← subtitle │
   │    │    nghiệm với microservices?"    │            │
   │    └─────────────────────────────────┘            │
   │                                                   │
   │    ┌─────────────────────────────────┐            │
   │    │ 🎤 Đang nghe...                  │            │
   │    │ "Dạ, trong dự án trước em đã..." │ ← live STT│
   │    └─────────────────────────────────┘            │
   │                                                   │
   │  [🎤 Voice Mode ✓]  [⌨️ Text Mode]  [⏹ Done]     │
   └───────────────────────────────────────────────────┘
   ```

---

## Task 3.4: Auto Stage Transition Engine

**Mô tả:** AI tự động chuyển stage mà không cần user bấm nút. Transition diễn ra tự nhiên, AI nói câu chuyển tiếp giống interviewer thật.

**Chi tiết công việc:**

1. **Decision logic (chạy trên BE sau mỗi AI response):**
   ```ts
   // server/src/combat/combat-transition.service.ts
   @Injectable()
   export class CombatTransitionService {
     evaluateTransition(
       session: BehavioralSession,
       stageMetrics: {
         turnsInStage: number;
         stageElapsedMs: number;
         timeBudgetMs: number;
         drillDepth: number;
         lastResponseQuality: 'deep' | 'adequate' | 'shallow';
         offTopicCount: number;
       },
     ): TransitionDecision {
       const { turnsInStage, stageElapsedMs, timeBudgetMs, drillDepth,
               lastResponseQuality, offTopicCount } = stageMetrics;

       const MAX_TURNS: Record<string, number> = {
         junior: 5, mid: 4, senior: 4,
       };

       // Hard limits — chuyển bắt buộc
       if (stageElapsedMs >= timeBudgetMs) {
         return { shouldTransition: true, reason: 'TIME_BUDGET_EXCEEDED' };
       }
       if (turnsInStage >= MAX_TURNS[session.candidateLevel]) {
         return { shouldTransition: true, reason: 'MAX_TURNS_REACHED' };
       }
       if (offTopicCount >= 3) {
         return { shouldTransition: true, reason: 'OFF_TOPIC_PERSISTENT' };
       }

       // Soft signal — candidate đã hit ceiling (từ Socratic Probing)
       if (drillDepth >= 3 && lastResponseQuality === 'shallow') {
         return { shouldTransition: true, reason: 'CANDIDATE_CEILING' };
       }

       return { shouldTransition: false };
     }
   }
   ```

2. **Natural transition phrases (AI nói bằng TTS):**
   ```ts
   const TRANSITION_PHRASES: Record<string, string[]> = {
     TIME_BUDGET_EXCEEDED: [
       'Được rồi, cảm ơn bạn về phần chia sẻ vừa rồi. Bây giờ mình muốn chuyển sang một chủ đề khác nhé.',
       'Rất hay. Mình ghi nhận phần này. Giờ mình sẽ hỏi bạn về một khía cạnh khác.',
     ],
     MAX_TURNS_REACHED: [
       'OK, mình đã nắm được khá rõ về phần này. Chúng ta chuyển tiếp nhé.',
     ],
     CANDIDATE_CEILING: [
       'Mình hiểu rồi. Chúng ta sẽ chuyển sang phần tiếp theo nhé.',
       'Được, mình đã nắm được quan điểm của bạn. Giờ mình muốn tìm hiểu thêm về...',
     ],
     OFF_TOPIC_PERSISTENT: [
       'Không sao. Mình sẽ chuyển sang một chủ đề khác, có thể sẽ phù hợp hơn với bạn.',
     ],
   };
   ```

3. **BE response metadata mở rộng cho combat mode:**
   ```json
   // SSE final event trong combat mode:
   {
     "done": true,
     "meta": {
       "starStatus": { "S": true, "T": true, "A": false, "R": false },
       "combatTransition": {
         "shouldTransition": true,
         "reason": "TIME_BUDGET_EXCEEDED",
         "nextStage": 3,
         "transitionPhrase": "Được rồi, cảm ơn bạn về phần chia sẻ vừa rồi..."
       },
       "stageProgress": {
         "stage": 2,
         "turnsCompleted": 4,
         "elapsedMs": 540000,
         "budgetMs": 540000
       }
     }
   }
   ```

4. **FE Orchestrator xử lý transition:**
   ```ts
   // Saga hoặc orchestrator handler
   async function handleAiResponseDone(meta: ResponseMeta): Promise<void> {
     if (meta.combatTransition?.shouldTransition) {
       orchestrator.transition('STAGE_TRANSITION');

       // AI nói transition phrase bằng TTS
       const phrase = meta.combatTransition.transitionPhrase;
       sentenceTtsBuffer.appendToken(phrase);
       sentenceTtsBuffer.flush();
       await waitForTtsComplete();

       // Gọi BE chuyển stage
       await api.nextStage(sessionId);

       // AI giới thiệu stage mới
       orchestrator.transition('STAGE_INTRO');
       const intro = await api.getStageIntro(sessionId, meta.combatTransition.nextStage);
       sentenceTtsBuffer.appendToken(intro.text);
       sentenceTtsBuffer.flush();
       await waitForTtsComplete();

       // AI bắt đầu hỏi câu đầu tiên của stage mới
       orchestrator.transition('AI_ASKING');
     } else {
       // Tiếp tục hỏi trong stage hiện tại
       orchestrator.transition('AI_ASKING');
     }
   }
   ```

5. **Grace period — không cắt ngang ứng viên:**
   ```ts
   // Khi time budget hết nhưng ứng viên đang nói:
   // → KHÔNG interrupt ngay
   // → Đợi ứng viên nói xong (silence > 3s)
   // → Sau đó mới transition
   // → Ghi nhận overtime vào stageMetrics
   ```

---

## Task 3.5: Silence & Interruption Handling

**Mô tả:** Xử lý các edge case trong voice communication — im lặng kéo dài, tiếng ồn, ứng viên nói xen, ứng viên nói "nhắc lại".

**Chi tiết công việc:**

1. **Voice Activity Detection (VAD):**
   ```ts
   // client/src/services/VoiceActivityDetector.ts
   class VoiceActivityDetector {
     private analyser: AnalyserNode;
     private silenceStart: number | null = null;
     private readonly SILENCE_THRESHOLD = 0.02;  // RMS dưới ngưỡng = im lặng
     private readonly SPEECH_THRESHOLD = 0.05;   // RMS trên ngưỡng = đang nói

     constructor(audioContext: AudioContext, stream: MediaStream) {
       this.analyser = audioContext.createAnalyser();
       this.analyser.fftSize = 512;
       const source = audioContext.createMediaStreamSource(stream);
       source.connect(this.analyser);
     }

     // Gọi mỗi 100ms bằng setInterval hoặc requestAnimationFrame
     detect(): VadResult {
       const dataArray = new Float32Array(this.analyser.fftSize);
       this.analyser.getFloatTimeDomainData(dataArray);
       const rms = Math.sqrt(dataArray.reduce((sum, v) => sum + v * v, 0) / dataArray.length);

       if (rms < this.SILENCE_THRESHOLD) {
         if (!this.silenceStart) this.silenceStart = Date.now();
         return {
           isSpeaking: false,
           silenceDurationMs: Date.now() - this.silenceStart,
           rmsLevel: rms,
         };
       } else {
         this.silenceStart = null;
         return { isSpeaking: true, silenceDurationMs: 0, rmsLevel: rms };
       }
     }
   }
   ```

2. **Silence Escalation Protocol (khi state = CANDIDATE_THINKING hoặc CANDIDATE_SPEAKING):**

   | Silence Duration | Action | AI Response |
   |---|---|---|
   | 0-5s | Bình thường | Không làm gì — candidate đang nghĩ |
   | 5-10s | Visual hint | Hiện nhẹ trên UI: "Bạn có thể bắt đầu trả lời..." |
   | 10-20s | AI prompt (TTS) | "Bạn cần mình nhắc lại câu hỏi không?" |
   | 20-30s | AI offer skip | "Không sao, chúng ta có thể chuyển sang câu khác nhé." |
   | > 30s | Auto-skip | Log `NO_RESPONSE`, AI tự hỏi câu tiếp theo |

   ```ts
   function handleSilence(silenceMs: number, currentState: CombatState): void {
     if (currentState !== 'CANDIDATE_THINKING' && currentState !== 'CANDIDATE_SPEAKING') return;

     if (silenceMs > 30_000) {
       logEvent({ type: 'NO_RESPONSE', silenceMs });
       orchestrator.transition('AI_ASKING', { reason: 'silence_auto_skip' });
     } else if (silenceMs > 20_000 && !flags.offeredSkip) {
       flags.offeredSkip = true;
       playTtsPrompt('Không sao, chúng ta có thể chuyển sang câu khác nhé.');
     } else if (silenceMs > 10_000 && !flags.promptedRepeat) {
       flags.promptedRepeat = true;
       playTtsPrompt('Bạn cần mình nhắc lại câu hỏi không?');
     } else if (silenceMs > 5_000 && !flags.shownHint) {
       flags.shownHint = true;
       showVisualHint('Bạn có thể bắt đầu trả lời khi sẵn sàng...');
     }
   }
   ```

3. **Auto-send khi user dừng nói (voice mode):**
   ```ts
   // Thay vì user phải bấm "Send" sau mỗi câu trả lời:
   // VAD detect silence > 3s SAU KHI user đã nói ít nhất 5 từ
   //   → Auto-finalize STT transcript
   //   → Gửi lên BE
   //   → Transition sang AI_PROCESSING

   // User vẫn có thể:
   // - Bấm "Done" button để gửi sớm
   // - Nói "xong rồi" hoặc "hết rồi" → detect done signal → send
   // - Tắt auto-send trong settings → phải bấm Done thủ công
   ```

4. **Clarification Detection:**
   ```ts
   // Nếu STT transcript chứa pattern yêu cầu nhắc lại:
   const REPEAT_PATTERNS = [
     /nhắc lại/i, /nói lại/i, /repeat/i,
     /không nghe rõ/i, /xin lỗi.*gì/i,
   ];

   function checkForClarification(transcript: string): boolean {
     return REPEAT_PATTERNS.some(p => p.test(transcript));
   }

   // Nếu detect → AI nhắc lại câu hỏi gần nhất (TTS)
   // Không đếm vào turn count
   ```

---

# ANALYSIS LAYER (Tasks 3.6 – 3.9)

> Lớp phân tích soft-skills không lời. Toàn bộ chạy trên browser bằng MediaPipe (Edge Computing).
> Server chỉ nhận JSON metadata mỗi 5 giây. **Không lưu video.**

---

## Task 3.6: FE – Khởi động Multimodal Engine khi vào Combat Session

**Mô tả:** Sau khi `POST /api/interview/sessions/init` trả về `sessionId` (combat mode), FE khởi động pipeline phân tích chạy nền song song với phòng thi.

**Chi tiết công việc:**

1. Tạo singleton service `MultimodalEngine` (Web Worker hoặc chạy trong main thread với `requestIdleCallback`):
   ```ts
   class MultimodalEngine {
     private mediaStream: MediaStream;        // Từ Permission Gate (Task 0.3b)
     private sessionId: string;
     private reportBuffer: AnalysisFrame[];   // Buffer tích lũy trước khi gửi BE
     private flushInterval: ReturnType<typeof setInterval>;

     start(stream: MediaStream, sessionId: string): void
     stop(): void
     private flush(): void   // Gửi buffer lên BE, clear buffer

     // Expose snapshot cho Orchestrator (Task 3.12)
     getLatestSnapshot(): MultimodalContext
   }
   ```

2. `start()` khởi động 3 analyzer song song (xem Task 3.7, 3.8, 3.9).
3. `flushInterval` chạy mỗi **5 giây**: gom toàn bộ `AnalysisFrame` trong buffer → gửi `POST /api/combat/sessions/:id/metrics` → clear buffer.
4. `stop()` được gọi khi Orchestrator transition sang `COMPLETED`.
5. **Preload** MediaPipe WASM tại Permission Gate (Task 0.3b), không chờ đến khi vào phòng thi.

**Lifecycle trong Redux:**
```ts
// combatEngineSlice
{
  engineStatus: 'idle' | 'loading' | 'running' | 'stopped',
  lastFlushedAt: number | null,
  totalFramesAnalyzed: number,
  mediapipeReady: boolean,  // Preload status
}
```

---

## Task 3.7: FE – Eye-Tracking Analyzer (MediaPipe Face Mesh)

**Mô tả:** Phát hiện hướng nhìn của ứng viên để xác định có đang nhìn camera (tập trung giao tiếp) hay liên tục nhìn chỗ khác.

**Chi tiết công việc:**

1. Load **MediaPipe Face Mesh** (`@mediapipe/face_mesh`) – chạy WASM trên client, không gửi frame video về server.
2. Chạy inference mỗi **500ms** trên frame từ `mediaStream` (không cần 60fps):
   ```ts
   const faceMesh = new FaceMesh({ locateFile: (f) => `/mediapipe/${f}` });
   faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true });
   ```
3. Từ 468 landmarks, extract các điểm mắt để tính **gaze direction**:
   - `LOOKING_AT_SCREEN`: Mắt nhìn thẳng về phía trước (camera).
   - `LOOKING_AWAY`: Nhìn sang trái/phải/xuống quá ngưỡng (> 20° lệch).
   - `EYES_CLOSED`: Nhắm mắt > 2 giây liên tiếp.
4. Mỗi 500ms tạo 1 `EyeTrackingFrame`:
   ```ts
   interface EyeTrackingFrame {
     ts: number;           // timestamp ms
     gaze: 'screen' | 'away' | 'closed';
     awayAngleDeg?: number;
   }
   ```
5. Push vào `reportBuffer` của `MultimodalEngine`.

**Lưu ý quan trọng khi có TTS:**
- Khi AI đang nói (TTS playing), ứng viên tự nhiên nhìn vào vùng subtitle hoặc avatar trên screen → `gaze = 'screen'` là đúng.
- **Không đánh "LOOKING_AWAY" khi ứng viên nhìn xuống đọc subtitle** — vùng subtitle nằm trong acceptable gaze zone.

**Ngưỡng cờ đỏ (xử lý ở BE, không alert FE ngay):**
- `LOOKING_AWAY` liên tục > 10 giây → Red Flag nhẹ.
- `LOOKING_AWAY` tổng cộng > 30% thời gian thi → Red Flag nặng.

---

## Task 3.8: FE – Filler Word Counter (Web Speech API + NLP nhẹ)

**Mô tả:** Đếm các từ thừa (filler words) trong câu trả lời giọng nói để đánh giá sự lưu loát.

**Chi tiết công việc:**

1. **Reuse STT stream** đã có từ voice loop (Task 3.3), KHÔNG chạy SpeechRecognition instance thứ 2.
   ```ts
   // Filler counter subscribe vào cùng transcript stream
   // Chỉ active khi orchestrator.state === 'CANDIDATE_SPEAKING'
   ```
2. Danh sách filler words tiếng Việt và tiếng Anh:
   ```ts
   const FILLER_WORDS_VI = ['ừm', 'ờ', 'à', 'ừ', 'như là', 'kiểu như', 'thì là', 'cái này', 'cái kia'];
   const FILLER_WORDS_EN = ['um', 'uh', 'like', 'you know', 'basically', 'literally', 'kind of'];
   ```
3. Mỗi khi nhận interim/final transcript: Scan qua danh sách filler → đếm xuất hiện.
4. Mỗi 5 giây tổng hợp `FillerFrame`:
   ```ts
   interface FillerFrame {
     ts: number;
     windowDurationMs: number;     // ~5000ms
     fillerCount: number;
     fillerRate: number;           // fillerCount / totalWordCount trong window
     detectedFillers: string[];    // Các từ thừa cụ thể đã phát hiện
   }
   ```
5. Push vào `reportBuffer`.

**Ngưỡng chấm điểm (BE xử lý):**
- `fillerRate < 5%`: Excellent – lưu loát.
- `fillerRate 5-15%`: Good – chấp nhận được.
- `fillerRate > 15%`: Needs improvement – giao tiếp thiếu tự tin.

---

## Task 3.9: FE – Micro-Expression Detector (MediaPipe Face Mesh + Rule-based)

**Mô tả:** Phân tích biểu cảm khuôn mặt để nhận diện trạng thái cảm xúc cơ bản (căng thẳng / tự tin / bình thường) trong khi trả lời.

**Chi tiết công việc:**

1. Reuse `FaceMesh` instance đã khởi động ở Task 3.7 (không chạy 2 instance riêng).
2. Mỗi **2 giây**, extract các landmark liên quan đến biểu cảm:
   - **Eyebrow raise** (lông mày nhướng cao): Dấu hiệu ngạc nhiên / căng thẳng.
   - **Lip corner pull** (khóe miệng kéo ngang): Dấu hiệu nụ cười / thoải mái.
   - **Lip press** (môi mím chặt): Dấu hiệu căng thẳng / do dự.
   - **Eye squint** (mắt nheo): Tập trung hoặc không tự tin.
3. Rule-based classification (không dùng ML model nặng):
   ```ts
   type MicroExpression = 'neutral' | 'confident' | 'stressed' | 'uncertain';

   function classifyExpression(landmarks: NormalizedLandmarkList): MicroExpression {
     const eyebrowRaise = calcEyebrowDistance(landmarks);
     const lipCorner = calcLipCornerAngle(landmarks);
     const lipPress = calcLipPressRatio(landmarks);
     // Rule tree dựa trên các metric trên
   }
   ```
4. Mỗi 2 giây tạo `ExpressionFrame`:
   ```ts
   interface ExpressionFrame {
     ts: number;
     expression: MicroExpression;
     confidence: number; // 0-1, độ chắc chắn của classification
   }
   ```
5. Push vào `reportBuffer`.

**Lưu ý quan trọng:**
- Không dùng kết quả này để phán xét tuyệt đối. Chỉ là 1 tín hiệu bổ sung trong scorecard tổng.
- Kết quả bị discard nếu `confidence < 0.6` (ánh sáng kém, khuôn mặt che khuất).

---

# SCORING LAYER (Tasks 3.10 – 3.12)

---

## Task 3.10: BE – Metrics Ingestion API

**Mô tả:** Nhận dữ liệu JSON metadata từ FE mỗi 5 giây và lưu vào DB.

**Chi tiết công việc:**

1. Endpoint: `POST /api/combat/sessions/:id/metrics`
2. Request body (một batch 5 giây):
   ```json
   {
     "sessionId": "uuid",
     "batchStartTs": 1712345678000,
     "batchEndTs": 1712345683000,
     "eyeTracking": [
       { "ts": 1712345678500, "gaze": "screen" },
       { "ts": 1712345679000, "gaze": "away", "awayAngleDeg": 25 }
     ],
     "fillerWords": {
       "ts": 1712345683000,
       "windowDurationMs": 5000,
       "fillerCount": 2,
       "fillerRate": 0.08,
       "detectedFillers": ["ừm", "như là"]
     },
     "expressions": [
       { "ts": 1712345678000, "expression": "stressed", "confidence": 0.72 },
       { "ts": 1712345680000, "expression": "neutral", "confidence": 0.85 }
     ]
   }
   ```
3. BE validate và append vào `combat_metrics_log` (xem schema dưới).
4. Không xử lý phức tạp ở đây – chỉ lưu raw data, xử lý tổng hợp ở pipeline chấm điểm cuối.

**DB Schema:**
```sql
CREATE TABLE combat_metrics_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_session_id UUID REFERENCES interview_sessions(id),
  batch_start_ts BIGINT NOT NULL,
  batch_end_ts BIGINT NOT NULL,
  eye_tracking_data JSONB NOT NULL DEFAULT '[]',
  filler_word_data JSONB,
  expression_data JSONB NOT NULL DEFAULT '[]',
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index để query nhanh theo session
CREATE INDEX idx_combat_metrics_session ON combat_metrics_log(interview_session_id, batch_start_ts);
```

---

## Task 3.11: BE – Multimodal Scoring Pipeline (Cuối phiên)

**Mô tả:** Sau khi phiên thi kết thúc, tổng hợp toàn bộ metric thành điểm soft-skills và insights.

**Chi tiết công việc:**

1. Trigger: Được gọi từ `POST /api/interview/sessions/:id/complete` nếu `mode = 'combat'`.
2. Query toàn bộ `combat_metrics_log` của session.
3. **Tính toán thuần code (không gọi LLM):**

   **Eye-Tracking Score:**
   ```
   screenGazePercent = (frames có gaze='screen') / totalFrames * 100
   score = screenGazePercent  // 0-100
   ```

   **Filler Word Score:**
   ```
   avgFillerRate = mean(fillerRate của tất cả FillerFrame)
   score = max(0, 100 - avgFillerRate * 500)  // 15% filler → 25 điểm
   ```

   **Expression Score:**
   ```
   confidentFrames = frames với expression='confident' AND confidence >= 0.6
   stressedFrames  = frames với expression='stressed' AND confidence >= 0.6
   expressionScore = (confidentFrames - stressedFrames * 0.5) / totalValidFrames * 100
   ```

4. Build summary JSON → đẩy vào LLM để sinh narrative feedback (không tính điểm bằng LLM):
   ```
   "Ứng viên duy trì giao tiếp bằng mắt 78% thời gian. Tỉ lệ filler word 12%
    (ngưỡng tốt < 5%). Biểu cảm chủ yếu 'stressed' trong 3 phút đầu, sau đó
    chuyển sang 'neutral'. Đưa ra nhận xét và gợi ý cải thiện."
   ```

5. Kết quả lưu vào `interview_sessions.multimodal_score` (JSONB):
   ```json
   {
     "eye_tracking": { "score": 78, "screen_gaze_percent": 78, "feedback": "..." },
     "filler_words": { "score": 45, "avg_filler_rate": 0.12, "top_fillers": ["ừm","như là"], "feedback": "..." },
     "expression": { "score": 62, "dominant_expression": "neutral", "stress_peak_minutes": [1, 2], "feedback": "..." },
     "overall_soft_skill_score": 62
   }
   ```

---

## Task 3.12: Real-time Multimodal Context Feed to AI (Enrichment)

**Mô tả:** Inject multimodal signals (expression, gaze, filler rate) vào AI system prompt để AI điều chỉnh behavior real-time — giống interviewer thật quan sát body language.

**Chi tiết công việc:**

1. **FE — Aggregated snapshot mỗi turn (không phải mỗi frame):**
   ```ts
   // MultimodalEngine expose snapshot cho Orchestrator
   interface MultimodalContext {
     dominantExpression: MicroExpression;  // 'stressed' | 'confident' | 'neutral' | 'uncertain'
     expressionConfidence: number;         // 0-1
     gazeOnScreenPercent: number;          // % thời gian nhìn camera trong turn vừa rồi
     fillerRate: number;                   // Filler rate trong turn vừa rồi
     speakingPaceWpm: number;              // Words per minute (ước lượng từ STT)
     turnDurationMs: number;               // Thời gian ứng viên nói
   }

   // Gửi kèm message payload lên BE
   const payload: CombatMessagePayload = {
     content: transcript,
     inputType: 'voice',
     multimodalContext: multimodalEngine.getLatestSnapshot(),
   };
   ```

2. **BE — Inject hint vào system prompt (lightweight, selective):**
   ```ts
   // server/src/combat/multimodal-hint.service.ts
   function buildMultimodalHint(ctx: MultimodalContext): string | null {
     const hints: string[] = [];

     if (ctx.dominantExpression === 'stressed' && ctx.expressionConfidence > 0.7) {
       hints.push('Candidate appears tense. Use a warmer, encouraging tone. Give more time to think.');
     }
     if (ctx.gazeOnScreenPercent < 40) {
       hints.push('Candidate frequently looks away from the camera. They might be reading notes or feeling uncomfortable.');
     }
     if (ctx.speakingPaceWpm > 180 && ctx.fillerRate > 0.15) {
       hints.push('Candidate is speaking very quickly with many filler words — likely nervous. Slow down your own pace and use reassuring language.');
     }
     if (ctx.turnDurationMs < 10_000 && ctx.fillerRate < 0.03) {
       hints.push('Candidate gave a very brief, clean answer. Consider probing deeper.');
     }

     return hints.length > 0
       ? `\n[Interviewer observation: ${hints.join(' ')}]`
       : null;
   }
   ```

3. **Nguyên tắc:**
   - Hint là **suggestion**, không phải command. LLM tự quyết định có điều chỉnh hay không.
   - Không gửi raw data (landmarks, RMS) — chỉ gửi human-readable hint.
   - **Rate-limit: Tối đa 1 hint mỗi 2 turns** để không pollute context window.
   - Nếu multimodal engine bị lỗi / confidence thấp → không gửi hint (graceful skip).

---

## Quản trị rủi ro tổng hợp

| # | Rủi ro | Lớp | Giải pháp |
|---|---|---|---|
| 1 | TTS latency tạo dead air (>1s giữa câu) | Interaction | Sentence-level TTS streaming: TTS từng câu song song với LLM generation |
| 2 | TTS cost tăng nhanh khi scale | Interaction | Cache reusable phrases trong IndexedDB (greeting, transitions), Web Speech API fallback |
| 3 | Echo/feedback loop giữa TTS speaker và mic | Interaction | Mic mute khi TTS play + 200ms echo decay buffer trước khi unmute |
| 4 | Web Speech API STT không ổn định trên mọi browser | Interaction | Feature detection, fallback guidance cho user (dùng Chrome), hoặc Whisper API fallback |
| 5 | Orchestrator state desync giữa FE và BE | Interaction | BE là source of truth cho session state. FE sync qua response metadata mỗi turn |
| 6 | Auto-transition cắt ngang ý chưa xong | Interaction | Grace period: đợi silence > 3s sau khi candidate dừng nói mới transition |
| 7 | MediaPipe + TTS decode + STT cùng chạy → CPU overload | All | Giảm Face Mesh xuống 1fps khi CPU > 80%, TTS decode trong Web Worker |
| 8 | Tiếng Việt TTS chất lượng kém | Interaction | Google Cloud TTS vi-VN-Neural2 hoặc ElevenLabs multilingual v2 |
| 9 | MediaPipe WASM load chậm (2-4s) | Analysis | Preload khi user ở Permission Gate (Task 0.3b), không chờ vào phòng thi |
| 10 | CPU cao khi chạy Face Mesh liên tục | Analysis | Frequency 2fps (500ms/frame), không phải 30fps |
| 11 | Ánh sáng kém → kết quả expression/gaze sai | Analysis | Discard frames có `confidence < 0.6`, không tính vào score |
| 12 | Battery drain trên laptop | Analysis | `requestIdleCallback` cho tác vụ không urgent, pause khi tab không focus |
| 13 | User text mode → filler word = 0 không có nghĩa | Analysis | Chỉ tính filler score khi `inputType = 'voice'` VÀ `totalWordCount > 50` |
| 14 | Realtime context hints làm LLM confused | Scoring | Rate-limit 1 hint/2 turns, observation format rõ ràng, skip khi low confidence |
