## WHAT

Architecture Evaluation Engine là component chạy ngay sau khi SD session kết thúc (phase = COMPLETED). Nó phân tích `finalArchitectureJSON` và `transcriptHistory` của ứng viên, đối chiếu với `referenceArchitecture` và rubric của problem, rồi trả về điểm số định lượng theo 5 dimension với tổng 100 điểm. Kết quả evaluation được stream về FE từng dimension một và là input bắt buộc cho Epic 5 (Debrief screen).

---

## WHY

Sau khi SD session kết thúc hiện tại, ứng viên không nhận được feedback cụ thể — họ không biết mình làm tốt ở đâu, yếu ở đâu, và cần cải thiện gì. Không có vòng feedback có cấu trúc thì không có lý do để quay lại luyện tập. Evaluation Engine là thành phần tạo ra "learning loop": ứng viên thấy score breakdown rõ ràng → xác định gap → quay lại luyện tiếp.

Ngoài ra, Evaluation Engine là prerequisite của Epic 5 (Debrief): Reference Architecture Walkthrough và Annotated Transcript cần `evaluationResult` — đặc biệt là missing components và trade-off citations — để render đúng.

---

## Epic Context

**Nằm trong:** Phase 3 — System Design Mock Interview Round (Epic 4 trong lộ trình)

**Vị trí trong epic:**
- **Phụ thuộc vào:**
  - `001-sd-problem-bank` — `expectedComponents`, `referenceArchitecture`, `scalingConstraints`, `curveBallScenarios[i].expectedAdaptation`
  - `004-sd-ai-interviewer` — `transcriptHistory` (per-phase), `componentCoverage`, `hintsUsed`, `curveballAdaptation` JSON diff, `phase = COMPLETED` trigger
  - `005-sd-silence-detection` — không phụ thuộc trực tiếp; chỉ cần biết silence log không được đưa vào transcript evaluation (silence events ≠ conversation turn)
  - `006-sd-design-phase-flow` — explanation sub-state tạo ra transcript chất lượng cao hơn; evaluation Trade-off Articulation và Communication Clarity benefit trực tiếp từ việc ứng viên bắt buộc phải explain diagram
- **Cung cấp cho:** `008-sd-debrief` (Epic 5) — cần `evaluationResult` với score breakdown, grade band, missing components, trade-off citations, dimension-level feedback

**Luồng lớn hơn:** Session COMPLETED → Evaluation Engine chạy (streaming, ~15s) → result persist vào SDSession → FE chuyển sang Debrief screen (Epic 5).

---

## SCOPE

**In:**
- **Trigger evaluation khi phase = COMPLETED:** Phase = COMPLETED được set bởi hai cơ chế — (1) WRAP_UP hoàn thành chủ động: AI append `[PHASE_COMPLETE]` sau khi hỏi đủ failure/scaling questions và curveball đã được xử lý; (2) Session timeout (safety net): hết `durationMinutes` ở bất kỳ phase nào. Khi FE nhận `meta.phase = 'COMPLETED'` từ SSE done event của AI interviewer → FE gọi `POST /sd-sessions/:id/evaluate` → backend stream kết quả evaluation từng dimension về.
- **Dimension 1 — Component Coverage (25 điểm):** So sánh node types có trong `finalArchitectureJSON` với `problem.expectedComponents`; tính ratio; trả về score + danh sách missing components
- **Dimension 2 — Scalability Fit (20 điểm):** AI phân tích topology trong `finalArchitectureJSON` đối chiếu với `problem.scalingConstraints` (peak QPS, DAU, storage target); xác định over/under-engineering; trả về score + reasoning ngắn
- **Dimension 3 — Trade-off Articulation (20 điểm):** AI đọc `transcriptHistory`, đếm và cite các đoạn ứng viên giải thích rõ trade-off (VD: "dùng Kafka vì ... thay vì Redis vì ..."); mỗi trade-off phải có citation (timestamp + quote) mới được tính
- **Dimension 4 — Communication Clarity (15 điểm):** AI đánh giá fluency, cấu trúc giải thích, dùng đúng terminology kỹ thuật trong `transcriptHistory`
- **Dimension 5 — Curveball Adaptation (20 điểm, chỉ khi có curveball):** AI so sánh `curveballAdaptation` JSON diff với `problem.curveBallScenarios[i].expectedAdaptation`; đánh giá ứng viên có xử lý đúng hướng không
- **Redistribution khi không có curveball:** `curveballAdaptation = null` → 20 điểm được phân bổ lại vào 4 dimension còn lại theo tỉ lệ gốc (25:20:20:15 → 31:25:25:19, làm tròn để tổng = 100)
- **Hint penalty:** `final_score = raw_score − min(hintsUsed × 5, 15)`; score không âm (clamped at 0)
- **Grade band assignment:** Exceptional (90–100) / Strong (75–89) / Good (60–74) / Developing (45–59) / Needs Work (< 45)
- **Streaming result về FE:** Mỗi dimension hoàn thành → stream ngay về FE; FE cập nhật loading indicator từ "Đang phân tích..." → hiển thị score từng dimension; target tổng <= 15s
- **Persist evaluation result:** `SDSession.evaluationResult` lưu toàn bộ score breakdown, grade band, dimension details (bao gồm missing components, trade-off citations, curveball reasoning)

