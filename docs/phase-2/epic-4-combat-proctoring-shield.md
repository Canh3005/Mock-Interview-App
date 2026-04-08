# Epic 4: Khiên Giám sát & Chống gian lận (Combat Mode – Proctoring Shield)

> **Scope:** CHỈ kích hoạt trong **Combat Mode**. Practice Mode không chạy bất kỳ component nào trong Epic này.

Epic xây dựng hệ thống giám sát tính minh bạch của phiên thi. Nguyên tắc thiết kế:

- **Silent Flagging** – tuyệt đối không đuổi user ra khỏi phòng thi khi phát hiện bất thường. Chỉ ghi nhận cờ đỏ (Red Flag) kèm timestamp để HR hậu kiểm, tránh False Positive gây ức chế tâm lý.
- **TTS-Aware Detection** – mọi audio/voice detection phải biết khi nào AI đang phát TTS để tránh false positive từ echo.
- **Correlation over Isolation** – các flag đơn lẻ không kết luận gian lận. Integrity score kết hợp nhiều tín hiệu + multimodal data (Epic 3) để giảm false positive.

```
┌─────────────────────────────────────────────────────────┐
│                  DETECTION LAYER                         │
│  Tab Monitor · Multi-Face · Second Voice · Screen Rec    │
│  Tasks 4.1 – 4.4                                         │
├─────────────────────────────────────────────────────────┤
│                  INGESTION LAYER                         │
│  Event API · Buffer · Graceful Degradation               │
│  Tasks 4.5 – 4.6                                         │
├─────────────────────────────────────────────────────────┤
│                  SCORING & DISPLAY LAYER                 │
│  Integrity Calculator · Correlation Engine · UI          │
│  Tasks 4.7 – 4.9                                         │
└─────────────────────────────────────────────────────────┘
```

---

# DETECTION LAYER (Tasks 4.1 – 4.4)

---

## Task 4.1: FE – Tab/Focus Monitoring (Page Visibility API)

**Mô tả:** Phát hiện ứng viên chuyển tab hoặc thu nhỏ cửa sổ trong khi thi.

**Chi tiết công việc:**

1. **Readiness Gate trước khi start Combat Mode** (gộp cùng pre-check camera/mic):
  - Chưa start phiên ngay khi user bấm "Vào Combat".
  - Chỉ cho phép bắt đầu khi đồng thời đạt các điều kiện:
    - Camera permission: `granted` và stream hoạt động.
    - Microphone permission: `granted` và stream hoạt động.
    - Tab đang active: `document.hidden === false`.
    - Cửa sổ đang focus: `document.hasFocus() === true`.
    - Kích thước viewport đạt tối thiểu (khuyến nghị >= 70% diện tích màn hình).
  - Nếu chưa đạt: hiển thị màn hình "Bạn chưa sẵn sàng" với checklist + nút "Kiểm tra lại".
  - Chỉ khi trạng thái ổn định liên tục 1-2 giây mới gọi `startCombatSession()`.
  ```ts
  async function enterCombatWithReadinessGate(): Promise<void> {
    showReadinessGate();

    await waitUntilReady({
     stableMs: 1500,
     requireCamera: true,
     requireMicrophone: true,
     requireVisibleTab: true,
     requireFocusedWindow: true,
     minViewportRatio: 0.7,
    });

    startCombatSession();
    registerFocusListeners();
  }
  ```

2. Đăng ký listener ngay sau khi readiness gate pass:
   ```ts
   document.addEventListener('visibilitychange', handleVisibilityChange);
   window.addEventListener('blur', handleWindowBlur);
   window.addEventListener('focus', handleWindowFocus);
   ```

3. Logic xử lý sự kiện:
   ```ts
   interface FocusEvent {
     ts: number;
     type: 'TAB_HIDDEN' | 'TAB_VISIBLE' | 'WINDOW_BLUR' | 'WINDOW_FOCUS';
     durationMs?: number;  // Tính khi focus trở lại: bao lâu bị blur
   }
   ```

4. **Không hiện cảnh báo popup** khi phát hiện (silent). Chỉ:
   - Lưu event vào local buffer.
   - Emit `POST /api/combat/sessions/:id/proctoring-event` (non-blocking, fire-and-forget).

5. Nếu tab bị ẩn > 10 giây liên tiếp → tạo `ProctoringFlag` với severity `HIGH`.

6. **Ngoại lệ hợp lệ (whitelist):**
   - User mở DevTools (detectable qua window resize pattern) → Flag nhưng severity `LOW`.
   - User copy text từ đề bài (selection event trong phạm vi đề bài container) → Không flag.

7. **Grace Period đầu phiên:**
  - Bỏ qua focus/tab flags trong 3-5 giây đầu sau `startCombatSession()` để tránh false positive do popup quyền trình duyệt.
  - Chỉ bắt đầu tính duration cho `TAB_HIDDEN` sau khi đã có ít nhất 1 lần `WINDOW_FOCUS` ổn định.

8. **Tương tác với Orchestrator (Epic 3):**
   ```ts
   // Khi tab bị ẩn, thông báo orchestrator
   orchestrator.on('stateChange', ({ state }) => {
     // Nếu AI đang nói (TTS) và user switch tab:
     // → TTS tiếp tục phát (user vẫn nghe được)
     // → Flag TAB_HIDDEN nhưng severity giảm xuống MEDIUM
     //    (vì user có thể đang nghe AI nói mà nhìn chỗ khác)
   });

   function handleTabHidden(): void {
     const isAiSpeaking = orchestrator.state === 'AI_ASKING';
     const severity = isAiSpeaking ? 'MEDIUM' : 'HIGH';
     bufferEvent({ ts: Date.now(), type: 'TAB_HIDDEN', severity });
   }
   ```

