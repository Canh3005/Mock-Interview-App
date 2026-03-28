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

1. Đăng ký listener ngay khi vào phòng thi Combat Mode:
   ```ts
   document.addEventListener('visibilitychange', handleVisibilityChange);
   window.addEventListener('blur', handleWindowBlur);
   window.addEventListener('focus', handleWindowFocus);
   ```

2. Logic xử lý sự kiện:
   ```ts
   interface FocusEvent {
     ts: number;
     type: 'TAB_HIDDEN' | 'TAB_VISIBLE' | 'WINDOW_BLUR' | 'WINDOW_FOCUS';
     durationMs?: number;  // Tính khi focus trở lại: bao lâu bị blur
   }
   ```

3. **Không hiện cảnh báo popup** khi phát hiện (silent). Chỉ:
   - Lưu event vào local buffer.
   - Emit `POST /api/combat/sessions/:id/proctoring-event` (non-blocking, fire-and-forget).

4. Nếu tab bị ẩn > 10 giây liên tiếp → tạo `ProctoringFlag` với severity `HIGH`.

5. **Ngoại lệ hợp lệ (whitelist):**
   - User mở DevTools (detectable qua window resize pattern) → Flag nhưng severity `LOW`.
   - User copy text từ đề bài (selection event trong phạm vi đề bài container) → Không flag.

6. **Tương tác với Orchestrator (Epic 3):**
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

## Task 4.2: FE – Multi-Face Detection (MediaPipe Face Detection)

**Mô tả:** Phát hiện khi có nhiều hơn 1 khuôn mặt trong frame webcam, dấu hiệu có người hỗ trợ bên cạnh.

**Chi tiết công việc:**

1. Dùng **MediaPipe Face Detection** (nhẹ hơn Face Mesh, chỉ detect bounding box):
   ```ts
   const faceDetection = new FaceDetection({
     locateFile: (f) => `/mediapipe/${f}`,
   });
   faceDetection.setOptions({ model: 'short', minDetectionConfidence: 0.7 });
   ```

2. Chạy mỗi **1 giây** (không cần cao hơn):
   - `faceCount === 0`: Ứng viên rời khỏi frame. Flag `NO_FACE`.
   - `faceCount === 1`: Bình thường.
   - `faceCount >= 2`: Flag `MULTIPLE_FACES`.

3. **Debounce trước khi tạo Flag:**
   - Chỉ tạo `MULTIPLE_FACES` flag nếu phát hiện liên tiếp > **3 giây** (tránh false positive khi người đi qua phía sau).
   - Chỉ tạo `NO_FACE` flag nếu không có mặt > **15 giây**.

4. Tạo `FaceDetectionFrame` mỗi giây và append vào proctoring buffer:
   ```ts
   interface FaceDetectionFrame {
     ts: number;
     faceCount: number;
     flags: ('NO_FACE' | 'MULTIPLE_FACES')[];
   }
   ```

5. **Tương tác với Orchestrator:**
   ```ts
   // Nếu NO_FACE kéo dài > 15s trong khi state = CANDIDATE_SPEAKING:
   // → Có thể candidate rời ghế
   // → Orchestrator pause timer, đợi candidate quay lại
   // → Nếu > 60s: auto-flag HIGH + orchestrator ghi nhận NO_RESPONSE
   ```

---

## Task 4.3: FE – Second Voice Detection (Web Audio API) — TTS-Aware

**Mô tả:** Phát hiện tiếng nói của người thứ 2 trong phòng – dấu hiệu có người nhắc bài. **Phải phối hợp với TTS Engine (Epic 3, Task 3.2)** để tránh false positive từ AI speaker output.

**Chi tiết công việc:**

1. Dùng **Web Audio API** để phân tích audio stream từ microphone:
   ```ts
   const audioContext = new AudioContext();
   const source = audioContext.createMediaStreamSource(mediaStream);
   const analyser = audioContext.createAnalyser();
   analyser.fftSize = 2048;
   source.connect(analyser);
   ```

