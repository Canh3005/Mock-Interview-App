# Epic 2: Vòng Kỹ năng AI Prompting & Pair Programming

> **Scope:** Epic này tập trung hoàn toàn cho **Practice Mode**. Các tính năng riêng của Combat Mode (Multimodal Engine, Proctoring Shield) được tách sang Epic 3 và Epic 4.

Epic đánh giá khả năng thực chiến của ứng viên khi dùng AI Tool (tương tự Copilot/ChatGPT) để debug và giải quyết vấn đề. Hệ thống ngầm chấm điểm **tư duy chia nhỏ vấn đề (Chain of Thought)** thay vì chỉ nhìn kết quả cuối.

---

## Task 2.1: BE – Problem Bank cho AI Prompting Round

**Mô tả:** Xây dựng ngân hàng bài tập cho vòng AI Prompting, mỗi bài gồm đoạn code lỗi + metadata chấm điểm ẩn.

**Chi tiết công việc:**

### DB Schema – `ai_prompting_problems`
```sql
CREATE TABLE ai_prompting_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  difficulty VARCHAR(10) NOT NULL, -- easy | medium | hard
  target_level VARCHAR(10), -- junior | mid | senior | null (tất cả)
  language VARCHAR(20) NOT NULL, -- javascript | python | typescript
  buggy_code TEXT NOT NULL,           -- Đoạn code chứa bug hiển thị cho ứng viên
  correct_code TEXT NOT NULL,         -- Code đúng (chỉ BE biết)
  bug_description TEXT NOT NULL,      -- Mô tả bug cho hệ thống chấm
  is_hallucination_trap BOOLEAN DEFAULT FALSE,
  hallucination_bait TEXT,            -- Đoạn code "sửa" của AI nội bộ nhưng vẫn sai
  hallucination_bait_explanation TEXT, -- Tại sao bait này vẫn sai
  ideal_prompt_keywords TEXT[],       -- Keywords kỳ vọng trong prompt tốt
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Ví dụ bài mẫu (Hallucination Trap):
```
title: "Race Condition trong giỏ hàng"
buggy_code: `
async function checkout(userId, cartId) {
  const cart = await Cart.findById(cartId);
  if (cart.userId !== userId) throw new Error('Unauthorized');
  const total = cart.items.reduce((sum, item) => sum + item.price, 0);
  await Payment.charge(userId, total);
  await Cart.deleteById(cartId);
  return { success: true, total };
}
`
bug_description: "Không có transaction/lock → race condition khi user click 2 lần"
is_hallucination_trap: true
hallucination_bait: `
// AI "sửa" bằng cách thêm try-catch nhưng vẫn không giải quyết race condition
async function checkout(userId, cartId) {
  try {
    const cart = await Cart.findById(cartId);
    if (!cart || cart.userId !== userId) throw new Error('Unauthorized');
    const total = cart.items.reduce((sum, item) => sum + item.price, 0);
    await Payment.charge(userId, total);
    await Cart.deleteById(cartId);
    return { success: true, total };
  } catch (error) {
    throw error;
  }
}
`
hallucination_bait_explanation: "try-catch không giải quyết race condition, cần dùng distributed lock hoặc idempotency key"
```

---

## Task 2.2: BE – Internal AI Chat Service

**Mô tả:** AI nội bộ đóng vai "Coding Assistant" mà ứng viên sẽ chat để debug. Đây là AI khác với AI Facilitator của vòng STAR.

**Chi tiết công việc:**

1. Endpoint: `POST /api/ai-prompting/sessions/:id/chat`
2. Request: `{ prompt: string }`
3. Internal AI System Prompt:
   ```
   "Bạn là một AI Coding Assistant (tương tự Copilot). Nhiệm vụ của bạn là
    hỗ trợ ứng viên debug đoạn code sau:

    {{buggy_code}}

    QUY TẮC QUAN TRỌNG:
    - Trả lời câu hỏi của ứng viên một cách tự nhiên như một AI assistant thực.
    - Nếu ứng viên hỏi quá chung chung (vd: 'fix code này'), hãy hỏi lại để
      họ chia nhỏ vấn đề hơn.
    - KHÔNG chủ động chỉ ra toàn bộ bug nếu ứng viên chưa hỏi đúng chỗ.
    - Nếu bài có hallucination_trap: Trong một câu trả lời giữa phiên, hãy
      đề xuất {{hallucination_bait}} như một giải pháp có vẻ đúng."
   ```
4. Response: Stream text thông thường (SSE).
5. Log toàn bộ: Mỗi lượt chat được ghi vào `ai_prompting_chat_logs` (xem schema dưới).

### DB Schema – `ai_prompting_sessions` & `ai_prompting_chat_logs`
```sql
CREATE TABLE ai_prompting_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_session_id UUID REFERENCES interview_sessions(id),
  problem_id UUID REFERENCES ai_prompting_problems(id),
  candidate_level VARCHAR(10) NOT NULL,
  status VARCHAR(20) DEFAULT 'IN_PROGRESS',
  final_submitted_code TEXT,
  final_score JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ
);