**Out:**
- Debrief UI và Reference Architecture Walkthrough — thuộc Epic 5
- Annotated Transcript render — thuộc Epic 5
- Re-evaluation hoặc redo session — không có trong story này
- Evaluation real-time trong session (chỉ chạy sau COMPLETED, không chạy mid-session)

**Depends on:**
- `001-sd-problem-bank` — `expectedComponents`, `referenceArchitecture`, `scalingConstraints`, `curveBallScenarios[i].expectedAdaptation` phải có sẵn
- `004-sd-ai-interviewer` — `SDSession.transcriptHistory`, `hintsUsed`, `curveballAdaptation`, `phase = COMPLETED`
- `006-sd-design-phase-flow` — finalArchitectureJSON phải đã lock sau "Done Drawing"; transcript phải có explanation sub-state content

**Blocks:**
- `008-sd-debrief` (Epic 5) — Debrief cần `evaluationResult` để render score breakdown, missing components, trade-off citations, Reference Architecture overlay

---

## Business Flow

### Happy Path

1. Session phase chuyển sang COMPLETED (timeout hoặc AI kết thúc đúng giờ)
2. FE nhận phase = COMPLETED → hiển thị loading screen: *"Đang phân tích bài làm của bạn..."*
3. Backend trigger evaluation job — chạy 5 dimensions tuần tự, stream từng kết quả về FE

**Dimension 1 — Component Coverage** (không cần AI, rule-based):
4. So sánh node types trong `finalArchitectureJSON.nodes[]` với `problem.expectedComponents[]`
5. Tính `coverageScore = round(matched / total × 25)`; ghi `missingComponents = expectedComponents − matched`
6. Stream kết quả về FE → FE cập nhật: *"Component Coverage: 19/25 — thiếu [Message Queue, CDN]"*

**Dimension 2 — Scalability Fit** (AI call):
7. AI nhận `architectureTopology` (node types + edges) + `scalingConstraints` (peak QPS, DAU, storage)
8. AI đánh giá: topology có phù hợp với scale đã clarify không? Over-engineer (thêm component không cần thiết cho scale này) hay under-engineer (thiếu component thiết yếu)?
9. AI trả về score/20 + reasoning 1–2 câu
10. Stream kết quả về FE

**Dimension 3 — Trade-off Articulation** (AI call):
11. AI nhận `transcriptHistory` (toàn bộ, đã có timestamp và phase)
12. AI tìm và cite các đoạn ứng viên giải thích trade-off rõ ràng (so sánh 2 lựa chọn, lý do chọn cái này thay cái kia)
13. Mỗi trade-off phải có citation (phase + quote); không có citation = không được tính
14. AI trả về score/20 + danh sách trade-off citations
15. Stream kết quả về FE

**Dimension 4 — Communication Clarity** (AI call):
16. AI đánh giá `transcriptHistory` về fluency, cấu trúc giải thích, dùng đúng terminology kỹ thuật
17. AI trả về score/15
18. Stream kết quả về FE

**Dimension 5 — Curveball Adaptation** (AI call, chỉ khi có curveball):
19. AI nhận `curveballAdaptation` JSON diff + `curveBallScenarios[i].expectedAdaptation`
20. AI đánh giá: diagram thay đổi sau curveball có đi đúng hướng xử lý không?
21. AI trả về score/20 + reasoning
22. Stream kết quả về FE

