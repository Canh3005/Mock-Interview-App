# Epic 1: Vòng Sàng lọc HR & Behavioral (STAR Simulator)

> **Scope:** Epic này tập trung hoàn toàn cho **Practice Mode**. Các tính năng riêng của Combat Mode (Multimodal Engine, Proctoring Shield) được tách sang Epic 3 và Epic 4.

Epic trọng tâm của Phase 2. Xây dựng vòng phỏng vấn hành vi với AI đóng vai Facilitator, đánh giá ứng viên qua 6 giai đoạn, thích nghi theo `candidateLevel` (Junior / Mid / Senior). Ứng viên có thể trả lời bằng **giọng nói hoặc văn bản**.

---

## Task 1.1: BE – Level-Parameterized System Prompt Builder

**Mô tả:** Đây là trái tim của vòng STAR. Toàn bộ hành vi AI (từ giọng điệu, loại câu hỏi, đến cách mớm lời) được điều khiển bởi một System Prompt được tham số hóa động dựa trên `candidateLevel`.

**Chi tiết công việc:**

1. Tạo `PromptBuilderService` trong `BehavioralModule`.
2. Method: `buildSystemPrompt(level: CandidateLevel, cvSnapshot: string, jdSnapshot: string, stage: InterviewStage): string`
3. Cấu trúc System Prompt gồm 4 khối:

   **Khối 1 – Persona (Nhân vật AI theo Level):**
   ```
   [JUNIOR]  → "Bạn là một Mentor thân thiện và kiên nhẫn. Nhiệm vụ của bạn là
                 dẫn dắt ứng viên khám phá câu trả lời của họ thay vì phán xét.
                 Nếu ứng viên thiếu ý, hãy mớm lời nhẹ nhàng bằng câu hỏi gợi mở."

   [MID]     → "Bạn là một Senior Engineer đang phỏng vấn. Bạn lắng nghe kỹ và
                 hay vặn vẹo về hiệu năng, tính tự chủ, và cam kết dài hạn.
                 Chỉ mớm lời nếu ứng viên im lặng > 15 giây hoặc lạc đề hoàn toàn."

   [SENIOR]  → "Bạn là một Engineering Manager / Tech Lead đang đánh giá ứng viên
                 cấp cao. Bạn tập trung vào bức tranh tổng thể, trade-offs kỹ thuật,
                 và khả năng dẫn dắt team. Ít mớm lời, nhiều câu hỏi đào sâu."
   ```

   **Khối 2 – Context Injection (Dữ liệu CV + JD):**
   ```
   "CV của ứng viên: {{cv_snapshot}}
    Vị trí ứng tuyển: {{jd_snapshot}}
    Hãy cá nhân hóa câu hỏi dựa trên kinh nghiệm thực tế trong CV này."
   ```

   **Khối 3 – Stage Instructions (Hướng dẫn cho giai đoạn hiện tại):**
   Xem chi tiết 6 giai đoạn ở Task 1.2.

   **Khối 4 – STAR Enforcement Rules:**
   ```
   "Khi đánh giá câu trả lời, hãy kiểm tra ứng viên có đề cập đủ 4 yếu tố STAR:
    - Situation (Bối cảnh): Họ đang ở đâu, dự án nào?
    - Task (Nhiệm vụ): Họ phải làm gì?
    - Action (Hành động): Họ đã làm gì cụ thể? (Đây là phần quan trọng nhất)
    - Result (Kết quả): Kết quả định lượng được không? (Con số, %, thời gian)

    Nếu thiếu bất kỳ yếu tố nào, hãy hỏi thêm. KHÔNG trừ điểm ngay, hãy cho
    ứng viên cơ hội bổ sung. Áp dụng Mandatory Quoting khi đánh giá."
   ```

4. Cache System Prompt đã build vào Redis với key `system_prompt:{sessionId}:{stage}` (TTL 2h).

---

## Task 1.2: BE – Session & Stage Management (6 giai đoạn)

**Mô tả:** Quản lý trạng thái tiến độ qua 6 giai đoạn của vòng STAR, mỗi giai đoạn có câu hỏi riêng theo level.

