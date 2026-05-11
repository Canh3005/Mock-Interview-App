# Probe-Aware Scoring Technical Options

Tài liệu này ghi lại các hướng kỹ thuật có thể dùng để đánh giá câu trả lời của candidate sau khi hệ thống đã biết probe cụ thể, expected signals, red flags, scoring hints và transcript/câu trả lời.

Mục tiêu không phải chốt implementation cho feature nào, mà là so sánh các option để chọn kiến trúc scoring hiệu quả, kiểm soát được chất lượng feedback và tránh AI nhận xét quá tự tin khi thiếu bằng chứng.

## Bối cảnh kỹ thuật

Input chính:
- Probe snapshot tại thời điểm candidate trả lời: intent, expected signals, red flags, scoring hints, type, competency, language.
- Câu trả lời text hoặc transcript từ voice.
- Metadata của lượt luyện tập: feedback language, source là single-question practice hay session.

Output mong muốn:
- Signal coverage: `covered`, `unclear`, `missing`.
- Evidence quotes gắn với từng nhận xét.
- Red flags nếu có.
- CV claim verification nếu probe thuộc nhóm CV deep-dive.
- Score hoặc score band có giải thích.
- Feedback user-facing theo ngôn ngữ candidate chọn.

Ràng buộc quan trọng:
- Không đánh dấu signal là `covered` nếu không có evidence rõ trong answer/transcript.
- Không public raw rubric/scoring hints cho candidate.
- Câu trả lời quá ngắn hoặc thiếu dữ liệu phải bị giảm confidence hoặc cap score.
- Kết quả cần lưu được để phục vụ UI feedback và analytics sau này.

## Option 1: Pure LLM Scoring

Luồng:

```text
attempt(answer, probeSnapshot) -> LLM -> scorecard JSON -> save -> render
```

Backend gửi probe snapshot và câu trả lời vào LLM, yêu cầu model trả về JSON scorecard hoàn chỉnh.

Ưu điểm:
- Làm nhanh, ít code nghiệp vụ ban đầu.
- Feedback tự nhiên, dễ sinh theo nhiều ngôn ngữ.
- Phù hợp để prototype và kiểm chứng trải nghiệm sản phẩm.

Nhược điểm:
- Dễ hallucinate hoặc overconfident nếu prompt không chặt.
- Khó đảm bảo mọi nhận xét đều có evidence quote thật.
- Score có thể dao động giữa các lần chạy.
- Test tự động khó vì output không deterministic.

Đánh giá:
- Dùng được cho MVP rất hẹp.
- Không nên là kiến trúc dài hạn nếu feedback cần đáng tin và có căn cứ.

## Option 2: Rule-Based hoặc Keyword Matching

Luồng:

```text
answer -> deterministic detectors -> scorecard
```

Hệ thống dùng rule, regex, keyword, length check, metric detector hoặc pattern matching để đánh giá câu trả lời.

Ưu điểm:
- Rẻ, nhanh, deterministic.
- Dễ viết unit test.
- Tốt cho các guardrail đơn giản như answer rỗng, quá ngắn, không có số liệu, không có đại từ thể hiện ownership.

Nhược điểm:
- Kém với behavioral answer vì cùng một ý có nhiều cách diễn đạt.
- Dễ false negative nếu candidate không dùng đúng keyword.
- Feedback thường cứng và thiếu hiểu ngữ cảnh.
- Không phù hợp làm core evaluator cho CV claim verification hoặc trade-off reasoning.

Đánh giá:
- Không nên dùng làm core scoring.
- Nên dùng làm lớp pre-check và guardrail phụ.

## Option 3: LLM Structured Extraction + Deterministic Aggregation

Luồng cơ bản:

```text
answer + probe rubric
-> LLM extract evidence per signal (tool_use / structured output)
-> backend validate evidence
-> deterministic score aggregator
-> optional narrative generator
-> save result
```

LLM không được tự do trả feedback cuối cùng ngay từ đầu. Nhiệm vụ chính của LLM là đọc câu trả lời, phân loại từng signal và trích evidence. Backend giữ quyền validate và aggregate score.

### 3a. Enforce schema qua tool_use thay vì prompt engineering

Thay vì chỉ hướng dẫn LLM "hãy trả JSON", nên dùng `tool_use` / function calling của API để buộc model trả đúng schema ngay tại tầng API. Lợi ích:

- Tỷ lệ parse lỗi giảm từ ~15–20% xuống gần 0%, không cần retry do malformed JSON.
- Không cần post-process text để tách JSON block.
- Constraint như `evidenceQuotes` rỗng → `status !== 'covered'` có thể khai báo trong schema thay vì chỉ enforce ở backend validator.

Ví dụ output trung gian (giữ nguyên shape, enforce qua schema):

```json
{
  "signals": [
    {
      "key": "personal_contribution",
      "status": "covered",
      "evidenceQuotes": ["I led the migration and coordinated rollout"],
      "rationale": "Candidate described their own role."
    }
  ],
  "redFlags": [
    {
      "key": "blame_shifting",
      "present": false,
      "evidenceQuotes": []
    }
  ],
  "cvClaims": [
    {
      "claim": "Improved latency by 40%",
      "verification": "not_verified",
      "evidenceQuotes": []
    }
  ],
  "confidence": "high"
}
```

### 3b. Model tier routing theo độ phức tạp

Không nên dùng một model duy nhất cho toàn bộ pipeline. Chia theo tầng:

```text
Pre-check + guardrail đơn giản  → Haiku 4.5   (rẻ, ~100ms)
Signal extraction chính         → Sonnet 4.6  (~600–900ms)
CV claim / complex reasoning    → Opus 4.7    (chỉ bật khi probe_type = cv_deep_dive)
Narrative generator             → Haiku 4.5 hoặc Sonnet 4.6 nhẹ
```

Haiku đủ năng lực để check "answer rỗng / quá ngắn / ngoài chủ đề" — không cần Sonnet cho bước này. Phần lớn latency savings đến từ đây mà không đánh đổi accuracy ở bước extraction chính.

### 3c. Confidence-based verifier routing

Thay vì luôn chạy 2 pass (tốn latency) hoặc không bao giờ verify (rủi ro), dùng confidence từ output của extraction pass để quyết định:

```text
extraction output → confidence = 'high'          → validate và save ngay
                 → confidence = 'low'            → trigger verifier pass
                 → có signal conflict/mâu thuẫn → trigger verifier pass
                 → probe_type = cv_deep_dive     → luôn trigger verifier pass
```

Trong thực tế ~70–80% case confidence cao, chỉ chạy 1 pass. Verifier chỉ tốn latency khi thật sự cần.

### 3d. Embedding pre-selection cho transcript dài (tích hợp từ Option 4)

Khi input là voice transcript hoặc answer dài, không gửi toàn bộ vào LLM. Dùng embedding để pre-select trước:

```text
Transcript dài → chunk (theo câu hoặc đoạn)
Per signal description → embed
→ cosine similarity → lấy top-K chunks liên quan nhất cho signal đó
→ chỉ gửi K chunks đó vào LLM extraction, không gửi toàn bộ transcript
```

Lợi ích:
- LLM context nhỏ hơn → nhanh hơn, rẻ hơn, ít bị distracted bởi nội dung không liên quan.
- Tăng precision vì LLM tập trung vào đúng đoạn text.
- Embedding probe rubric có thể cache vì probe ít thay đổi.

Giới hạn:
- Chunking quá nhỏ có thể mất context giữa câu → chunk theo đoạn ngữ nghĩa, không phải từng câu đơn lẻ.
- Không dùng embedding thay thế LLM extraction — embedding chỉ làm bước pre-selection.

Backend sau đó tính score hoặc band bằng rule:

```text
covered = +2
unclear = +1
missing = 0
red flag = penalty
answer too short = cap max score
covered without valid quote = downgrade
confidence low = cap band tối đa
```

Ưu điểm:
- Cân bằng tốt giữa semantic understanding của LLM và kiểm soát deterministic ở backend.
- Có thể enforce rule: không có evidence thì không được `covered`.
- Dễ test phần aggregator và validator.
- Contract lưu trữ sạch, FE có thể render ổn định.
- Phù hợp để mở rộng sang analytics signal coverage.
- tool_use enforcement giảm retry do parse lỗi.
- Model tier routing giảm latency mà không giảm accuracy.
- Embedding pre-selection giúp transcript dài vẫn được evaluate chính xác.

Nhược điểm:
- Phức tạp hơn pure LLM.
- Cần JSON schema validation chặt và tool_use schema thiết kế cẩn thận.
- Cần kiểm tra evidence quote có thật trong answer/transcript.
- Vẫn cần xử lý retry/fallback khi LLM trả output lỗi.
- Embedding pre-selection thêm một bước latency nhỏ — chỉ bật khi transcript vượt ngưỡng độ dài.