---

## Task 4.2: FE – Multi-Face Detection (Reuse MultimodalEngine FaceMesh)

**Mô tả:** Phát hiện khi có nhiều hơn 1 khuôn mặt trong frame webcam, dấu hiệu có người hỗ trợ bên cạnh.

**Nguyên tắc thiết kế:** Epic 3 (Task 3.7, 3.9) đã chạy **MediaPipe FaceMesh** trong `MultimodalEngine`. Tạo thêm một `FaceDetection` instance riêng sẽ tốn thêm tài nguyên GPU/CPU trên cùng camera stream. Task này **reuse** FaceMesh inference đang chạy bằng cách:
1. Tăng `maxNumFaces` của FaceMesh từ `1` lên `3` (thay đổi nhỏ trong Epic 3 Task 3.7).
2. `MultimodalEngine` expose thêm `faceCount` trong snapshot.
3. Task 4.2 subscribe vào `multimodalEngine` thay vì tạo pipeline riêng.

**Chi tiết công việc:**

1. **Yêu cầu thay đổi Epic 3 Task 3.7** — Update FaceMesh config:
   ```ts
   // client/src/services/EyeTrackingAnalyzer.ts (Epic 3)
   faceMesh.setOptions({
     maxNumFaces: 3,          // Tăng từ 1 → 3 để detect multi-face
     refineLandmarks: true,
   });

   // MultimodalEngine expose thêm faceCount
   class MultimodalEngine {
     // ... existing methods
     getFaceCount(): number {
       return this.eyeTrackingAnalyzer.getLastFaceCount();
     }
   }
   ```

2. **Task 4.2 subscribe vào MultimodalEngine** (không tạo FaceDetection mới):
   ```ts
   // client/src/services/proctoring/MultiFaceMonitor.ts
   class MultiFaceMonitor {
     private consecutiveMultiFaceMs = 0;
     private consecutiveNoFaceMs = 0;
     private lastCheckTs = 0;
     private intervalId: ReturnType<typeof setInterval> | null = null;

     start(multimodalEngine: MultimodalEngine, onFlag: (flag: FaceFlag) => void): void {
       this.intervalId = setInterval(() => {
         const now = Date.now();
         const elapsed = now - this.lastCheckTs;
         this.lastCheckTs = now;

         const faceCount = multimodalEngine.getFaceCount();

         if (faceCount === 0) {
           this.consecutiveMultiFaceMs = 0;
           this.consecutiveNoFaceMs += elapsed;
           if (this.consecutiveNoFaceMs >= 15_000) {
             onFlag({ ts: now, type: 'NO_FACE', severity: 'MEDIUM' });
             this.consecutiveNoFaceMs = 0; // Reset để không spam
           }
         } else if (faceCount >= 2) {
           this.consecutiveNoFaceMs = 0;
           this.consecutiveMultiFaceMs += elapsed;
           if (this.consecutiveMultiFaceMs >= 3_000) {
             onFlag({ ts: now, type: 'MULTIPLE_FACES', severity: 'HIGH' });
             this.consecutiveMultiFaceMs = 0;
           }
         } else {
           // faceCount === 1: bình thường
           this.consecutiveMultiFaceMs = 0;
           this.consecutiveNoFaceMs = 0;
         }
       }, 1_000);
     }

     stop(): void {
       if (this.intervalId) clearInterval(this.intervalId);
     }
   }
   ```

3. **Debounce trước khi tạo Flag:**
   - Chỉ tạo `MULTIPLE_FACES` flag nếu phát hiện liên tiếp > **3 giây**.
   - Chỉ tạo `NO_FACE` flag nếu không có mặt > **15 giây**.
   - Reset counter sau mỗi lần flag để tránh spam.

4. **Tương tác với Orchestrator:**
   ```ts
   // Nếu NO_FACE kéo dài > 15s trong khi state = CANDIDATE_SPEAKING:
   // → Có thể candidate rời ghế
   // → Nếu > 60s: auto-flag HIGH + orchestrator ghi nhận NO_RESPONSE
   ```

---

## Task 4.3: FE – Second Voice Detection (Reuse VAD) — TTS-Aware

**Mô tả:** Phát hiện tiếng nói của người thứ 2 trong phòng – dấu hiệu có người nhắc bài. **Phải phối hợp với TTS Engine (Epic 3, Task 3.2)** để tránh false positive từ AI speaker output.

**Nguyên tắc thiết kế:** Epic 3 Task 3.5 đã tạo `VoiceActivityDetector` với `AudioContext` + `AnalyserNode` phân tích cùng microphone stream. Tạo thêm `AudioContext` mới trong Task 4.3 là **redundant**. Task này subscribe vào kết quả VAD sẵn có, không tạo pipeline audio riêng.

**Chi tiết công việc:**

1. **Reuse `VoiceActivityDetector` từ Epic 3 Task 3.5** — VAD đã expose `rmsLevel` mỗi 100ms qua callback:
   ```ts
   // client/src/services/proctoring/SecondVoiceDetector.ts
   class SecondVoiceDetector {
     private secondVoiceCounter = 0;         // Số lần 200ms-tick phát hiện suspicious
     private readonly TICKS_TO_FLAG = 25;    // 25 × 200ms = 5 giây liên tục

     // VAD từ Epic 3 được inject vào — không tạo AudioContext mới
     constructor(
       private readonly vad: VoiceActivityDetector,
       private readonly orchestrator: CombatOrchestrator,
       private readonly ttsPlayer: TtsPlayer,
       private readonly onFlag: (event: AudioFlag) => void,
     ) {}

     // STT service expose lastTranscriptUpdatedAt (timestamp của lần cuối nhận token)
     // Được inject để tránh circular dependency
     private getLastTranscriptTs: () => number = () => 0;

     setTranscriptTsGetter(fn: () => number): void {
       this.getLastTranscriptTs = fn;
     }
   ```