**Chi tiết công việc:**

### DB Schema – `behavioral_sessions`
```sql
CREATE TABLE behavioral_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_session_id UUID REFERENCES interview_sessions(id),
  candidate_level VARCHAR(10) NOT NULL, -- junior | mid | senior
  current_stage INT NOT NULL DEFAULT 1, -- 1..6
  status VARCHAR(20) DEFAULT 'IN_PROGRESS', -- IN_PROGRESS | COMPLETED
  final_score JSONB, -- {total, breakdown: {stage1:.., stage6:..}, feedback: "..."}
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE behavioral_stage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  behavioral_session_id UUID REFERENCES behavioral_sessions(id),
  stage_number INT NOT NULL,
  stage_name VARCHAR(100), -- "Culture Fit", "Tech Stack Deep-Dive", v.v.
  role VARCHAR(20) NOT NULL, -- USER | AI_FACILITATOR | SYSTEM
  content TEXT NOT NULL,
  input_type VARCHAR(10) DEFAULT 'text', -- text | voice
  voice_transcript TEXT, -- raw transcript nếu là voice
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

### 6 Giai đoạn & Câu hỏi mẫu theo Level:

**Stage 1 – Culture Fit & Company Alignment**
- Mục tiêu: Đánh giá thái độ, cam kết và sự phù hợp văn hóa.
- Junior: Hỏi về khả năng học hỏi, thích nghi trong môi trường thay đổi nhanh.
- Mid: Hỏi về mức độ tự chủ, mong muốn được can thiệp vào giải pháp.
- Senior: Hỏi về khả năng định hình văn hóa team, xử lý technical debt team.

**Stage 2 – Tech Stack Deep-Dive**
- Mục tiêu: Kiểm tra chiều sâu hiểu biết về stack đang dùng (lấy từ cv_snapshot).
- Junior: Trọng tâm cú pháp và cách dùng (useEffect vs useMemo, NestJS body parsing).
- Mid: Trọng tâm bản chất và tối ưu (Redux Saga overuse, MongoDB embed vs reference).
- Senior: Trọng tâm kiến trúc và trade-offs (NestJS OOP + React FP kết hợp, distributed transaction MongoDB).

**Stage 3 – Domain Knowledge (Hệ thống Mock Interview)**
- Mục tiêu: Kiểm tra tư duy giải quyết vấn đề trong domain cụ thể của dự án.
- Junior: Tư duy feature đơn lẻ (thiết kế collection lưu câu trả lời ứng viên).
- Mid: Tư duy tối ưu luồng dữ liệu (batching, Redis để tối ưu ghi log chat).
- Senior: Tư duy scalability (Event-driven với RabbitMQ cho LLM async response).

**Stage 4 – Thực chiến CV (Dự án đã làm)**
- Mục tiêu: AI đọc CV và đào sâu vào đúng phần ứng viên đã làm thực tế.
- Junior: Focus Task Execution (mã hóa password, lưu JWT).
- Mid: Focus Troubleshooting (concurrency double-charge, race condition).
- Senior: Focus System Impact & Leadership (zero-downtime migration).

**Stage 5 – Kỹ năng mềm & Xử lý tình huống**
- Mục tiêu: Đánh giá khả năng giao tiếp, xử lý xung đột và tư duy làm việc nhóm.
- Junior: Nhận feedback từ senior, teamwork cơ bản.
- Mid: Cross-functional communication với PO (tech debt vs business deadline).
- Senior: Mentorship và quản lý khủng hoảng (junior commit lỗi production liên tục).

**Stage 6 – Reverse Interview**
- Mục tiêu: AI đánh giá chất lượng câu hỏi ứng viên đặt ra.
- Junior: Kỳ vọng hỏi về task hàng ngày, mentor, tech stack, thời gian thử việc.
- Mid: Kỳ vọng hỏi về CI/CD, technical debt handling, growth opportunity.
- Senior: Kỳ vọng hỏi chiến lược sản phẩm 1-3 năm, KPI engineering team, bài toán khó nhất.
- AI chủ động gợi ý nếu ứng viên không hỏi hoặc hỏi quá cạn.

### API Endpoints:

```
POST /api/behavioral/sessions/start
  → Tạo behavioral_session, trả về {sessionId, currentStage: 1, firstQuestion}