**Final calculation:**
23. Áp dụng hint penalty: `final_score = sum(dimensions) − min(hintsUsed × 5, 15)`
24. Assign grade band từ final_score
25. Persist toàn bộ `evaluationResult` vào SDSession
26. Emit completion signal → FE chuyển sang Debrief screen (Epic 5)

### Edge Cases & Business Rules

| Trường hợp | Hành động | Kết quả từ góc nhìn ứng viên |
|---|---|---|
| `finalArchitectureJSON` rỗng (ứng viên không vẽ gì) | Component Coverage = 0/25; Scalability Fit = 0/20 (AI không đủ data); Curveball Adaptation = 0 nếu có curveball; Trade-off và Communication vẫn evaluate từ transcript | Ứng viên thấy score thấp ở 3 dimensions đầu, nhận được feedback thực tế |
| `transcriptHistory` rỗng hoặc < 3 turns | Trade-off Articulation = 0/20; Communication Clarity = 0/15; các dimension khác không ảnh hưởng | Dimension note: "Không đủ dữ liệu transcript để đánh giá" |
| `curveballAdaptation = null` (không có curveball trong session) | Redistribution: 20 điểm phân bổ lại theo tỉ lệ gốc → max score: Component 31 + Scalability 25 + Trade-off 25 + Communication 19 = 100 | Ứng viên không thấy Curveball dimension; tổng vẫn 100 điểm |
| AI call fail cho 1 dimension (API error, timeout) | Dimension đó = 0 điểm + ghi note "Không thể đánh giá do lỗi hệ thống"; các dimension khác vẫn trả về bình thường | Ứng viên thấy đủ kết quả — dimension lỗi hiển thị rõ note |
| `hintsUsed = 0` | Penalty = 0; final_score = raw_score | Không ảnh hưởng gì |
| `hintsUsed = 4` (penalty = 20 > cap) | Penalty capped ở 15; final_score = raw_score − 15 | Tối đa trừ 15 điểm, không âm |
| `raw_score − penalty < 0` (edge: transcript rỗng + nhiều hint) | final_score clamped at 0 | Score hiển thị 0, không âm |
| Evaluation job tốn > 15s (AI chậm) | Các dimension đã stream vẫn hiển thị ngay; dimension chưa xong tiếp tục chờ; không cancel job | Ứng viên thấy progress thực tế — không bị spinner trống |

**Business Rules:**
- Evaluation chỉ chạy một lần sau phase = COMPLETED — không chạy lại mid-session
- Mỗi AI dimension phải include citation bắt buộc khi claim score (Trade-off phải quote transcript; Curveball phải reference JSON diff) — không có citation = dimension score = 0 (tránh hallucinate)
- Redistribution 20 điểm Curveball chỉ xảy ra khi `curveballAdaptation = null`; nếu có curveball dù adaptation = {} (ứng viên không thay đổi gì) thì vẫn evaluate và score có thể = 0
- Component Coverage là rule-based (không cần AI) — kết quả deterministic và nhanh nhất, nên stream đầu tiên
- Hint penalty áp dụng sau khi tất cả dimensions đã tính; penalty không ảnh hưởng từng dimension riêng lẻ

---

## Acceptance Criteria