2. **TTS-Aware Detection — 3 chế độ theo Orchestrator state:**

   | Orchestrator State | Mic Status | Second Voice Detection |
   |---|---|---|
   | `AI_ASKING` / `AI_FOLLOW_UP` | **Muted** | **OFF** — AI đang phát TTS, mic mute nên không có input |
   | `CANDIDATE_THINKING` | Unmuted sau 200ms | **ON** — nếu detect voice nhưng candidate chưa bắt đầu nói → suspicious |
   | `CANDIDATE_SPEAKING` | Active (STT running) | **ON** — phân biệt giọng candidate vs giọng lạ qua transcript |

   ```ts
     private shouldRun(): boolean {
       const state = this.orchestrator.currentState;
       return (
         (state === 'CANDIDATE_THINKING' || state === 'CANDIDATE_SPEAKING') &&
         !this.ttsPlayer.isPlaying
       );
     }
   ```

3. **Phân tích dùng VAD result (mỗi 200ms):**
   ```ts
     analyze(): void {
       if (!this.shouldRun()) {
         this.secondVoiceCounter = 0;
         return;
       }

       // Lấy kết quả VAD gần nhất (VAD chạy mỗi 100ms, lấy snapshot)
       const vadResult = this.vad.getLastResult();
       const state = this.orchestrator.currentState;
       const SPEECH_THRESHOLD = 0.05; // RMS ngưỡng = đang nói (từ Epic 3 Task 3.5)

       const isSpeechDetected = vadResult.rmsLevel > SPEECH_THRESHOLD;

       if (state === 'CANDIDATE_THINKING' && isSpeechDetected) {
         // Có tiếng nói trong lúc candidate "đang nghĩ" — suspicious
         this.secondVoiceCounter++;
       } else if (state === 'CANDIDATE_SPEAKING' && isSpeechDetected) {
         // Audio present nhưng STT không nhận transcript mới → possible second voice
         const hasNewTranscript = this.getLastTranscriptTs() > Date.now() - 500;
         if (!hasNewTranscript) this.secondVoiceCounter++;
       } else {
         this.secondVoiceCounter = Math.max(0, this.secondVoiceCounter - 1); // Decay
       }

       if (this.secondVoiceCounter >= this.TICKS_TO_FLAG) {
         this.onFlag({
           ts: Date.now(),
           type: 'SECOND_VOICE',
           severity: 'HIGH',
           metadata: {
             orchestratorState: state,
             ttsWasPlaying: this.ttsPlayer.isPlaying,
             rmsLevel: vadResult.rmsLevel,
           },
         });
         this.secondVoiceCounter = 0; // Reset để không spam
       }
     }
   }
   ```

4. **Ngưỡng thận trọng:** Chỉ flag `SECOND_VOICE` khi tín hiệu duy trì > **5 giây** liên tục (`TICKS_TO_FLAG = 25` × 200ms). Counter decay dần khi không detect — tránh accumulate từ nhiều burst nhỏ.

5. Metadata gửi lên BE kèm event:
   ```ts
   interface AudioFlag {
     ts: number;
     type: 'SECOND_VOICE';
     severity: 'HIGH';
     metadata: {
       orchestratorState: CombatState; // Ghi lại state để BE biết context
       ttsWasPlaying: boolean;         // Audit trail
       rmsLevel: number;               // 0.0 - 1.0
     };
   }
   ```

---

## Task 4.4: FE – Screen Recording Detection — ~~DROPPED~~

**Quyết định kiến trúc: Task này bị loại khỏi scope.**

**Lý do:**
- Frame timing jitter > 50ms có thể do: antivirus scan, background tab, GPU driver, battery saver, browser GC pause, OS scheduler — hoàn toàn không liên quan đến screen recording.
- Signal-to-noise ratio quá thấp: sẽ tạo ra hàng chục LOW flags sai lệch mỗi phiên, làm ô nhiễm correlation data và tăng false positive rate của Integrity Score.
- Không có Web API nào cho phép detect screen recording một cách đáng tin cậy. Chỉ có `navigator.mediaDevices.getDisplayMedia()` nhưng ứng viên không cần gọi API đó để dùng OBS hoặc phần mềm record ngoài.
- Severity LOW + không thể kết luận = không có giá trị thực cho HR.

**Thay thế:** Nếu cần phòng chống screen sharing trong tương lai, giải pháp đúng là yêu cầu ứng viên bật **screen share về phía hệ thống** (như Honorlock/ProctorU) — nằm ngoài scope dự án này.

---

# INGESTION LAYER (Tasks 4.5 – 4.6)

---

## Task 4.5: BE – Proctoring Event Ingestion API

**Mô tả:** Nhận và phân loại các sự kiện proctoring từ FE.

**Chi tiết công việc:**

1. Endpoint: `POST /api/combat/sessions/:id/proctoring-event`
2. Request body:
   ```json
   {
     "clientEventId": "uuid-v4",
     "sessionId": "uuid",
     "ts": 1712345678000,
     "eventType": "TAB_HIDDEN" | "MULTIPLE_FACES" | "NO_FACE" | "SECOND_VOICE" | "FOCUS_LOST",
     "severity": "LOW" | "MEDIUM" | "HIGH",
     "durationMs": 12000,
     "metadata": {
       "orchestratorState": "CANDIDATE_SPEAKING",
       "ttsWasPlaying": false
     }
   }
   ```
   > `clientEventId` là UUID do FE tạo ngay khi phát sinh event — đảm bảo idempotency khi FE retry hoặc flush đồng thời qua nhiều đường.

