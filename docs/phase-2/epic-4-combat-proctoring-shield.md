# Epic 4: Khiên Giám sát & Chống gian lận (Combat Mode – Proctoring Shield)

> **Scope:** CHỈ kích hoạt trong **Combat Mode**. Practice Mode không chạy bất kỳ component nào trong Epic này.

Epic xây dựng hệ thống giám sát tính minh bạch của phiên thi. Nguyên tắc thiết kế: **Silent Flagging** – tuyệt đối không đuổi user ra khỏi phòng thi khi phát hiện bất thường. Chỉ ghi nhận cờ đỏ (Red Flag) kèm timestamp để HR hậu kiểm, tránh False Positive gây ức chế tâm lý.

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
   - User mở DevTools (detectible qua window resize pattern) → Flag nhưng severity `LOW`.
   - User copy text từ đề bài (selection event trong phạm vi đề bài container) → Không flag.

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

---

## Task 4.3: FE – Second Voice Detection (Web Audio API)

**Mô tả:** Phát hiện tiếng nói của người thứ 2 trong phòng – dấu hiệu có người nhắc bài.

**Chi tiết công việc:**

1. Dùng **Web Audio API** để phân tích audio stream từ microphone:
   ```ts
   const audioContext = new AudioContext();
   const source = audioContext.createMediaStreamSource(mediaStream);
   const analyser = audioContext.createAnalyser();
   analyser.fftSize = 2048;
   source.connect(analyser);
   ```

2. Mỗi **200ms**, lấy frequency data và phân tích:
   - **Speaking detection:** RMS (Root Mean Square) của audio buffer > threshold → có người nói.
   - **Voice overlap detection:** Phân tích spectral pattern để phát hiện 2 nguồn âm thanh đồng thời.
     ```ts
     // Simplified: nếu audio level đột ngột tăng cao trong khi transcript đang ngừng
     // (ứng viên im lặng nhưng vẫn có âm thanh) → có thể là tiếng nói khác
     const isSpeaking = rms > SPEECH_THRESHOLD;
     const hasTranscript = transcriptBuffer.lastUpdatedMs > Date.now() - 500;

     if (isSpeaking && !hasTranscript) {
       // Âm thanh hiện diện nhưng STT không nhận ra giọng ứng viên
       // → có thể tiếng nói người khác hoặc tiếng ồn nền
       flagPotentialSecondVoice();
     }
     ```

3. **Ngưỡng thận trọng:** Chỉ flag `SECOND_VOICE` khi tín hiệu duy trì > **5 giây** liên tục để tránh false positive từ tiếng ồn.

4. Tạo `AudioFrame`:
   ```ts
   interface AudioFrame {
     ts: number;
     rmsLevel: number;       // 0.0 - 1.0
     isSpeaking: boolean;
     potentialSecondVoice: boolean;
   }
   ```

---

## Task 4.4: BE – Proctoring Event Ingestion API

**Mô tả:** Nhận và phân loại các sự kiện proctoring từ FE.

**Chi tiết công việc:**

1. Endpoint: `POST /api/combat/sessions/:id/proctoring-event`
2. Request body:
   ```json
   {
     "sessionId": "uuid",
     "ts": 1712345678000,
     "eventType": "TAB_HIDDEN" | "MULTIPLE_FACES" | "NO_FACE" | "SECOND_VOICE" | "FOCUS_LOST",
     "severity": "LOW" | "MEDIUM" | "HIGH",
     "durationMs": 12000,
     "metadata": {}
   }
   ```

3. BE xử lý:
   - Lưu vào `proctoring_events` table.
   - Nếu `severity = 'HIGH'`: Cộng vào `proctoring_sessions.high_flag_count`.
   - Không gửi bất kỳ response nào về FE (fire-and-forget pattern – FE không đợi).

**DB Schema:**
```sql
CREATE TABLE proctoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_session_id UUID REFERENCES interview_sessions(id) UNIQUE,
  high_flag_count INT DEFAULT 0,
  medium_flag_count INT DEFAULT 0,
  low_flag_count INT DEFAULT 0,
  integrity_score INT DEFAULT 100, -- Giảm dần khi có flag
  summary JSONB,  -- Tóm tắt sau khi phiên kết thúc
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE proctoring_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proctoring_session_id UUID REFERENCES proctoring_sessions(id),
  ts BIGINT NOT NULL,
  event_type VARCHAR(30) NOT NULL,
  severity VARCHAR(10) NOT NULL,
  duration_ms INT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_proctoring_events_session ON proctoring_events(proctoring_session_id, ts);
```

---

## Task 4.5: BE – Integrity Score Calculator (Cuối phiên)