```
AC 1: Trigger evaluation tự động khi session kết thúc
Given SDSession.phase vừa chuyển sang COMPLETED (bất kể lý do: timeout hay AI kết thúc)
When backend nhận phase change event
Then evaluation job được trigger ngay lập tức (không cần action từ ứng viên)
     FE hiển thị loading screen "Đang phân tích bài làm của bạn..."

---

AC 2: Component Coverage — rule-based, deterministic
Given finalArchitectureJSON có 6 node types, problem.expectedComponents có 8 items
When Component Coverage evaluation chạy
Then score = round(6/8 × 25) = 19/25
     missingComponents = 2 components không có trong finalArchitectureJSON được liệt kê

Given finalArchitectureJSON rỗng (nodes = [])
When Component Coverage evaluation chạy
Then score = 0/25
     missingComponents = toàn bộ expectedComponents

---

AC 3: Curveball redistribution khi không có curveball
Given SDSession.curveballAdaptation = null (session không có curveball inject)
When evaluation tính score breakdown
Then không có Curveball Adaptation dimension trong kết quả
     Max score của 4 dimensions còn lại = 100 điểm (theo tỉ lệ 31:25:25:19)
     Grade band vẫn tính trên thang 100

Given SDSession.curveballAdaptation = {} (curveball đã inject nhưng ứng viên không thay đổi diagram)
When Curveball Adaptation evaluation chạy
Then dimension này vẫn được evaluate (score có thể = 0/20)
     Redistribution KHÔNG áp dụng

---

AC 4: Hint penalty
Given SDSession.hintsUsed = 2
When evaluation tính final score
Then penalty = 10 điểm; final_score = raw_score − 10

Given SDSession.hintsUsed = 4
When evaluation tính final score
Then penalty = 15 điểm (capped); final_score = raw_score − 15

Given raw_score = 12, hintsUsed = 3 (penalty = 15)
When evaluation tính final score
Then final_score = max(12 − 15, 0) = 0 (clamped, không âm)

---

AC 5: Grade band
Given final_score = 82
When grade band được assign
Then label = "Strong"

Given final_score = 44
When grade band được assign
Then label = "Needs Work"

---

AC 6: Streaming từng dimension về FE
Given evaluation job đang chạy, Component Coverage vừa hoàn thành
When dimension 1 stream về FE
Then FE hiển thị "Component Coverage: 19/25" ngay lập tức
     FE bắt đầu hiển thị "Đang kiểm tra Scalability Fit..." (dimension 2)

Given tất cả 5 (hoặc 4 nếu không có curveball) dimensions đã hoàn thành
When evaluation emit completion signal
Then FE nhận signal → chuyển sang Debrief screen (Epic 5)
     Toàn bộ quá trình từ COMPLETED đến completion signal <= 15 giây

---

AC 7: AI citation bắt buộc — Trade-off Articulation
Given transcriptHistory có 10 turns, trong đó ứng viên giải thích 2 trade-off rõ ràng và 1 đoạn mơ hồ
When Trade-off Articulation evaluation chạy
Then chỉ 2 trade-off được tính điểm (mỗi trade-off kèm citation: phase + quote)
     Đoạn mơ hồ không có citation = không được tính

Given AI không tìm được trade-off nào trong transcript
When Trade-off Articulation evaluation chạy
Then score = 0/20 (không hallucinate score)

---

AC 8: Persist evaluation result
Given evaluation hoàn thành (tất cả dimensions đã stream)
When final_score và grade band được tính
Then SDSession.evaluationResult được lưu với đầy đủ:
     score breakdown từng dimension, grade band, final_score,
     missingComponents, trade-off citations, curveball reasoning (nếu có)
     Epic 5 có thể đọc evaluationResult từ SDSession để render Debrief

---

AC 9: AI dimension fail gracefully
Given AI call cho Scalability Fit timeout hoặc trả về lỗi
When dimension 2 fail
Then dimension 2 = 0/20 với note "Không thể đánh giá do lỗi hệ thống"
     Các dimension còn lại tiếp tục bình thường
     Final score được tính với dimension 2 = 0
```

---

## Risk

**HIGH** — 2 rủi ro chính:

**1. AI hallucinate khi đánh giá Trade-off Articulation hoặc Curveball Adaptation:**
- **Impact:** Score sai — ứng viên thấy điểm cao dù không thực sự giải thích trade-off, hoặc ngược lại. Mất niềm tin vào toàn bộ platform vì đây là số điểm duy nhất họ thấy sau mỗi phiên.
- **Mitigation:** Citation bắt buộc trên toàn bộ AI dimensions: AI phải quote đúng đoạn transcript (timestamp + text) hoặc reference đúng JSON diff khi claim điểm — không có citation = không được tính, score = 0 cho item đó. Structured rubric prompt với few-shot examples.

**2. Latency > 15s — ứng viên abandon trước khi thấy debrief:**
- **Impact:** Ứng viên chờ quá lâu sau khi phiên kết thúc, đóng tab trước khi nhận feedback. Toàn bộ giá trị của platform mất đi nếu feedback không được đọc.
- **Mitigation:** Stream từng dimension ngay khi hoàn thành (không chờ tất cả xong); Component Coverage chạy trước (rule-based, < 100ms) để FE có gì hiện ngay lập tức; skeleton loader với copy thực tế thay spinner; target 3s/AI dimension avg = 12s tổng cho 4 AI dimensions + buffer.
