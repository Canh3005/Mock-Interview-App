# Epic 3: Lớp Phân tích Đa phương thức Thời gian thực (Combat Mode – Multimodal Engine)

> **Scope:** CHỈ kích hoạt trong **Combat Mode**. Practice Mode không chạy bất kỳ component nào trong Epic này.

Epic xây dựng lớp phân tích soft-skills không lời dựa trên dữ liệu webcam và microphone. Nguyên tắc thiết kế: **Edge Computing** – toàn bộ xử lý nặng chạy trên trình duyệt client bằng MediaPipe, server chỉ nhận file JSON metadata siêu nhẹ mỗi 5 giây. Không lưu video.

---

## Task 3.1: FE – Khởi động Multimodal Engine khi vào Combat Session

**Mô tả:** Sau khi `POST /api/interview/sessions/init` trả về `sessionId` (combat mode), FE khởi động pipeline phân tích chạy nền song song với phòng thi.

**Chi tiết công việc:**

1. Tạo singleton service `MultimodalEngine` (Web Worker hoặc chạy trong main thread với `requestIdleCallback`):
   ```ts
   class MultimodalEngine {
     private mediaStream: MediaStream;       // Từ Permission Gate (Task 0.3b)
     private sessionId: string;
     private reportBuffer: AnalysisFrame[]; // Buffer tích lũy trước khi gửi BE
     private flushInterval: ReturnType<typeof setInterval>;

     start(stream: MediaStream, sessionId: string): void
     stop(): void
     private flush(): void   // Gửi buffer lên BE, clear buffer
   }
   ```

2. `start()` khởi động 3 analyzer song song (xem Task 3.2, 3.3, 3.4).
3. `flushInterval` chạy mỗi **5 giây**: gom toàn bộ `AnalysisFrame` trong buffer → gửi `POST /api/combat/sessions/:id/metrics` → clear buffer.
4. `stop()` được gọi khi user kết thúc phiên thi hoặc đóng tab.

**Lifecycle trong Redux:**
```ts
// combatEngineSlice
{
  engineStatus: 'idle' | 'running' | 'stopped',
  lastFlushedAt: number | null,
  totalFramesAnalyzed: number,
}
```

---

## Task 3.2: FE – Eye-Tracking Analyzer (MediaPipe Face Mesh)

**Mô tả:** Phát hiện hướng nhìn của ứng viên để xác định có đang nhìn màn hình (tập trung) hay liên tục nhìn chỗ khác (có thể đọc script).

**Chi tiết công việc:**

1. Load **MediaPipe Face Mesh** (`@mediapipe/face_mesh`) – chạy WASM trên client, không gửi frame video về server.
2. Chạy inference mỗi **500ms** trên frame từ `mediaStream` (không cần 60fps):
   ```ts
   const faceMesh = new FaceMesh({ locateFile: (f) => `/mediapipe/${f}` });
   faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true });
   ```
3. Từ 468 landmarks, extract các điểm mắt để tính **gaze direction**:
   - `LOOKING_AT_SCREEN`: Mắt nhìn thẳng về phía trước.
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

**Ngưỡng cờ đỏ (xử lý ở BE, không alert FE ngay):**
- `LOOKING_AWAY` liên tục > 10 giây → Red Flag nhẹ.
- `LOOKING_AWAY` tổng cộng > 30% thời gian thi → Red Flag nặng.

---

## Task 3.3: FE – Filler Word Counter (Web Speech API + NLP nhẹ)

**Mô tả:** Đếm các từ thừa (filler words) trong câu trả lời giọng nói để đánh giá sự lưu loát.

**Chi tiết công việc:**

1. Sử dụng **`SpeechRecognition` API** (continuous mode, interimResults: true) để lấy transcript real-time.
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
     windowDurationMs: number;   // ~5000ms
     fillerCount: number;
     fillerRate: number;          // fillerCount / totalWordCount trong window
     detectedFillers: string[];   // Các từ thừa cụ thể đã phát hiện
   }
   ```
5. Push vào `reportBuffer`.

**Ngưỡng chấm điểm (BE xử lý):**
- `fillerRate < 5%`: Excellent – lưu loát.
- `fillerRate 5-15%`: Good – chấp nhận được.
- `fillerRate > 15%`: Needs improvement – giao tiếp thiếu tự tin.

---

## Task 3.4: FE – Micro-Expression Detector (MediaPipe Face Mesh + Rule-based)

**Mô tả:** Phân tích biểu cảm khuôn mặt để nhận diện trạng thái cảm xúc cơ bản (căng thẳng / tự tin / bình thường) trong khi trả lời.

**Chi tiết công việc:**

1. Reuse `FaceMesh` instance đã khởi động ở Task 3.2 (không chạy 2 instance riêng).
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

## Task 3.5: BE – Metrics Ingestion API

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

## Task 3.6: BE – Multimodal Scoring Pipeline (Cuối phiên)

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

## Quản trị rủi ro

| Rủi ro | Giải pháp |
|--------|-----------|
| MediaPipe WASM load chậm (2-4s) | Preload khi user ở màn hình Permission Gate (Task 0.3b), không chờ đến khi vào phòng thi |
| CPU cao khi chạy Face Mesh liên tục | Giảm frequency: Face Mesh chạy 2fps (500ms/frame), không phải 30fps |
| Ánh sáng kém khiến kết quả không chính xác | Discard frames có `confidence < 0.6`, không tính vào score |
| Battery drain trên laptop | Sử dụng `requestIdleCallback` cho các tác vụ không urgent, FaceDetection dừng khi tab không focus |
| User không nói (text mode) → filler word = 0 không có nghĩa | Chỉ tính filler score khi total word count > 50, dưới ngưỡng đó hiển thị "N/A" |