2. **TTS-Aware Detection — 3 chế độ theo Orchestrator state:**

   | Orchestrator State | Mic Status | Second Voice Detection |
   |---|---|---|
   | `AI_ASKING` / `AI_FOLLOW_UP` | **Muted** | **OFF** — AI đang phát TTS, mic mute nên không có input |
   | `CANDIDATE_THINKING` | Unmuted sau 200ms | **ON** — nếu detect voice nhưng candidate chưa bắt đầu nói → suspicious |
   | `CANDIDATE_SPEAKING` | Active (STT running) | **ON** — phân biệt giọng candidate vs giọng lạ |

   ```ts
   // CHỈ chạy detection khi mic active VÀ TTS không playing
   function shouldRunSecondVoiceDetection(): boolean {
     const state = orchestrator.currentState;
     return (
       (state === 'CANDIDATE_THINKING' || state === 'CANDIDATE_SPEAKING') &&
       !ttsPlayer.isPlaying
     );
   }
   ```

3. Mỗi **200ms** (khi detection ON), lấy frequency data và phân tích:
   ```ts
   // Khi candidate đang nói (CANDIDATE_SPEAKING):
   // Detect audio level đột ngột cao TRONG KHI STT không nhận thêm transcript
   // → Có thể là tiếng nói khác mà STT không parse được

   // Khi candidate đang nghĩ (CANDIDATE_THINKING):
   // Detect bất kỳ audio speech nào (RMS > SPEECH_THRESHOLD)
   // → Candidate chưa bắt đầu nói nhưng có tiếng nói → suspicious

   function analyzeAudio(): void {
     if (!shouldRunSecondVoiceDetection()) return;

     const rms = calculateRMS();
     const isSpeechDetected = rms > SPEECH_THRESHOLD;
     const state = orchestrator.currentState;

     if (state === 'CANDIDATE_THINKING' && isSpeechDetected) {
       // Có tiếng nói trong lúc candidate "đang nghĩ"
       secondVoiceCounter++;
     }

     if (state === 'CANDIDATE_SPEAKING' && isSpeechDetected) {
       const hasNewTranscript = sttLastUpdatedMs > Date.now() - 500;
       if (!hasNewTranscript) {
         // Audio present nhưng STT không nhận ra → possible second voice
         secondVoiceCounter++;
       }
     }
   }
   ```

4. **Ngưỡng thận trọng:** Chỉ flag `SECOND_VOICE` khi tín hiệu duy trì > **5 giây** liên tục để tránh false positive từ tiếng ồn.

5. Tạo `AudioFrame`:
   ```ts
   interface AudioFrame {
     ts: number;
     rmsLevel: number;            // 0.0 - 1.0
     isSpeaking: boolean;
     potentialSecondVoice: boolean;
     orchestratorState: CombatState; // Ghi lại state để BE biết context
     ttsWasPlaying: boolean;         // Ghi lại TTS status để audit
   }
   ```

---

## Task 4.4: FE – Screen Recording / Screen Share Detection (Optional)

**Mô tả:** Phát hiện dấu hiệu ứng viên đang screen-record hoặc screen-share phiên thi cho người khác xem.

**Chi tiết công việc:**

1. **Detect `getDisplayMedia` calls (limited):**
   ```ts
   // Không thể chặn screen recording, nhưng có thể detect một số dấu hiệu:

   // 1. Detect nếu user đã grant screen capture permission trước đó
   //    (một số extension sẽ trigger navigator.mediaDevices events)

   // 2. Detect performance impact: screen recording thường tăng CPU/GPU usage
   //    → Monitor performance.now() timing jitter
   function detectRecordingIndicators(): boolean {
     // Frame timing bất thường (> 50ms jitter khi bình thường < 16ms)
     const frameTiming = performance.now() - lastFrameTime;
     if (frameTiming > 50 && !isTabHidden) {
       recordingIndicatorCount++;
     }
     return recordingIndicatorCount > 10; // Nhiều lần liên tiếp
   }
   ```

2. **Severity: LOW** — không thể chắc chắn, chỉ là tín hiệu phụ.

3. **Không block user** — chỉ ghi nhận vào proctoring log.