3. BE xử lý:
   - Upsert vào `proctoring_events` theo `client_event_id` (ON CONFLICT DO NOTHING).
   - Nếu `severity = 'HIGH'`: Cộng vào `proctoring_sessions.high_flag_count`.
   - Không gửi bất kỳ response nào về FE (fire-and-forget pattern – FE không đợi).

4. **Batch endpoint** cho flush cuối phiên:
   ```
   POST /api/combat/sessions/:id/proctoring-event/batch
   Body: { events: ProctoringEvent[] }
   ```
   BE dùng `INSERT ... ON CONFLICT (client_event_id) DO NOTHING` để xử lý safe khi batch và single-event overlap.

**DB Schema:**
```sql
CREATE TABLE proctoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_session_id UUID REFERENCES interview_sessions(id) UNIQUE,
  high_flag_count INT DEFAULT 0,
  medium_flag_count INT DEFAULT 0,
  low_flag_count INT DEFAULT 0,
  integrity_score INT DEFAULT 100,  -- Được tính lại cuối phiên, không update real-time
  summary JSONB,                    -- Tóm tắt sau khi phiên kết thúc
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE proctoring_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_event_id UUID NOT NULL,                        -- Idempotency key từ FE
  proctoring_session_id UUID REFERENCES proctoring_sessions(id),
  ts BIGINT NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(10) NOT NULL,
  duration_ms INT,
  metadata JSONB,                   -- Bao gồm orchestratorState, ttsWasPlaying
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_proctoring_client_event UNIQUE (client_event_id)  -- Chặn duplicate
);

CREATE INDEX idx_proctoring_events_session ON proctoring_events(proctoring_session_id, ts);
```

---

## Task 4.6: FE – Graceful Degradation khi mất kết nối

**Mô tả:** Xử lý khi mạng bị ngắt giữa chừng mà không mất dữ liệu proctoring.

**Chi tiết công việc:**

1. Toàn bộ event buffer lưu trong `IndexedDB` (không chỉ memory):
   ```ts
   // Mỗi proctoring event được persist ngay lập tức
   await idb.put('proctoringBuffer', event);
   ```

2. Khi mạng phục hồi (online event): Flush toàn bộ `IndexedDB` buffer lên BE.

3. Khi phiên thi kết thúc: Lần flush cuối cùng là **synchronous** (dùng `sendBeacon` API):
   ```ts
   navigator.sendBeacon(
     `/api/combat/sessions/${sessionId}/proctoring-event/batch`,
     JSON.stringify(remainingBuffer)
   );
   ```
   `sendBeacon` đảm bảo dữ liệu được gửi ngay cả khi user đóng tab.

4. **Tương tác với Orchestrator khi mất mạng:**

   > **Lưu ý:** `CombatOrchestrator` (Epic 3 Task 3.1) cần bổ sung 2 method `pause(reason)` và `resume()` để hỗ trợ network interruption. Nếu chưa có, implement bằng cách transition sang state `PAUSED` (thêm vào `CombatState` union type) và lưu `previousState` để resume.

   ```ts
   // Yêu cầu thêm vào Epic 3 Task 3.1 — CombatOrchestrator:
   // pause(reason: string): void  → lưu currentState, transition sang 'PAUSED', dừng timer
   // resume(): void               → transition về previousState, resume timer

   // TTS switching: TtsPlayer (Epic 3 Task 3.2) và TtsFallback đang là 2 class riêng.
   // Cần wrap thành TtsManager để Epic 4 có thể switch không cần biết implementation:
   // client/src/services/TtsManager.ts
   // switchToFallback(): void  → dùng Web Speech API (TtsFallback)
   // switchToPrimary(): void   → dùng Cloud TTS (TtsPlayer)

   window.addEventListener('offline', () => {
     // Orchestrator dừng timer, giữ nguyên state để resume sau
     orchestrator.pause('NETWORK_LOST');
     // TtsManager switch sang Web Speech API (offline)
     ttsManager.switchToFallback();
   });

   window.addEventListener('online', () => {
     orchestrator.resume();
     ttsManager.switchToPrimary();   // Cloud TTS
     flushProctoringBuffer();        // Gửi events đã buffer
   });
   ```

---

# SCORING & DISPLAY LAYER (Tasks 4.7 – 4.9)

---

## Task 4.7: BE – Integrity Score Calculator with Correlation Engine (Cuối phiên)

**Mô tả:** Tổng hợp toàn bộ proctoring events thành `integrity_score`, **kết hợp với multimodal data (Epic 3)** để tăng accuracy và giảm false positive, rồi sinh báo cáo cho HR.

**Chi tiết công việc:**

1. Trigger: Được gọi từ **`BehavioralSessionService.processScoring(sessionId)`** — cùng queue job với behavioral scoring và multimodal scoring. Toàn bộ 3 pipeline (behavioral, multimodal, integrity) đều chạy trong `processScoring` sau khi phiên kết thúc, không trigger riêng từ endpoint `/complete`.

2. **Bước 1 — Base Deductions (tính `integrity_score` từ proctoring events):**
   ```
   Bắt đầu từ 100, trừ dần:

   Mỗi HIGH flag:    -15 điểm
   Mỗi MEDIUM flag:  -7 điểm
   Mỗi LOW flag:     -2 điểm
   Minimum score:     0
   ```

   | Event Type | Điều kiện | Severity | Trừ điểm |
   |---|---|---|---|
   | TAB_HIDDEN | > 10s | HIGH | -15 |
   | TAB_HIDDEN | 3-10s | MEDIUM | -7 |
   | TAB_HIDDEN | khi AI đang nói (TTS) | MEDIUM (giảm từ HIGH) | -7 |
   | MULTIPLE_FACES | > 3s liên tục | HIGH | -15 |
   | SECOND_VOICE | > 5s liên tục | HIGH | -15 |
   | NO_FACE | > 15s | MEDIUM | -7 |
   | WINDOW_BLUR | < 3s | LOW | -2 |