Đánh giá:
- Đây là hướng khuyến nghị cho probe-aware scoring.

## Option 4: Embedding hoặc Semantic Similarity

Luồng nếu dùng độc lập (không khuyến nghị):

```text
split answer -> embeddings
expected signals -> embeddings
similarity matrix -> candidate coverage
```

Luồng đúng — dùng như support layer cho Option 3:

```text
transcript/answer dài
-> chunk theo đoạn ngữ nghĩa
-> embed từng chunk
-> embed từng signal description (có thể cache vì probe ít thay đổi)
-> cosine similarity → top-K chunks per signal
-> chỉ các chunks này được gửi vào LLM extraction (Option 3)
```

Ưu điểm khi dùng đúng vai trò:
- Giảm context size gửi vào LLM → nhanh hơn, rẻ hơn.
- Tăng precision: LLM tập trung vào đúng đoạn text liên quan.
- Embedding probe rubric cache được vì probe hiếm khi thay đổi mid-session.
- Hữu ích cho analytics về sau: biết candidate đề cập gì về từng signal.

Nhược điểm nếu dùng độc lập làm evaluator:
- Similarity cao không đồng nghĩa candidate trả lời đạt — chỉ biết có đề cập, không biết có evidence.
- Không phân biệt được nói chung chung với evidence cụ thể.
- Không tự tạo feedback.
- Không xử lý red flags, CV verification, reasoning quality.

Đánh giá:
- Không nên dùng làm evaluator chính đứng độc lập.
- Nên tích hợp vào Option 3 (xem mục 3d) như bước pre-selection cho transcript dài.
- Chỉ bật pre-selection khi transcript vượt ngưỡng độ dài (ví dụ > 800 tokens) để tránh overhead không cần thiết với answer ngắn.

## Option 5: Multi-Pass LLM Evaluator + Verifier

Luồng:

```text
LLM evaluator -> draft structured scorecard
LLM verifier -> corrected scorecard or low-confidence result
backend validate -> save
```

Một LLM pass đầu đánh giá câu trả lời. Pass thứ hai kiểm tra consistency: signal nào bị đánh dấu covered có quote thật không, quote có hỗ trợ nhận xét không, score có quá tự tin không.

Ưu điểm:
- Giảm rủi ro hallucination.
- Tốt cho CV deep-dive hoặc trường hợp score có tác động lớn đến trải nghiệm candidate.
- Có thể phát hiện output mâu thuẫn trước khi lưu.

Nhược điểm:
- Tốn token và chậm hơn.
- Vẫn không deterministic hoàn toàn.
- Cần async queue, timeout, retry và trạng thái thất bại rõ ràng.

Đánh giá:
- Phù hợp cho phase sau hoặc chỉ bật với case high-risk.
- Có thể dùng khi confidence thấp hoặc probe thuộc nhóm CV claim verification.

## Khuyến nghị

Hướng nên chọn là Option 3 với đầy đủ các lớp bổ sung:

```text
1. Candidate submit answer.
2. Backend tạo attempt trạng thái pending_feedback.
3. Queue scoring job.

4. Pre-check (model nhỏ của groq 8b):
   - Pre-check rỗng/quá ngắn/language unsupported nên ưu tiên deterministic code trước model bước sau
   - dữ liệu không đủ để đánh giá đầy đủ
   → fail fast nếu không pass, trả feedback_ready với band insufficient_evidence, để candidate vẫn thấy feedback “chưa đủ dữ liệu để đánh giá”. feedback_failed chỉ nên dùng cho lỗi hệ thống: LLM timeout, parse/schema fail sau retry, queue fail.

5. [Nếu transcript/answer dài > ngưỡng] Embedding pre-selection:
   - chunk transcript theo đoạn ngữ nghĩa
   - embed chunks + embed signal descriptions (cache probe embeddings)
   - lấy top-K chunks liên quan nhất per signal, kèm neighbor chunks trước/sau nếu cần
   - chỉ dùng K chunks này làm input cho bước 6
   - fallback gửi full answer nếu answer không quá dài hoặc similarity thấp

6. LLM structured extraction (model groq 70b) qua tool_use:
   - classify từng expected signal: covered, unclear, missing
   - bắt buộc evidence quote cho covered/unclear — enforce trong tool schema
   - detect red flags + evidence
   - verify CV claims nếu probe_type = cv_deep_dive
   - trả kèm confidence: high / medium / low

7. Backend validate:
   - JSON schema hợp lệ (tool_use đã giảm rủi ro này)
   - evidence quote phải tồn tại trong answer/transcript gốc
   - quote không tồn tại trong transcript → reject quote
   - không còn evidence nào → không được covered
   - nếu có partial/ambiguous evidence → unclear
   - nếu không có evidence → missing
   - answer quá ngắn thì cap band tối đa

8. Confidence-based routing:
   - confidence = high và không có conflict → tiếp tục bước 9
   - confidence = low / có signal mâu thuẫn / probe_type = cv_deep_dive
     → trigger verifier pass (model groq 70b)
     → verifier check consistency, downgrade nếu cần
     → merge kết quả, tiếp tục bước 9

9. Deterministic aggregator:
   - tính score hoặc score band từ signal results
   - derive summary dimensions
   - apply penalty cho red flags

10. LLM narrative (model nhẹ):
    - chuyển structured result thành feedback user-facing theo ngôn ngữ candidate
    - không được thêm fact mới ngoài structured result

11. Save result:
    - feedback_ready nếu thành công
    - feedback_failed nếu lỗi không recover được
```