**Mô tả:** Tổng hợp toàn bộ proctoring events thành `integrity_score` và báo cáo cho HR.

**Chi tiết công việc:**

1. Trigger: Được gọi từ `POST /api/interview/sessions/:id/complete` nếu `mode = 'combat'`.

2. **Tính `integrity_score` (bắt đầu từ 100, trừ dần):**
   ```
   Mỗi HIGH flag:    -15 điểm
   Mỗi MEDIUM flag:  -7 điểm
   Mỗi LOW flag:     -2 điểm
   Minimum score:     0
   ```

   | Event Type | Severity | Trừ điểm |
   |------------|----------|----------|
   | TAB_HIDDEN > 10s | HIGH | -15 |
   | MULTIPLE_FACES > 3s | HIGH | -15 |
   | SECOND_VOICE > 5s | HIGH | -15 |
   | NO_FACE > 15s | MEDIUM | -7 |
   | TAB_HIDDEN 3-10s | MEDIUM | -7 |
   | WINDOW_BLUR < 3s | LOW | -2 |

3. Build proctoring summary JSONB:
   ```json
   {
     "integrity_score": 85,
     "verdict": "CLEAN" | "MINOR_FLAGS" | "SUSPICIOUS" | "HIGHLY_SUSPICIOUS",
     "events_timeline": [
       { "ts": 1712345678000, "type": "TAB_HIDDEN", "duration_ms": 5000, "severity": "MEDIUM" }
     ],
     "flag_counts": { "high": 0, "medium": 1, "low": 2 },
     "hr_notes": "Ứng viên rời tab 1 lần trong 5 giây (timestamp 14:23). Không có dấu hiệu gian lận nghiêm trọng."
   }
   ```

   **Verdict thresholds:**
   - `integrity_score >= 85`: `CLEAN`
   - `70-84`: `MINOR_FLAGS`
   - `50-69`: `SUSPICIOUS`
   - `< 50`: `HIGHLY_SUSPICIOUS`

4. Lưu vào `proctoring_sessions.summary` và `proctoring_sessions.integrity_score`.

---

## Task 4.6: FE – Proctoring Status Indicator (Không gây lo lắng)

**Mô tả:** Hiển thị trạng thái giám sát cho ứng viên một cách trung thực nhưng không gây áp lực.

**Chi tiết công việc:**

1. **Indicator nhỏ ở góc màn hình** (không phải banner to):
   ```
   🔴 REC  |  👁 Giám sát đang hoạt động
   ```
   - Luôn hiển thị trong Combat Mode để user biết hệ thống đang ghi nhận.
   - Không hiện số flag, không hiện score ngay – chỉ hiện khi kết thúc.

2. **Không hiện cảnh báo real-time** khi phát hiện bất thường (đây là nguyên tắc Silent Flagging).

3. Sau khi phiên kết thúc, trong trang Scorecard:
   - Hiện badge `integrity_score` và `verdict`.
   - Nếu `verdict = 'CLEAN'`: Badge xanh "Tính minh bạch: Đạt".
   - Nếu `MINOR_FLAGS` hoặc cao hơn: Hiện timeline events với giải thích trung lập (không dùng từ "gian lận", dùng "sự kiện bất thường được ghi nhận").

4. **Tooltip giải thích cho ứng viên:**
   ```
   "Hệ thống ghi nhận các sự kiện trong phiên thi để đảm bảo tính minh bạch.
    Dữ liệu video không được lưu trữ. Chỉ metadata thời gian sự kiện được ghi lại."
   ```

---

## Task 4.7: FE – Graceful Degradation khi mất kết nối

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

---

## Quản trị rủi ro

| Rủi ro | Giải pháp |
|--------|-----------|
| False positive: Người thân đi qua phía sau | MULTIPLE_FACES flag chỉ tạo ra sau 3 giây liên tục, severity MEDIUM không tự động fail |
| False positive: Tiếng ồn môi trường (quạt, điều hòa) | Second voice detection chỉ flag khi RMS cao + không có transcript từ ứng viên |
| Ứng viên che webcam cố tình | NO_FACE liên tục > 1 phút → HIGH flag, ghi vào summary HR |
| Dữ liệu gửi về BE bị miss khi mạng yếu | IndexedDB buffer + sendBeacon khi thoát đảm bảo không mất event |
| Proctoring gây tâm lý lo lắng, ảnh hưởng kết quả | Indicator nhỏ gọn, không popup, không cảnh báo real-time – Silent Flagging là nguyên tắc cốt lõi |
| GDPR / quyền riêng tư | Không lưu video, chỉ JSON metadata. Hiển thị rõ ràng cho user trong Permission Gate |