3. **Bước 2 — Correlation Adjustments (kết hợp multimodal data từ Epic 3):**

   **Data sources cho correlation:**
   - `CombatSessionAggregate` (Epic 3): aggregate session-level stats — `eyeScreenFrames / eyeTotalFrames`, `exprConfidentCount`, `exprStressedCount`, `exprTotalValid`. **Không còn dùng `combat_metrics_log`** (bảng này đã được thay thế bởi aggregate model).
   - `behavioral_stage_logs` (Epic 1): `relevanceScore` field trên mỗi log AI để tính chất lượng câu trả lời gần timestamp của proctoring event.

   **`CorrelationQueryService`** — định nghĩa helper functions:
   ```ts
   // server/src/combat/correlation-query.service.ts
   @Injectable()
   export class CorrelationQueryService {

     constructor(
       @InjectRepository(CombatSessionAggregate)
       private aggRepo: Repository<CombatSessionAggregate>,
       @InjectRepository(BehavioralStageLog)
       private logRepo: Repository<BehavioralStageLog>,
     ) {}

     /**
      * Tính % thời gian gaze on-screen toàn phiên (từ CombatSessionAggregate).
      * Không còn hỗ trợ time-window — dữ liệu đã được aggregate ở FE trước khi gửi lên.
      * Trả -1 nếu không có data.
      */
     async getSessionGazePercent(behavioralSessionId: string): Promise<number> {
       const agg = await this.aggRepo.findOneBy({ behavioralSessionId });
       if (!agg || agg.eyeTotalFrames === 0) return -1;
       return Math.round((agg.eyeScreenFrames / agg.eyeTotalFrames) * 100);
     }

     /**
      * Lấy expression dominant toàn phiên (từ CombatSessionAggregate).
      * Trả null nếu không có data hợp lệ.
      */
     async getSessionDominantExpression(
       behavioralSessionId: string,
     ): Promise<'confident' | 'stressed' | 'neutral' | null> {
       const agg = await this.aggRepo.findOneBy({ behavioralSessionId });
       if (!agg || agg.exprTotalValid === 0) return null;
       const neutralCount = Math.max(
         0,
         agg.exprTotalValid - agg.exprConfidentCount - agg.exprStressedCount,
       );
       const counts: Record<string, number> = {
         confident: agg.exprConfidentCount,
         stressed: agg.exprStressedCount,
         neutral: neutralCount,
       };
       return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null) as
         | 'confident'
         | 'stressed'
         | 'neutral'
         | null;
     }

     /**
      * Lấy relevanceScore của AI log gần nhất trước/sau timestamp.
      * relevanceScore từ behavioral_stage_logs.relevanceScore (Epic 1).
      */
     async getRelevanceScoreNear(
       behavioralSessionId: string,
       ts: number,
       direction: 'before' | 'after',
     ): Promise<number | null> {
       const logs = await this.logRepo.find({
         where: { behavioralSessionId, role: 'AI_FACILITATOR' },
         order: { timestamp: direction === 'before' ? 'DESC' : 'ASC' },
       });
       const tsDate = new Date(ts);
       const match = direction === 'before'
         ? logs.find(l => l.timestamp <= tsDate && l.relevanceScore != null)
         : logs.find(l => l.timestamp >= tsDate && l.relevanceScore != null);
       return match?.relevanceScore ?? null;
     }

     /**
      * Gom events vào windows 30s, trả về array of event groups.
      */
     groupEventsIntoWindows(
       events: ProctoringEvent[],
       windowMs: number,
     ): ProctoringEvent[][] {
       if (events.length === 0) return [];
       const sorted = [...events].sort((a, b) => a.ts - b.ts);
       const windows: ProctoringEvent[][] = [];
       let windowStart = sorted[0].ts;
       let currentWindow: ProctoringEvent[] = [];

       for (const e of sorted) {
         if (e.ts - windowStart > windowMs) {
           if (currentWindow.length) windows.push(currentWindow);
           currentWindow = [];
           windowStart = e.ts;
         }
         currentWindow.push(e);
       }
       if (currentWindow.length) windows.push(currentWindow);
       return windows;
     }
   }
   ```

   **Correlation logic dùng service trên:**
   ```ts
   interface CorrelationAdjustment {
     type: 'mitigation' | 'aggravation';
     points: number;
     reason: string;
   }

   async function calculateCorrelations(
     behavioralSessionId: string,
     events: ProctoringEvent[],
     correlationQuery: CorrelationQueryService,
   ): Promise<CorrelationAdjustment[]> {
     const adjustments: CorrelationAdjustment[] = [];

     // --- MITIGATIONS ---

     // M1: TAB_HIDDEN nhưng gaze on-screen toàn phiên cao (session-level, không time-windowed)
     // Nếu candidate duy trì gaze tốt (≥70%) trong toàn phiên → các tab switch ngắn có thể là
     // false positive (OS notification, alt-tab vô tình). Áp dụng 1 lần duy nhất.
     const tabHiddenEvents = events.filter(e => e.event_type === 'TAB_HIDDEN');
     if (tabHiddenEvents.length > 0) {
       const screenPct = await correlationQuery.getSessionGazePercent(behavioralSessionId);
       if (screenPct >= 0 && screenPct >= 70) {
         adjustments.push({
           type: 'mitigation',
           points: +5,
           reason: `${tabHiddenEvents.length} TAB_HIDDEN event(s) nhưng gaze on-screen ${screenPct}% toàn phiên → likely false positive`,
         });
       }
     }

     // M2: Flag đơn lẻ không lặp lại (isolated incident, không phải pattern)
     const eventsByType = Object.entries(
       events.reduce((acc, e) => { (acc[e.event_type] ??= []).push(e); return acc; }, {} as Record<string, ProctoringEvent[]>)
     );
     for (const [type, typeEvents] of eventsByType) {
       if (typeEvents.length === 1 && typeEvents[0].severity !== 'HIGH') {
         adjustments.push({
           type: 'mitigation',
           points: +3,
           reason: `${type} xảy ra 1 lần duy nhất → isolated, không phải pattern`,
         });
       }
     }

     // --- AGGRAVATIONS ---

     // A1: Chất lượng câu trả lời tăng đột biến sau tab switch
     // Nguồn: behavioral_stage_logs.relevanceScore (Epic 1 scoring pipeline)
     for (const event of events.filter(e => e.event_type === 'TAB_HIDDEN' && (e.duration_ms ?? 0) > 5_000)) {
       const scoreBefore = await correlationQuery.getRelevanceScoreNear(behavioralSessionId, event.ts, 'before');
       const scoreAfter  = await correlationQuery.getRelevanceScoreNear(behavioralSessionId, event.ts + (event.duration_ms ?? 0), 'after');
       if (scoreBefore != null && scoreAfter != null && scoreAfter > scoreBefore + 0.3) {
         adjustments.push({
           type: 'aggravation',
           points: -10,
           reason: `Response quality spike (${scoreBefore.toFixed(2)}→${scoreAfter.toFixed(2)}) sau TAB_HIDDEN ${event.duration_ms}ms → possible lookup`,
         });
       }
     }

     // A2: SECOND_VOICE + biểu cảm stressed toàn phiên = có thể nhờ người khác
     // Dùng session-level dominant expression (không còn time-windowed)
     const secondVoiceEvents = events.filter(e => e.event_type === 'SECOND_VOICE');
     if (secondVoiceEvents.length > 0) {
       const dominant = await correlationQuery.getSessionDominantExpression(behavioralSessionId);
       if (dominant === 'stressed') {
         adjustments.push({
           type: 'aggravation',
           points: -5,
           reason: `${secondVoiceEvents.length} SECOND_VOICE event(s) + expression dominant '${dominant}' toàn phiên → pattern suspicious`,
         });
       }
     }

     // A3: 3+ flag types khác nhau trong cùng 30s window → coordinated
     const windows = correlationQuery.groupEventsIntoWindows(events, 30_000);
     for (const w of windows) {
       const uniqueTypes = new Set(w.map(e => e.event_type));
       if (uniqueTypes.size >= 3) {
         adjustments.push({
           type: 'aggravation',
           points: -10,
           reason: `${uniqueTypes.size} flag types trong 30s window → pattern suspicious`,
         });
       }
     }

     // Cap: tổng adjustments không vượt quá ±20 điểm
     const totalPoints = adjustments.reduce((s, a) => s + a.points, 0);
     if (totalPoints > 20)  adjustments.push({ type: 'mitigation',   points: 20 - totalPoints,  reason: 'cap +20' });
     if (totalPoints < -20) adjustments.push({ type: 'aggravation',  points: -20 - totalPoints, reason: 'cap -20' });

     return adjustments;
   }
   ```