POST /api/behavioral/sessions/:id/message
  → Nhận message user, gọi AI, trả về streaming response
  Body: { content: string, inputType: 'text'|'voice', voiceTranscript?: string }

POST /api/behavioral/sessions/:id/next-stage
  → Chuyển sang stage tiếp theo, trả về câu hỏi mở đầu của stage mới

POST /api/behavioral/sessions/:id/complete
  → Kết thúc, trigger pipeline chấm điểm cuối

GET  /api/behavioral/sessions/:id/score
  → Lấy kết quả sau khi AI chấm xong
```

---

## Task 1.3: BE – AI Facilitator Logic & Streaming

**Mô tả:** Xử lý logic gọi LLM với streaming, tích hợp STAR detection và silence detection.

**Chi tiết công việc:**

1. **Streaming Response:**
   - Dùng Server-Sent Events (SSE) để stream từng chunk text từ LLM về FE.
   - Endpoint `POST /api/behavioral/sessions/:id/message` trả về `Content-Type: text/event-stream`.
   - Mỗi chunk: `data: {"token": "...", "done": false}`, cuối cùng `data: {"done": true, "meta": {...}}`.

2. **STAR Completeness Detector:**
   ```ts
   // Sau khi nhận đủ response của user (done=true trên SSE)
   // BE gửi 1 mini-prompt phụ (không hiện ra FE) để classify:
   const starCheckPrompt = `
     Phân tích câu trả lời sau và cho biết ứng viên đã đề cập đủ các yếu tố STAR chưa.
     Trả về JSON: {"situation": true/false, "task": true/false, "action": true/false, "result": true/false}
     Câu trả lời: "${userMessage}"
   `;
   // Nếu có yếu tố false → AI tự động hỏi tiếp trong lượt tiếp theo
   ```

3. **Token Budget Management (Chống overrun):**
   - Mỗi stage tối đa **4 lượt ping-pong** (user + AI = 1 lượt).
   - Trước khi gửi lên LLM, nén lịch sử chat của stage hiện tại:
     ```ts
     // Chỉ giữ lại: system prompt + 2 lượt gần nhất đầy đủ + summary các lượt cũ
     const compressedHistory = await summarizePreviousTurns(stageLog);
     ```
   - Giới hạn context window: Tối đa 8,000 tokens/request. Log sau khi compress.

4. **Silence Detection (Cho Combat Mode):**
   - FE gửi heartbeat `POST /api/behavioral/sessions/:id/heartbeat` mỗi 5s khi user đang trong stage.
   - Nếu không có heartbeat > 20s → BE emit WebSocket event `AI_HINT_TRIGGER` về FE.
   - FE hiển thị AI gợi ý nhẹ: *"Bạn có cần thêm thời gian suy nghĩ không? Hãy thử bắt đầu với bối cảnh (Situation) của câu chuyện."*

---

## Task 1.3b: BE – Input Quality Guard (Lọc đầu vào bất thường)

**Mô tả:** Lớp kiểm tra chạy **trước khi** message của user được đưa vào context LLM. Xử lý 2 trường hợp bất thường: câu trả lời không liên quan (off-topic) và câu trả lời cố tình quá dài (flooding).

---

### A. Length Guard (Giới hạn độ dài)

**Chi tiết công việc:**

1. **BE hard limit tại endpoint `POST /api/behavioral/sessions/:id/message`:**
   ```ts
   const MAX_INPUT_CHARS = 2000;   // ~400-500 tokens
   const MAX_INPUT_TOKENS = 500;   // Estimate bằng tiktoken trước khi gửi LLM

   if (content.length > MAX_INPUT_CHARS) {
     // Không reject 400, thay vào đó truncate + gắn flag
     content = content.slice(0, MAX_INPUT_CHARS);
     flags.push('INPUT_TRUNCATED');
   }
   ```

2. **Tại sao không reject 400?** Trả lỗi 400 sẽ làm gián đoạn phòng thi. Thay vào đó:
   - Truncate tại `MAX_INPUT_CHARS` ký tự.
   - Ghi flag `INPUT_TRUNCATED: true` vào dòng log trong `behavioral_stage_logs`.
   - Thêm vào system prompt một dòng ngữ cảnh: *"[Lưu ý hệ thống: Câu trả lời của ứng viên đã bị cắt bớt do vượt giới hạn độ dài]"*.
   - **Scoring:** Trong pipeline chấm điểm cuối, câu trả lời bị truncate bị đánh giá thêm tiêu chí "Succinctness" – dài loãng không cô đọng sẽ bị trừ điểm ở yếu tố Action/Result của STAR.

3. **Voice input:** Không áp dụng length limit vì transcript từ Web Speech API tự nhiên có giới hạn (SpeechRecognition dừng sau im lặng). Giới hạn chỉ áp dụng cho text input.

---

### B. Relevance Guard (Phát hiện câu trả lời không liên quan)

**Chi tiết công việc:**

1. **Kiến trúc 2 lớp** – chạy bất đồng bộ song song với main AI Facilitator để không tăng latency:

   ```
   User message
       │
       ├──→ [Lớp 1: Rule-based pre-filter]  ← Chạy đồng bộ, < 5ms
       │         Nếu clearly_irrelevant → SHORT_CIRCUIT
       │
       ├──→ [Lớp 2: Mini LLM relevance check] ← Chạy SONG SONG với main LLM call
       │         Nếu irrelevant → inject redirect instruction vào response
       │
       └──→ [Main AI Facilitator stream]  ← Vẫn stream bình thường
   ```

2. **Lớp 1 – Rule-based pre-filter (không tốn token):**
   ```ts
   const CLEARLY_IRRELEVANT_PATTERNS = [
     /^(.)\1{10,}$/,          // "aaaaaaaaaaaaa" hoặc "123123123"
     /^[^a-zA-ZÀ-ỹ0-9\s]{5,}$/,  // Toàn ký tự đặc biệt
     /lorem ipsum/i,
     /test\s*test\s*test/i,
   ];

   function isObviouslyIrrelevant(input: string): boolean {
     if (input.trim().length < 5) return true;  // Quá ngắn vô nghĩa
     return CLEARLY_IRRELEVANT_PATTERNS.some(p => p.test(input));
   }
   ```

   - Nếu `isObviouslyIrrelevant = true`: **Short-circuit** – không gọi LLM, trả về response cố định:
     ```json
     { "type": "REDIRECT", "message": "Mình chưa nhận được câu trả lời rõ ràng. Bạn có thể chia sẻ suy nghĩ của mình về câu hỏi vừa rồi không?" }
     ```

3. **Lớp 2 – Mini LLM relevance check (tiết kiệm token):**

   Chạy song song với main stream, dùng model nhỏ hơn (hoặc cùng model với `max_tokens: 50`):
   ```ts
   const relevanceCheckPrompt = `
   Câu hỏi phỏng vấn: "${currentQuestion}"
   Câu trả lời ứng viên: "${userMessage}"

   Trả về JSON một dòng: {"relevant": true/false, "reason": "brief"}
   Chỉ đánh dấu false nếu câu trả lời HOÀN TOÀN không liên quan đến câu hỏi.
   `;
   // max_tokens: 50, không stream
   ```

4. **Xử lý kết quả relevance check:**

   | Kết quả | Hành động |
   |---------|-----------|
   | `relevant: true` | Để main stream tự nhiên |
   | `relevant: false`, lần 1 | Sau khi main stream xong, inject thêm 1 câu redirect nhẹ nhàng: *"Câu trả lời của bạn thú vị, nhưng hãy thử liên hệ với câu hỏi về [topic] nhé..."* |
   | `relevant: false`, lần 2 liên tiếp | Ghi flag `OFF_TOPIC_REPEATED` vào log. AI redirect thẳng vào câu hỏi: *"Hãy tập trung vào [câu hỏi cụ thể]. Bạn có thể kể một ví dụ thực tế không?"* |
   | `relevant: false`, lần 3 liên tiếp | Ghi flag `OFF_TOPIC_PERSISTENT`. AI thông báo chuyển sang câu hỏi tiếp theo, không tiêu tốn thêm lượt ping-pong. Stage đó bị đánh dấu `INCOMPLETE` khi chấm điểm. |

5. **Lưu vào `behavioral_stage_logs`:**
   ```sql
   -- Bổ sung cột vào behavioral_stage_logs
   ALTER TABLE behavioral_stage_logs
     ADD COLUMN is_truncated BOOLEAN DEFAULT FALSE,
     ADD COLUMN relevance_score FLOAT,   -- 0.0-1.0, null nếu không check
     ADD COLUMN quality_flags TEXT[];    -- ['INPUT_TRUNCATED','OFF_TOPIC_REPEATED',...]
   ```

6. **Ảnh hưởng đến chấm điểm:**
   - `OFF_TOPIC_REPEATED`: Trừ điểm "Logic & Coherence" của stage đó.
   - `OFF_TOPIC_PERSISTENT`: Stage đánh dấu `INCOMPLETE`, điểm stage = 0, feedback ghi rõ: *"Ứng viên không cung cấp câu trả lời liên quan sau 3 lần nhắc."*
   - `INPUT_TRUNCATED`: Trừ điểm "Succinctness" – câu trả lời dài mà không cô đọng.

---

## Task 1.4: FE – Giao diện phòng thi STAR

**Mô tả:** Giao diện phòng thi vòng HR/Behavioral, tối giản và tập trung vào hội thoại.

**Chi tiết công việc:**

1. **Layout 3 cột:**
   ```
   [Left Panel – Stage Progress]  [Center – Chat Interface]  [Right Panel – STAR Guide]
   ```

2. **Left Panel – Stage Progress:**
   - Danh sách 6 stage dạng stepper (vertical).
   - Stage hiện tại: highlighted, có text tên stage.
   - Stage đã qua: dấu ✓ xanh.
   - Stage chưa đến: xám, khóa.

3. **Center – Chat Interface:**
   - Bubble chat: AI bên trái (avatar robot), User bên phải.
   - AI message: Render markdown, hỗ trợ **bold** cho từ quan trọng.
   - Streaming: Hiển thị chữ xuất hiện dần dần (typewriter effect khi nhận SSE chunks).
   - Input area ở dưới cùng với 2 chế độ:

   **Text Mode:**
   - `<textarea>` auto-resize, placeholder: "Nhập câu trả lời của bạn..."
   - Nút "Gửi" (Enter hoặc click).
   - **Character counter với 3 ngưỡng:**
     - `< 100 ký tự`: Counter màu xám + tooltip *"Câu trả lời STAR thường cần ít nhất 100 ký tự"* – vẫn cho gửi.
     - `100 → 1600 ký tự`: Counter màu xanh, vùng an toàn.
     - `1600 → 2000 ký tự`: Counter chuyển màu vàng, hiện warning nhỏ *"Đang tiến đến giới hạn – hãy cô đọng câu trả lời."*
     - `> 2000 ký tự`: Counter đỏ, nút "Gửi" bị **disabled**, hiện message *"Câu trả lời vượt giới hạn 2000 ký tự. Hệ thống sẽ chỉ nhận 2000 ký tự đầu tiên nếu bạn tiếp tục."* + nút phụ **"Gửi 2000 ký tự đầu"** để không block hoàn toàn.
   - **Paste detection:** Nếu user paste một đoạn text dài hơn 500 ký tự trong một lần → hiện toast cảnh báo nhẹ: *"Bạn vừa dán một đoạn văn bản dài. Hãy đảm bảo đây là câu trả lời của riêng bạn."* (không block, chỉ nhắc nhở).

   **Voice Mode:**
   - Nút microphone to, có animation pulse khi đang nghe.
   - Dùng Web Speech API (`webkitSpeechRecognition`) → real-time transcript hiển thị ngay trong input.
   - Nút "Gửi Voice" → gửi cả `voiceTranscript` và `inputType: 'voice'` lên BE.
   - Fallback: Nếu browser không hỗ trợ Speech API, tự ẩn nút voice.

4. **Right Panel – STAR Guide (Collapsible):**
   - Hiển thị framework STAR dưới dạng checklist nhỏ, mờ đi các ô đã detect được.
   - Cập nhật realtime từ `starStatus` trả về trong SSE meta.
   - Ở Practice Mode: Luôn hiện. Ở Combat Mode: Mặc định thu nhỏ.

5. **Stage Transition Animation:**
   - Khi chuyển stage: Màn hình fade out → slide in với tên stage mới và câu hỏi mở đầu.
   - Toast notification: "Bắt đầu Giai đoạn 2: Tech Stack Deep-Dive"

6. **Header bar:**
   - Tên vòng thi + stage hiện tại.
   - Đồng hồ (Combat mode: đếm ngược; Practice mode: đếm lên).
   - Indicator `candidateLevel`: Badge nhỏ "Junior / Mid-level / Senior".

---

## Task 1.5: FE – Voice Input & STT Integration

**Mô tả:** Tích hợp giọng nói phía client, không cần gọi thêm STT API bên ngoài.

**Chi tiết công việc:**

1. Custom hook `useVoiceInput()`:
   ```ts
   const { isListening, transcript, startListening, stopListening, isSupported } = useVoiceInput();
   ```
2. Sử dụng `SpeechRecognition` API (native browser):
   - `lang: 'vi-VN'` cho tiếng Việt, fallback `'en-US'`.
   - `continuous: false` (nhận diện theo từng đoạn).
   - `interimResults: true` → hiển thị text tạm thời trong textarea.
3. Khi `stopListening` được gọi (user click lần 2 hoặc im lặng > 3s):
   - `transcript` final được set vào textarea.
   - User có thể chỉnh sửa text trước khi gửi.
4. Nút toggle rõ ràng: `[🎤 Bật voice]` / `[⏹ Dừng]`.
5. **Không gọi thêm API STT bên ngoài** → tiết kiệm cost, giảm latency.

---

## Task 1.6: BE – Batch Evaluation & Scoring Pipeline

**Mô tả:** Sau khi ứng viên hoàn thành 6 stage, AI chấm điểm toàn bộ phiên.

**Chi tiết công việc:**

1. Trigger: `POST /api/behavioral/sessions/:id/complete`
2. Pipeline:
   ```
   [Gom toàn bộ behavioral_stage_logs theo sessionId]
        ↓
   [Build Evaluation Prompt]:
   - System: "Bạn là một Hiring Manager chuyên nghiệp. Chấm điểm ứng viên dưới đây."
   - Đính kèm: candidateLevel, cv_snapshot, jd_snapshot
   - Đính kèm: Toàn bộ hội thoại 6 stage (nén lại còn tối đa 6,000 tokens)
   - Yêu cầu output JSON schema cụ thể (xem dưới)
        ↓
   [Gọi LLM – Không streaming, chờ full response]
        ↓
   [Parse JSON → Lưu vào behavioral_sessions.final_score]
        ↓
   [Emit WebSocket event SCORING_COMPLETE về FE]
   ```

3. **Score JSON Schema:**
   ```json
   {
     "total_score": 78,
     "candidate_level_confirmed": "mid",
     "breakdown": {
       "stage_1_culture_fit": { "score": 85, "feedback": "...", "highlights": ["..."], "red_flags": [] },
       "stage_2_tech_stack": { "score": 70, "feedback": "...", "highlights": [], "red_flags": ["Chưa nêu được trade-off khi dùng Redux Saga – Lượt 3, câu trả lời: '...'"] },
       "stage_3_domain": { "score": 80, "feedback": "..." },
       "stage_4_cv_deepdive": { "score": 75, "feedback": "...", "cv_quotes_used": ["Dự án X đã được hỏi sâu"] },
       "stage_5_soft_skills": { "score": 82, "feedback": "..." },
       "stage_6_reverse_interview": { "score": 65, "feedback": "Câu hỏi của ứng viên còn ở mức surface, chưa hỏi về chiến lược sản phẩm." }
     },
     "star_analysis": {
       "avg_situation_score": 90,
       "avg_task_score": 85,
       "avg_action_score": 75,
       "avg_result_score": 60,
       "weakness": "Phần Result thường thiếu con số định lượng cụ thể."
     },
     "overall_verdict": "MID_PASS | MID_BORDERLINE | JUNIOR_RECOMMEND | SENIOR_FAIL",
     "actionable_feedback": "3-5 điểm cụ thể ứng viên cần cải thiện kèm ví dụ."
   }
   ```

4. **Mandatory Quoting:** Mọi `red_flags` phải trích dẫn đúng lời ứng viên đã nói (lấy từ `content` trong `behavioral_stage_logs`).

---

## Task 1.7: FE – Scorecard Display

**Mô tả:** Hiển thị kết quả sau khi chấm điểm xong.

**Chi tiết công việc:**

1. Loading state: "AI đang phân tích buổi phỏng vấn của bạn..." với animation.
2. Sau khi nhận WebSocket `SCORING_COMPLETE`:
   - **Header:** Tổng điểm + Verdict badge (PASS / BORDERLINE / NEEDS_IMPROVEMENT).
   - **Radar Chart** (dùng Recharts): 6 trục = 6 stage.
   - **STAR Analysis Bar:** 4 thanh ngang thể hiện điểm từng yếu tố STAR.
   - **Accordion theo stage:** Mở từng stage ra xem feedback chi tiết + red flags (với trích dẫn lời đã nói).
   - **Actionable Feedback Section:** Highlight 3-5 điểm cần cải thiện.
3. Nút: "Xem lại toàn bộ hội thoại" | "Luyện tập lại Stage yếu nhất" | "Về trang chủ".

---

## Quản trị rủi ro

| Rủi ro | Giải pháp |
|--------|-----------|
| LLM trả về JSON không đúng schema | Parse với `zod` schema validation, retry tối đa 2 lần với error context trong prompt |
| Web Speech API không hỗ trợ trên một số browser | Graceful fallback về text-only mode, hiển thị banner warning |
| Token overrun khi hội thoại quá dài | Giới hạn 4 lượt/stage + nén lịch sử cũ thành summary trước khi gửi LLM |
| AI mớm lời quá nhiều làm mất trải nghiệm thi thật | Combat mode: silence threshold cao hơn (30s), hint chỉ 1 lần/stage |
| Latency cao khi gọi LLM (5-10s) | SSE streaming che giấu latency – user thấy text xuất hiện dần thay vì chờ blank |
| Ứng viên nhập response cực kỳ dài để flood hệ thống | BE truncate cứng tại 2000 ký tự trước khi đưa vào context. FE disable nút gửi + cảnh báo từ 1600 ký tự. Ghi flag `INPUT_TRUNCATED` vào log ảnh hưởng điểm Succinctness |
| Ứng viên trả lời không liên quan (off-topic) | Rule-based pre-filter bắt pattern rõ ràng (< 5ms, không tốn token). Mini LLM check chạy song song với main stream. Sau 3 lần off-topic liên tiếp: AI chuyển câu, stage bị đánh dấu `INCOMPLETE` |
| Mini LLM relevance check làm tăng cost | Dùng model nhỏ nhất có thể với `max_tokens: 50`. Chỉ call khi rule-based layer không bắt được. Một phiên 6 stage × 4 lượt = tối đa 24 relevance check calls – chi phí cận biên không đáng kể |
| Relevance check false positive (câu trả lời sáng tạo bị đánh nhầm off-topic) | Ngưỡng `relevant: false` chỉ khi HOÀN TOÀN không liên quan. Lần đầu chỉ redirect nhẹ, không ghi flag nặng. Lần 2 mới bắt đầu tính |