CREATE TABLE ai_prompting_chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES ai_prompting_sessions(id),
  role VARCHAR(20) NOT NULL, -- USER | AI_ASSISTANT
  content TEXT NOT NULL,
  -- Metadata chấm điểm (BE tự phân tích, không hiện ra FE)
  cot_score INT,             -- Chain of Thought score 0-100 cho prompt này
  cot_indicators TEXT[],     -- Các dấu hiệu CoT phát hiện được
  is_hallucination_detected BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Task 2.3: BE – Chain of Thought Analyzer (Log Tracking)

**Mô tả:** Hệ thống ngầm phân tích mỗi prompt của ứng viên để chấm điểm tư duy Chain of Thought.

**Chi tiết công việc:**

1. Sau mỗi lượt user gửi prompt → BE chạy ngầm mini-analysis (không block streaming response):
   ```ts
   // Chạy bất đồng bộ sau khi response đã stream xong
   async analyzePromptCoT(userPrompt: string, chatHistory: ChatLog[]): Promise<CoTScore> {
     // Gửi sang LLM hoặc dùng rule-based:
     // Indicators tốt:
     // - Chia vấn đề thành các bước nhỏ ("Đầu tiên... Sau đó... Cuối cùng...")
     // - Đặt câu hỏi về nguyên nhân gốc rễ ("Tại sao đoạn này lại...?")
     // - Yêu cầu giải thích ("Explain why...","What does ... do?")
     // - Verify output ("Nếu input là X thì output có đúng không?")
     // - Speculative debugging ("Nếu tôi đổi ... thành ... thì sao?")
   }
   ```

2. **Rule-based CoT Scoring (tiết kiệm token):**
   | Indicator | Score cộng |
   |-----------|------------|
   | Prompt có từ "tại sao", "why", "explain" | +15 |
   | Prompt chia thành bullet points / numbered list | +20 |
   | Prompt chứa hypothetical ("nếu...thì", "if...then") | +15 |
   | Prompt hỏi về edge case | +20 |
   | Prompt yêu cầu step-by-step | +10 |
   | Prompt quá ngắn (< 20 ký tự) như "fix this" | -30 |
   | Prompt là copy-paste toàn bộ code không kèm câu hỏi | -40 |

3. Lưu `cot_score` và `cot_indicators` vào `ai_prompting_chat_logs`.

---

## Task 2.4: BE – Hallucination Trap Detection

**Mô tả:** Phát hiện xem ứng viên có copy-paste code lỗi từ AI mà không kiểm tra hay không.

**Chi tiết công việc:**