4. **Bước 3 — Final Score:**
   ```ts
   function calculateFinalIntegrityScore(
     baseDeductions: number,
     adjustments: CorrelationAdjustment[],
   ): number {
     let score = 100 - baseDeductions;

     for (const adj of adjustments) {
       score += adj.points; // Positive for mitigations, negative for aggravations
     }

     return Math.max(0, Math.min(100, score));
   }
   ```

5. **Build proctoring summary JSONB:**
   ```json
   {
     "integrity_score": 85,
     "verdict": "CLEAN",
     "base_deductions": 22,
     "correlation_adjustments": [
       { "type": "mitigation", "points": 5, "reason": "TAB_HIDDEN nhưng gaze on-screen..." },
       { "type": "mitigation", "points": 3, "reason": "WINDOW_BLUR isolated..." }
     ],
     "final_adjusted_score": 86,
     "events_timeline": [
       {
         "ts": 1712345678000,
         "type": "TAB_HIDDEN",
         "duration_ms": 5000,
         "severity": "MEDIUM",
         "orchestrator_state": "AI_ASKING",
         "correlation_note": "AI đang nói, có thể user nhìn chỗ khác"
       }
     ],
     "flag_counts": { "high": 0, "medium": 1, "low": 2 },
     "hr_notes": "Ứng viên rời tab 1 lần trong 5 giây khi AI đang hỏi. Không có dấu hiệu gian lận nghiêm trọng. Gaze data xác nhận candidate vẫn nhìn vào screen."
   }
   ```

6. **Verdict thresholds:**
   | `integrity_score` | Verdict | Badge |
   |---|---|---|
   | >= 85 | `CLEAN` | 🟢 Tính minh bạch: Đạt |
   | 70-84 | `MINOR_FLAGS` | 🟡 Có một số sự kiện ghi nhận |
   | 50-69 | `SUSPICIOUS` | 🟠 Cần hậu kiểm |
   | < 50 | `HIGHLY_SUSPICIOUS` | 🔴 Nhiều dấu hiệu bất thường |

7. Lưu vào `proctoring_sessions.summary` và `proctoring_sessions.integrity_score`.