**Lưu ý:** Task này là **optional/nice-to-have**. Không thể 100% detect screen recording. Đây chỉ là tín hiệu bổ sung.

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
     "sessionId": "uuid",
     "ts": 1712345678000,
     "eventType": "TAB_HIDDEN" | "MULTIPLE_FACES" | "NO_FACE" | "SECOND_VOICE" | "FOCUS_LOST" | "SCREEN_RECORDING_INDICATOR",
     "severity": "LOW" | "MEDIUM" | "HIGH",
     "durationMs": 12000,
     "metadata": {
       "orchestratorState": "CANDIDATE_SPEAKING",
       "ttsWasPlaying": false
     }
   }
   ```

3. BE xử lý:
   - Lưu vào `proctoring_events` table.
   - Nếu `severity = 'HIGH'`: Cộng vào `proctoring_sessions.high_flag_count`.
   - Không gửi bất kỳ response nào về FE (fire-and-forget pattern – FE không đợi).

4. **Batch endpoint** cho flush cuối phiên:
   ```
   POST /api/combat/sessions/:id/proctoring-event/batch
   Body: { events: ProctoringEvent[] }
   ```

**DB Schema:**
```sql
CREATE TABLE proctoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_session_id UUID REFERENCES interview_sessions(id) UNIQUE,
  high_flag_count INT DEFAULT 0,
  medium_flag_count INT DEFAULT 0,
  low_flag_count INT DEFAULT 0,
  integrity_score INT DEFAULT 100,  -- Giảm dần khi có flag
  summary JSONB,                    -- Tóm tắt sau khi phiên kết thúc
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE proctoring_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proctoring_session_id UUID REFERENCES proctoring_sessions(id),
  ts BIGINT NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(10) NOT NULL,
  duration_ms INT,
  metadata JSONB,                   -- Bao gồm orchestratorState, ttsWasPlaying
  created_at TIMESTAMPTZ DEFAULT NOW()
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
   ```ts
   // Khi offline:
   // → Proctoring: buffer events locally (IndexedDB), tiếp tục detect
   // → TTS: fallback sang Web Speech API (offline TTS)
   // → STT: Web Speech API vẫn hoạt động offline trên Chrome
   // → AI responses: KHÔNG GỬI ĐƯỢC → Orchestrator pause tại AI_PROCESSING
   //   → Hiện thông báo: "Mất kết nối mạng. Đang chờ khôi phục..."
   //   → Khi online lại: retry gửi message, resume flow

   window.addEventListener('offline', () => {
     orchestrator.pause('NETWORK_LOST');
     ttsService.switchToFallback();  // Web Speech API
   });

   window.addEventListener('online', () => {
     orchestrator.resume();
     ttsService.switchToPrimary();   // Cloud TTS
     flushProctoringBuffer();        // Gửi events đã buffer
   });
   ```

---

# SCORING & DISPLAY LAYER (Tasks 4.7 – 4.9)

---

## Task 4.7: BE – Integrity Score Calculator with Correlation Engine (Cuối phiên)

**Mô tả:** Tổng hợp toàn bộ proctoring events thành `integrity_score`, **kết hợp với multimodal data (Epic 3)** để tăng accuracy và giảm false positive, rồi sinh báo cáo cho HR.

**Chi tiết công việc:**

1. Trigger: Được gọi từ `POST /api/interview/sessions/:id/complete` nếu `mode = 'combat'`.

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
   | SCREEN_RECORDING_INDICATOR | sustained | LOW | -2 |