1. Khi ứng viên submit code cuối (`POST /api/ai-prompting/sessions/:id/submit`):
   - So sánh `submitted_code` với `hallucination_bait` của bài (fuzzy match, > 80% similarity).
   - Nếu match: `hallucination_detected = true` → trừ điểm nặng (-30 điểm từ tổng).
   - Nếu ứng viên nhận ra và sửa lại được: `hallucination_overcome = true` → cộng điểm thưởng (+20).

2. Algorithm so sánh (đơn giản, không cần AI):
   ```ts
   import { diffChars } from 'diff';

   function calculateSimilarity(code1: string, code2: string): number {
     // Normalize: remove whitespace, lowercase
     const normalized1 = code1.replace(/\s+/g, ' ').trim().toLowerCase();
     const normalized2 = code2.replace(/\s+/g, ' ').trim().toLowerCase();
     const diff = diffChars(normalized1, normalized2);
     const sameChars = diff.filter(p => !p.added && !p.removed).reduce((s, p) => s + p.value.length, 0);
     return sameChars / Math.max(normalized1.length, normalized2.length);
   }
   ```

3. Bài không có `is_hallucination_trap`: Bỏ qua bước này.

---

## Task 2.5: BE – Final Scoring Pipeline

**Mô tả:** Tổng hợp và chấm điểm cuối vòng AI Prompting.

**Chi tiết công việc:**

1. Trigger: `POST /api/ai-prompting/sessions/:id/complete`
2. Thu thập data:
   - Toàn bộ `ai_prompting_chat_logs` của session.
   - `final_submitted_code`.
   - `hallucination_detected`, `hallucination_overcome`.
   - Tổng `cot_score` trung bình của các lượt user.

3. Build Evaluation Prompt gửi LLM:
   ```
   "Chấm điểm ứng viên dựa trên:
    1. Chất lượng tư duy (Chain of Thought) qua các prompt đặt ra.
    2. Code cuối nộp có đúng so với yêu cầu bài không?
    3. Ứng viên có phát hiện và sửa hallucination trap không?

    Dữ liệu chat (tóm tắt):
    {{chat_summary}}

    Code cuối:
    {{submitted_code}}

    Code đúng (để đối chiếu):
    {{correct_code}}

    Hallucination detected: {{true/false}}
    Hallucination overcome: {{true/false}}

    Trả về JSON: {score, feedback, cot_analysis, code_correctness, hallucination_verdict}"
   ```

4. **Score JSON Schema:**
   ```json
   {
     "total_score": 72,
     "breakdown": {
       "cot_quality": { "score": 80, "feedback": "Ứng viên thường đặt câu hỏi về nguyên nhân, tuy nhiên còn 2 lần paste code không kèm câu hỏi." },
       "code_correctness": { "score": 85, "feedback": "Code cuối giải quyết đúng race condition bằng optimistic locking." },
       "hallucination_handling": { "score": 30, "feedback": "Ứng viên đã copy-paste đúng đoạn bait của AI mà không verify. Đây là điểm trừ lớn.", "verdict": "FAILED_TRAP" }
     },
     "prompt_quality_timeline": [
       { "turn": 1, "cot_score": 20, "label": "Quá ngắn: 'fix this code'" },
       { "turn": 2, "cot_score": 75, "label": "Tốt: hỏi về nguyên nhân race condition" },
       { "turn": 3, "cot_score": 90, "label": "Xuất sắc: yêu cầu step-by-step giải thích" }
     ],
     "actionable_feedback": "Hãy luôn verify output của AI bằng cách chạy test case trước khi dùng code."
   }
   ```

---

## Task 2.6: FE – Giao diện Pair Programming

**Mô tả:** Giao diện chia đôi màn hình: Code Editor bên trái, AI Chat bên phải.

**Chi tiết công việc:**

1. **Layout split-panel (resizable):**
   ```
   [Left – Code Editor 60%]  |  [Right – AI Chat 40%]
   ```