Tư duy chính:
- LLM dùng để hiểu ngữ nghĩa và trích evidence — không để tự do đánh giá.
- Embedding dùng để pre-select context, không để thay thế LLM extraction.
- tool_use enforcement thay thế prompt engineering cho JSON output.
- Model tier routing (Haiku / Sonnet / Opus) theo độ phức tạp thực tế của từng bước.
- Verifier chỉ chạy khi cần — không phải mặc định cho mọi request.
- Backend dùng để kiểm soát rule, score, confidence và state transition.
- UI chỉ render feedback đã được diễn giải, không render raw rubric.

## Contract gợi ý ở mức khái niệm

```ts
type SignalStatus = 'covered' | 'unclear' | 'missing';
type ClaimVerification = 'verified' | 'not_verified' | 'inflated_risk';

interface ProbeScoringResult {
  attemptId: string;
  status: 'feedback_ready' | 'feedback_failed';
  overallBand: 'strong' | 'solid' | 'needs_work' | 'insufficient_evidence';
  confidence: 'high' | 'medium' | 'low';
  summary: string;
  signalResults: Array<{
    key: string;
    label: string;
    status: SignalStatus;
    evidenceQuotes: string[];
    feedback: string;
  }>;
  redFlags: Array<{
    key: string;
    label: string;
    present: boolean;
    evidenceQuotes: string[];
    feedback: string;
  }>;
  cvClaimResults?: Array<{
    claim: string;
    verification: ClaimVerification;
    evidenceQuotes: string[];
    feedback: string;
  }>;
  improvementSuggestions: string[];
}
```

Đây chỉ là shape tham khảo. HOW hoặc implementation sau này có thể đổi tên field theo convention hiện có.

## Guardrails bắt buộc

- Validate JSON schema từ LLM trước khi lưu.
- Không tin evidence quote nếu quote không match answer/transcript.
- Không cho LLM tự tạo quote.
- Không cho status `covered` nếu evidence rỗng.
- Với answer quá ngắn, max band không vượt quá `insufficient_evidence` hoặc `needs_work`.
- Nếu LLM output lỗi nhiều lần, attempt chuyển sang `feedback_failed` để UI cho retry.
- Log structured reason khi downgrade signal để debug scoring quality.

## Kết luận

Pure LLM scoring nhanh nhưng rủi ro cao. Rule-based scoring ổn định nhưng không đủ hiểu ngữ nghĩa. Embedding dùng độc lập không đủ làm evaluator nhưng là support layer hiệu quả cho transcript dài.

Phương án hiệu quả nhất là **Option 3 với 4 lớp bổ sung**:

| Lớp | Mục tiêu | Tool |
|-----|----------|------|
| tool_use schema enforcement | Loại bỏ parse lỗi, enforce constraint tại API | Claude tool_use |
| Model tier routing | Giảm latency, giữ accuracy theo độ phức tạp | Haiku / Sonnet / Opus |
| Embedding pre-selection | Transcript dài vẫn accurate, context nhỏ hơn | Embedding API + cache |
| Confidence-based verifier | Accuracy cao khi cần, không trả latency mọi lúc | Sonnet / Opus on-demand |

Kiến trúc này đáp ứng đồng thời: hiểu ngữ nghĩa và nhiều cách diễn đạt (LLM extraction), kiểm soát chất lượng evidence (backend validate), và latency hợp lý (model tier + verifier on-demand).