3. **Bước 2 — Correlation Adjustments (MỚI — kết hợp multimodal data):**

   ```ts
   // Query multimodal metrics của cùng session
   // Tìm correlation patterns để tăng/giảm confidence của flags

   interface CorrelationAdjustment {
     type: 'mitigation' | 'aggravation';
     points: number;
     reason: string;
   }

   function calculateCorrelations(
     events: ProctoringEvent[],
     metrics: CombatMetricsLog[],
     stageLogs: BehavioralStageLog[],
   ): CorrelationAdjustment[] {
     const adjustments: CorrelationAdjustment[] = [];

     // --- MITIGATIONS (giảm bớt deduction) ---

     // M1: Tab hidden nhưng gaze vẫn on-screen (false positive khả năng cao)
     // → Có thể hệ thống detect sai (notification popup, OS overlay)
     for (const event of events.filter(e => e.event_type === 'TAB_HIDDEN')) {
       const gazeAtTime = getGazeDataAroundTimestamp(metrics, event.ts, 5000);
       if (gazeAtTime.screenPercent > 70) {
         adjustments.push({
           type: 'mitigation',
           points: +5,
           reason: `TAB_HIDDEN tại ${event.ts} nhưng gaze on-screen 70%+ → likely false positive`,
         });
       }
     }

     // M2: Flag đơn lẻ, không lặp lại (isolated incident)
     const eventsByType = groupBy(events, 'event_type');
     for (const [type, typeEvents] of Object.entries(eventsByType)) {
       if (typeEvents.length === 1 && typeEvents[0].severity !== 'HIGH') {
         adjustments.push({
           type: 'mitigation',
           points: +3,
           reason: `${type} xảy ra 1 lần duy nhất → isolated, không phải pattern`,
         });
       }
     }

     // --- AGGRAVATIONS (tăng deduction) ---

     // A1: Chất lượng câu trả lời tăng đột biến ngay sau tab switch
     for (const event of events.filter(e => e.event_type === 'TAB_HIDDEN' && e.duration_ms > 5000)) {
       const logsBefore = getLogsBeforeTimestamp(stageLogs, event.ts, 1);
       const logsAfter = getLogsAfterTimestamp(stageLogs, event.ts + event.duration_ms, 1);
       if (logsAfter[0]?.relevanceScore > logsBefore[0]?.relevanceScore + 0.3) {
         adjustments.push({
           type: 'aggravation',
           points: -10,
           reason: `Response quality spike sau TAB_HIDDEN ${event.duration_ms}ms → possible lookup`,
         });
       }
     }

     // A2: Second voice + stressed/uncertain expression = có thể nhờ người khác
     for (const event of events.filter(e => e.event_type === 'SECOND_VOICE')) {
       const expressionAtTime = getExpressionAroundTimestamp(metrics, event.ts, 5000);
       if (expressionAtTime.dominant === 'uncertain' || expressionAtTime.dominant === 'stressed') {
         adjustments.push({
           type: 'aggravation',
           points: -5,
           reason: `SECOND_VOICE + ${expressionAtTime.dominant} expression → correlation suspicious`,
         });
       }
     }

     // A3: Nhiều flag types khác nhau trong cùng 30s window → coordinated cheating
     const windows = groupEventsIntoWindows(events, 30_000);
     for (const window of windows) {
       const uniqueTypes = new Set(window.map(e => e.event_type));
       if (uniqueTypes.size >= 3) {
         adjustments.push({
           type: 'aggravation',
           points: -10,
           reason: `3+ flag types trong 30s window → pattern suspicious`,
         });
       }
     }

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
     overallCombatScore: number;  // Weighted: behavioral*0.6 + multimodal*0.25 + integrity*0.15
   }
   ```

3. **Weighted overall score:**
   ```ts
   function calculateOverallCombatScore(scorecard: CombatScorecard): number {
     const behavioral = scorecard.behavioral.totalScore;      // 0-100
     const softSkill = scorecard.multimodal.overallSoftSkillScore; // 0-100
     const integrity = scorecard.integrity.integrityScore;    // 0-100

     // Integrity là penalty, không phải bonus:
     // Nếu CLEAN → không ảnh hưởng
     // Nếu SUSPICIOUS → giảm tổng điểm
     const integrityPenalty = integrity >= 85 ? 0 : (85 - integrity) * 0.5;

     return Math.round(
       behavioral * 0.65 +
       softSkill * 0.35 -
       integrityPenalty
     );
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
| 1 | False positive: Người thân đi qua phía sau | MULTIPLE_FACES flag chỉ tạo sau 3 giây liên tục, correlation engine kiểm tra thêm context |
| 2 | False positive: Tiếng ồn môi trường (quạt, điều hòa) | Second voice detection chỉ flag khi RMS cao + không có STT transcript từ ứng viên |
| 3 | False positive: TTS echo bị mic bắt lại | **Mic muted khi TTS playing** (Task 4.3). Detection chỉ active khi mic unmuted + TTS silent |
| 4 | Ứng viên che webcam cố tình | NO_FACE liên tục > 1 phút → HIGH flag, ghi vào summary HR |
| 5 | Dữ liệu gửi BE bị miss khi mạng yếu | IndexedDB buffer + sendBeacon khi thoát đảm bảo không mất event |
| 6 | Proctoring gây tâm lý lo lắng | Indicator nhỏ gọn, không popup, không cảnh báo real-time — Silent Flagging |
| 7 | GDPR / quyền riêng tư | Không lưu video/audio, chỉ JSON metadata. Hiển thị rõ ràng trong Permission Gate |
| 8 | Tab switch khi AI đang nói bằng TTS | Severity giảm từ HIGH → MEDIUM (user có thể đang nghe mà nhìn chỗ khác) |
| 9 | Correlation engine kết luận sai | Adjustments có cap (max ±15 điểm), HR luôn thấy raw events để tự đánh giá |
| 10 | Nhiều scoring pipelines chạy song song khi complete | Dùng Promise.allSettled, timeout 30s mỗi pipeline, partial results OK |