8. **Tích hợp vào `BehavioralSessionService.processScoring`** — thêm integrity pipeline chạy song song với behavioral và multimodal:
   ```ts
   // server/src/behavioral/behavioral-session.service.ts — processScoring()
   // Thêm IntegrityCalculatorService vào constructor injection

   async processScoring(sessionId: string): Promise<void> {
     // ... existing: load session, logs, isCombat

     const [score, multimodalScore, integrityScore] = await Promise.allSettled([
       this.scoringService.evaluateSession(logs, session.candidateLevel, cv, jd),
       isCombat ? this.multimodalScoring.scoreSession(sessionId) : Promise.resolve(null),
       isCombat ? this.integrityCalculator.calculateIntegrity(session.interviewSessionId, sessionId) : Promise.resolve(null),
     ]);

     session.finalScore = {
       ...(score.status === 'fulfilled' ? (score.value as object) : {}),
       ...(multimodalScore.status === 'fulfilled' && multimodalScore.value
         ? { multimodal: multimodalScore.value }
         : {}),
       ...(integrityScore.status === 'fulfilled' && integrityScore.value
         ? { integrity: integrityScore.value }
         : {}),
     };

     session.status = 'COMPLETED';
     session.completedAt = new Date();
     await this.sessionRepo.save(session);
   }
   ```
   - `IntegrityCalculatorService` inject `ProctoringSession` repo, `ProctoringEvent` repo, `CorrelationQueryService`.
   - Dùng `Promise.allSettled` để partial failure không block toàn bộ scoring.

---

## Task 4.8: FE – Proctoring Status Indicator (Không gây lo lắng)

**Mô tả:** Hiển thị trạng thái giám sát cho ứng viên một cách trung thực nhưng không gây áp lực.

**Chi tiết công việc:**

1. **Indicator nhỏ ở góc màn hình** (không phải banner to):
   ```
   🔴 REC  |  Giám sát đang hoạt động
   ```
   - Luôn hiển thị trong Combat Mode để user biết hệ thống đang ghi nhận.
   - Không hiện số flag, không hiện score real-time – chỉ hiện khi kết thúc.

2. **Không hiện cảnh báo real-time** khi phát hiện bất thường (đây là nguyên tắc Silent Flagging).

3. **Tích hợp vào Combat Interview Room UI (Epic 3, Task 3.3):**
   ```
   ┌──────────────────────────────────────────────────┐
   │ 🔴 REC │ Stage 2/6 │ ████░░ 12:30              │  ← header bar
   │ ┌──────┐                                         │
   │ │Camera│           🤖 AI Interviewer              │
   │ └──────┘           "Bạn có thể chia sẻ..."       │
   │                                                   │
   │ ...                                               │
   └───────────────────────────────────────────────────┘
   ```

4. Sau khi phiên kết thúc, trong trang **Scorecard** (kết hợp với Multimodal Scorecard):
   - Hiện badge `integrity_score` và `verdict`.
   - Nếu `verdict = 'CLEAN'`: Badge xanh "Tính minh bạch: Đạt".
   - Nếu `MINOR_FLAGS` hoặc cao hơn: Hiện timeline events với giải thích trung lập (không dùng từ "gian lận", dùng "sự kiện bất thường được ghi nhận").

5. **Tooltip giải thích cho ứng viên:**
   ```
   "Hệ thống ghi nhận các sự kiện trong phiên thi để đảm bảo tính minh bạch.
    Dữ liệu video không được lưu trữ. Chỉ metadata thời gian sự kiện được ghi lại."
   ```

---

## Task 4.9: Combat Scorecard — Tổng hợp cuối phiên

**Mô tả:** Trang kết quả tổng hợp cho Combat Mode, gộp: Behavioral Score (Epic 1) + Multimodal Soft-Skills (Epic 3) + Integrity (Epic 4).

**Chi tiết công việc:**

1. **Scorecard Layout:**
   ```
   ┌──────────────────────────────────────────────────────┐
   │              COMBAT MODE SCORECARD                    │
   │                                                       │
   │  ┌─────────────────────────────────────────────┐      │
   │  │  OVERALL SCORE:  74/100                      │      │
   │  │  Verdict: MID_PASS                           │      │
   │  │  Integrity: 🟢 CLEAN (92/100)                │      │
   │  └─────────────────────────────────────────────┘      │
   │                                                       │
   │  ── Interview Performance (from Epic 1) ──            │
   │  [Radar Chart: 6 stages]                              │
   │  Stage 1: Culture Fit ............. 78                │
   │  Stage 2: Tech Stack .............. 65                │
   │  ...                                                  │
   │  STAR Analysis: S=82 T=75 A=68 R=60                  │
   │                                                       │
   │  ── Communication & Soft Skills (from Epic 3) ──     │
   │  Eye Contact:     78% ████████░░  Good                │
   │  Fluency:         88% █████████░  Excellent           │
   │  Confidence:      62% ██████░░░░  Needs Improvement   │
   │  Speaking Pace:   Normal (142 WPM)                    │
   │  Top Fillers:     "ừm" (23x), "như là" (12x)         │
   │  Expression Map:  [Timeline visualization]            │
   │                   Stressed → Neutral → Confident      │
   │                                                       │
   │  ── Integrity Report (from Epic 4) ──                │
   │  🟢 Tính minh bạch: Đạt (92/100)                     │
   │  Events: 1 tab switch (5s, khi AI đang hỏi)          │
   │  Tooltip: "Không có dấu hiệu bất thường nghiêm trọng"│
   │                                                       │
   │  ── Actionable Feedback ──                            │
   │  1. Cải thiện phần Action trong STAR...               │
   │  2. Giảm filler words, đặc biệt "ừm"...             │
   │  3. Duy trì giao tiếp mắt khi trả lời...            │
   └──────────────────────────────────────────────────────┘
   ```