2. **Left Panel – Code Editor:**
   - Monaco Editor (reuse từ Phase 1 nếu đã có) với syntax highlight.
   - Đoạn `buggy_code` được load sẵn, ứng viên có thể chỉnh sửa.
   - Không có nút "Run Code" (khác Phase 1) – focus vào việc dùng AI để hiểu, không phải brute-force chạy thử.
   - Nút duy nhất: **"Submit Code"** ở góc trên phải.
   - Read-only toggle: Lần đầu load, code bị read-only 10s để ứng viên đọc kỹ trước khi sửa.

3. **Right Panel – AI Chat:**
   - Giống component chat của Epic 1 nhưng không có STAR guide.
   - Placeholder gợi ý: *"Hãy mô tả vấn đề bạn thấy trong code, hoặc đặt câu hỏi cụ thể cho AI..."*
   - Hiển thị badge nhỏ "AI Coding Assistant" (không phải AI Facilitator).
   - **Chat bubble AI có thể chứa code block** (render markdown với `highlight.js`).

4. **CoT Live Feedback (Practice Mode only):**
   - Sau mỗi prompt user gửi đi, hiển thị micro-feedback nhỏ dưới input:
     - `cot_score >= 70`: ✅ "Prompt tốt – tư duy rõ ràng"
     - `cot_score 40-69`: ⚠️ "Hãy chia nhỏ câu hỏi hơn"
     - `cot_score < 40`: ❌ "Prompt quá chung chung, AI khó hỗ trợ hiệu quả"
   - Combat Mode: Không hiển thị feedback này (không được spoil điểm).

5. **Hallucination Alert (sau khi submit):**
   - Nếu `hallucination_detected`: Hiện modal đặc biệt màu đỏ:
     *"Bạn vừa submit code có chứa lỗi từ AI. Đây là một bẫy được cài cố ý. Hãy luôn verify code AI đề xuất!"*
   - Nếu `hallucination_overcome`: Hiện badge vàng "🏆 Bạn đã phát hiện AI Hallucination!"

6. **Header:**
   - Tên bài + difficulty badge.
   - Timer (Combat: đếm ngược; Practice: đếm lên).
   - Nút "Hint" (tốn 10 điểm, hiện gợi ý về loại bug cần tìm).

---

## Task 2.7: FE – Scorecard AI Prompting

**Mô tả:** Hiển thị kết quả vòng AI Prompting với visualization độc đáo.

**Chi tiết công việc:**

1. **Prompt Quality Timeline:**
   - Dạng line chart theo trục X = thứ tự prompt, trục Y = CoT score từng lượt.
   - Tooltip hover: Hiện lại nội dung prompt đó.
   - Trực quan hóa sự tiến bộ của tư duy trong phiên.

2. **Breakdown Cards:**
   - Card "Tư duy Chain-of-Thought": Điểm + feedback.
   - Card "Độ chính xác Code": Điểm + diff giữa code nộp và code đúng (minimal diff view).
   - Card "Hallucination Test": PASSED / FAILED với giải thích.

3. **Chat Replay:**
   - Nút "Xem lại hội thoại" → hiển thị toàn bộ chat kèm `cot_score` của từng lượt user (đã reveal).

---

## Quản trị rủi ro

| Rủi ro | Giải pháp |
|--------|-----------|
| Internal AI "lộ" đáp án quá sớm | System prompt cấm chủ động nêu bug, chỉ trả lời đúng câu được hỏi |
| Hallucination bait quá khó khiến ứng viên không nhận ra | Calibrate theo level: Junior bait đơn giản hơn (syntax), Senior bait ở logic level |
| Ứng viên không dùng AI chat mà tự fix code | Vẫn chấm dựa trên code cuối nhưng CoT score = 0, feedback ghi rõ "Không sử dụng AI Tool" |
| Cost token khi phân tích CoT mỗi lượt | Dùng rule-based CoT scoring trước, chỉ gọi LLM cho final evaluation |
| Monaco Editor bundle size quá lớn | Lazy load Monaco chỉ khi vào trang này, dùng `@monaco-editor/react` với dynamic import |