2. **Data sources:**
   ```ts
   interface CombatScorecard {
     // From Epic 1 — Behavioral Scoring
     behavioral: {
       totalScore: number;
       stageBreakdown: Record<number, StageScore>;
       starAnalysis: StarAnalysis;
       overallVerdict: string;
       actionableFeedback: string;
     };

     // From Epic 3 — Multimodal Analysis
     multimodal: {
       eyeTracking: { score: number; screenGazePercent: number; feedback: string };
       fillerWords: { score: number; avgFillerRate: number; topFillers: string[]; feedback: string };
       expression: { score: number; dominantExpression: string; stressPeakMinutes: number[]; feedback: string };
       overallSoftSkillScore: number;
     };

     // From Epic 4 — Integrity
     integrity: {
       integrityScore: number;
       verdict: 'CLEAN' | 'MINOR_FLAGS' | 'SUSPICIOUS' | 'HIGHLY_SUSPICIOUS';
       eventsTimeline: ProctoringEventSummary[];
       correlationNotes: string[];
       hrNotes: string;
     };

     // Combined
     // Formula: behavioral*0.65 + softSkill*0.35 - integrityPenalty
     // Integrity là penalty (không phải weight): CLEAN→0, mỗi điểm dưới 85 trừ 0.5
     overallCombatScore: number;
   }
   ```

3. **Weighted overall score:**
   ```ts
   function calculateOverallCombatScore(scorecard: CombatScorecard): number {
     const behavioral = scorecard.behavioral.totalScore;               // 0-100
     const softSkill  = scorecard.multimodal.overallSoftSkillScore;   // 0-100
     const integrity  = scorecard.integrity.integrityScore;           // 0-100

     // behavioral + softSkill = 100% của interview performance
     // behavioral chiếm 65% (nội dung câu trả lời, STAR analysis — Epic 1)
     // softSkill chiếm 35% (giao tiếp mắt, filler words, expression — Epic 3)
     const baseScore = behavioral * 0.65 + softSkill * 0.35;

     // Integrity là penalty thuần, không phải bonus:
     // Nếu integrity >= 85 (CLEAN) → penalty = 0, không ảnh hưởng baseScore
     // Nếu integrity < 85 → mỗi điểm thiếu trừ 0.5 điểm tổng
     // Ví dụ: integrity = 65 (SUSPICIOUS) → penalty = (85-65)*0.5 = 10 điểm
     const integrityPenalty = integrity >= 85 ? 0 : (85 - integrity) * 0.5;

     return Math.max(0, Math.round(baseScore - integrityPenalty));
   }
   ```

4. **FE — Polling & Display:**
   ```ts
   // Sau khi POST /complete:
   // Poll 3 endpoints song song (hoặc 1 aggregated endpoint):
   // 1. GET /behavioral/sessions/:id/score       → Behavioral results
   // 2. GET /combat/sessions/:id/multimodal-score → Multimodal results
   // 3. GET /combat/sessions/:id/integrity        → Integrity results
   // Hoặc: GET /combat/sessions/:id/scorecard → All-in-one

   // Poll mỗi 3s, max 60s. Hiển thị progressive loading:
   // "Đang chấm điểm phỏng vấn..."    → Behavioral
   // "Đang phân tích kỹ năng giao tiếp..." → Multimodal
   // "Đang tổng hợp báo cáo..."        → Integrity + combine
   ```

---

## Quản trị rủi ro

| # | Rủi ro | Giải pháp |
|---|---|---|
| 1 | False positive: Người thân đi qua phía sau | MULTIPLE_FACES flag chỉ tạo sau 3 giây liên tục; reuse FaceMesh từ MultimodalEngine (không chạy pipeline riêng) |
| 2 | False positive: Tiếng ồn môi trường (quạt, điều hòa) | Second voice reuse VAD từ Epic 3, chỉ flag khi RMS cao + không có STT transcript mới; counter decay dần |
| 3 | False positive: TTS echo bị mic bắt lại | Mic muted khi TTS playing (Task 4.3). Detection chỉ active khi mic unmuted + TTS silent |
| 4 | Ứng viên che webcam cố tình | NO_FACE liên tục > 1 phút → HIGH flag, ghi vào summary HR |
| 5 | Dữ liệu gửi BE bị miss khi mạng yếu | IndexedDB buffer + sendBeacon khi thoát đảm bảo không mất event |
| 6 | Proctoring gây tâm lý lo lắng | Indicator nhỏ gọn, không popup, không cảnh báo real-time — Silent Flagging |
| 7 | GDPR / quyền riêng tư | Không lưu video/audio, chỉ JSON metadata. Hiển thị rõ ràng trong Permission Gate |
| 8 | Tab switch khi AI đang nói bằng TTS | Severity giảm từ HIGH → MEDIUM (user có thể đang nghe mà nhìn chỗ khác) |
| 9 | Duplicate proctoring events khi FE retry + sendBeacon overlap | `client_event_id` + `UNIQUE` constraint trên DB; BE dùng `ON CONFLICT DO NOTHING` |
| 10 | Correlation engine thiếu data (session quá ngắn, metrics log trống) | Helper functions trả `null`/`-1` khi no data → skip adjustment, không tính false mitigation/aggravation |
| 11 | Correlation engine kết luận sai | Adjustments có cap ±20 điểm, HR luôn thấy raw events và correlation_notes để tự đánh giá |
| 12 | Nhiều scoring pipelines chạy song song khi complete | Dùng `Promise.allSettled`, timeout 30s mỗi pipeline, partial results OK |
