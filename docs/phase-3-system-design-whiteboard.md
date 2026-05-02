# Phase 3: Mở rộng Vòng thi Thiết kế Hệ thống (System Design Mock)

## Mục tiêu

Xây dựng vòng phỏng vấn mô phỏng System Design — vòng thi đòi hỏi cao nhất và có giá trị phân loại nhất cho ứng viên Mid/Senior/Staff. Khác với DSA (đánh giá thuật toán) hay Behavioral (đánh giá giao tiếp), System Design đánh giá tư duy kiến trúc tổng thể: khả năng làm rõ yêu cầu, đưa ra trade-off có lý luận, và mở rộng hệ thống dưới áp lực thay đổi.

Vòng thi được thiết kế theo đúng format phỏng vấn thật (45–60 phút, 4 phase tuần tự: Clarification → High-level Architecture → Deep Dive → Edge Cases) với AI đóng vai interviewer chủ động — không phải form điền bài.

---

## Nguyên tắc thiết kế cốt lõi

1. **JSON over Image**: Mọi dữ liệu diagram đều được trích xuất thành JSON topology — không dùng Vision AI để đọc ảnh (tốn token, hallucination cao với diagram phức tạp).
2. **Phase-aware AI**: AI interviewer tự điều phối theo 4 phase của phỏng vấn thật. Không nhảy phase, không spoil.
3. **Curveball có điều kiện**: Chỉ inject tình huống phát sinh khi ứng viên đang làm tốt (`architectureScore >= 80%`). Tuyệt đối không làm khó ứng viên đang bế tắc.
4. **Structured Rubric**: Scoring phải định lượng được theo từng dimension — không chỉ là AI verdict suông.

---

## Lộ trình & Phạm vi công việc

### Epic 0: SD Problem Bank (Prerequisite)

Nền tảng cho toàn bộ phase. Không có problem bank chuẩn thì mọi epic còn lại không đảm bảo chất lượng và tính reproducible.

**Nội dung:**
- **Metadata chuẩn cho mỗi problem**: `domain` (URL shortener, chat system, feed ranking, rate limiter…), `targetRole[]` (Backend/Full-stack/Data Eng), `targetLevel` (Mid/Senior/Staff), `scalingConstraints` (peak QPS, DAU, storage target), `expectedComponents[]`, `referenceArchitecture` (JSON topology — không phải ảnh), `curveBallScenarios[]`
- **Cấu trúc `curveBallScenarios`**: Mỗi scenario có `{ trigger: string, prompt: string, expectedAdaptation: string }` để AI Interviewer Engine dùng — không generate on-the-fly
- **Admin panel tạo/edit problem**: Nối vào Phase 1 Epic 0 (Admin Problem Management) đã có — thêm tab SD problem bên cạnh DSA problem
- **Tag system** để Personalization Engine query theo `(targetRole, targetLevel, companyProfile)`
- **`referenceArchitecture` format**: JSON dạng `{ nodes: [{ id, type, label }], edges: [{ from, to, label }] }` — cùng format với output của Whiteboard (Epic 2) để Evaluation Engine so sánh trực tiếp

**Vì sao tách epic riêng:** Problem bank là hard dependency của 4 epic còn lại. Nếu AI generate đề bài on-the-fly thì không kiểm soát được chất lượng, không có reference architecture để đánh giá, và không có curveball scenario để inject đúng lúc.

**Tham khảo thị trường:**
- **Grokking the System Design Interview** (Educative) — 18 problem có model answer + rubric cấu trúc rõ nhất hiện tại; dùng làm benchmark cho metadata format
- **System Design Primer** (GitHub) — problem list + reference solution dạng markdown; không có structured metadata nhưng là nguồn nội dung lớn nhất
- **Exponent** — problem bank kèm rubric chấm điểm theo dimension; human-evaluated, không automated
- Điểm chung của tất cả: không có JSON topology cho reference architecture — đây là phần phải tự xây

**Nguồn tham khảo để seed problem bank:**
- [System Design Primer](https://github.com/donnemartin/system-design-primer) (233k+ stars) — nguồn tốt nhất để lấy danh sách bài + reference architecture mẫu
- [Grokking the System Design Interview](https://www.designgurus.io/course/grokking-the-system-design-interview) (paid) — 18 bài có structure rõ: TinyURL, Instagram, Dropbox, Twitter, YouTube, Uber, Ticketmaster
- [awesome-system-design-resources](https://github.com/ashishps1/awesome-system-design-resources) — curated list link ra bài viết sâu theo từng component

**Không có JSON dataset sẵn** — tất cả nguồn trên là markdown/web. Cần tự seed bằng cách điền metadata theo format đã thiết kế. Seed list đề xuất ban đầu (~15 bài cover Mid–Senior):
```
URL Shortener, Twitter Feed, Instagram, YouTube,
Chat System (WhatsApp), Notification System,
Rate Limiter, Search Autocomplete, Ride-sharing (Uber),
Distributed Cache, Web Crawler, File Storage (Dropbox),
Payment System, API Gateway, News Feed Ranking
```

---

### Epic 1: Personalization & Pre-session Setup

SD round là round tiếp nối sau Live Coding trong cùng một phiên phỏng vấn — `targetRole`, `targetLevel`, và CV-JD context đã được thu thập từ bước thiết lập phiên (interview session setup) ở Phase 2. Epic này không yêu cầu ứng viên nhập lại thông tin.

**Nội dung:**
- **Problem selection từ CV-JD context**: Đọc `cvJdContext` từ interview session (đã có từ Phase 2 entry flow) — extract `inferredRole`, `inferredLevel`, `targetCompanyProfile`. Query problem bank theo 3 field này, random trong subset phù hợp để tránh cherry-pick
- **Màn hình config khi chọn round**: Khi ứng viên thêm SD round vào phiên phỏng vấn, hiển thị 2 option:
  - `sessionDuration`: 45 / 60 phút
  - `enableCurveball`: toggle bật/tắt — mặc định **bật**
- **Explanation walkthrough**: Giải thích ngắn format phỏng vấn (4 phase, canvas unlock sau clarification) trước khi bắt đầu — chỉ hiển thị lần đầu
- **Session object khởi tạo**: Tạo `SDSession` với `problem`, `config`, `phase: 'CLARIFICATION'`, `architectureJSON: null`, `transcriptHistory: []`

**Dependency:** Epic 0 phải done trước. CV-JD context từ Phase 2 entry flow phải có sẵn trong interview session.

**Tham khảo thị trường:**
- **Interview Kickstart** — map problem theo target company + role; personalization dựa trên hồ sơ ứng viên nhưng vẫn là manual selection
- **Exponent** — filter bài theo level (junior/senior); không dùng CV-JD context để tự động chọn
- Không có platform nào hiện tại tự động infer level + domain từ CV-JD để chọn đề — đây là differentiator thực sự của epic này

---

### Epic 2: Virtual Whiteboard (Structured Canvas)

Không gian vẽ kiến trúc — tương đương bảng trắng trong phỏng vấn thật. Được mở ra sau khi ứng viên hoàn thành Clarification phase.

**Nội dung:**
- **Node library chuẩn** (drag & drop): Load Balancer, API Gateway, Web Server, Cache (Redis), Message Queue (Kafka/SQS), Database (SQL/NoSQL), Object Storage (S3), CDN, Client, Worker, External Service — mỗi node có icon nhận diện ngay
- **Connection có label**: Edge nối giữa hai node có label mô tả loại data flow (HTTP, gRPC, Pub/Sub, Read, Write…)
- **JSON Metadata Extraction tự động**: Mỗi khi diagram thay đổi (debounced 2s), canvas export `ArchitectureJSON = { nodes: [...], edges: [...] }` vào session state — đây là input duy nhất cho AI, không dùng screenshot
- **Giải thích thiết kế qua AI Chat**: Ứng viên giải thích trực tiếp với AI Interviewer qua chat panel — AI phản hồi real-time và đánh giá trade-off articulation từ lịch sử chat
- **Auto-save**: Diagram lưu vào server mỗi 30s — không mất khi reload
- **Canvas mở locked**: Ứng viên không thể vẽ ngay khi vào session — canvas chỉ unlock sau khi AI Interviewer xác nhận ứng viên đã xong Clarification phase

**Ràng buộc có chủ đích:** Ứng viên chỉ dùng node library — không có freehand tool. Đây là trade-off để đảm bảo JSON extraction chính xác 100%.

**Kỹ thuật — Vision AI không được dùng ở đây:** Bất kỳ code nào gọi Vision model để "đọc" diagram đều sai thiết kế. Toàn bộ evaluation đi qua JSON.

**Tham khảo thị trường:**
- **Eraser.io** (eraser.io) — drag-drop + diagram-as-code hybrid, AI co-pilot, export JSON; gần nhất với thiết kế này. Tham khảo component library và UX interaction pattern
- **Cloudcraft** (cloudcraft.co) — drag-drop cloud-native (AWS/Azure/GCP), live cloud scanning; component icons chất lượng cao, tham khảo visual design của node
- **Draw.io** (diagrams.net) — open-source, shape library rộng nhưng không SD-specific; có thể tham khảo XML/JSON export format
- Điểm khác biệt của epic này: canvas bị locked cho đến khi qua Clarification phase — không tool nào trên thị trường có cơ chế phase-gate này

---

### Epic 3: AI Interviewer — Real-time Conversational Engine

Epic tạo ra sự khác biệt giữa "làm bài trên form" và "phỏng vấn thật". AI hành xử như interviewer: đặt câu hỏi theo phase, không cho câu trả lời thẳng, inject curveball đúng lúc.

**Scope Practice Mode (hiện tại):** AI trả lời bằng text — không có TTS. Ứng viên đọc response trên chat panel. TTS sẽ được thêm vào Combat Mode ở phase sau.

**Phase-aware conversation — 4 phase tuần tự:**

**Phase 1 — Clarification (8–12 phút đầu):**
- AI mở đầu bằng đề bài (từ problem bank), không give thêm chi tiết
- AI hỏi lại nếu ứng viên chưa hỏi đủ: scope, scale (QPS/DAU), non-functional requirements (latency, consistency, availability)
- Canvas vẫn locked trong phase này
- Phase kết thúc khi AI xác nhận ứng viên đã đặt đủ câu hỏi chất lượng (hoặc sau `clarificationTimeLimit`)

**Phase 2 — High-level Architecture (12–15 phút):**
- AI unlock canvas, yêu cầu ứng viên vẽ kiến trúc tổng thể
- AI nhận `ArchitectureJSON` diff mỗi khi diagram update, theo dõi `componentCoverage` realtime
- AI không can thiệp trừ khi ứng viên im lặng > 60s → hỏi gợi ý theo kiểu Socratic (không đưa câu trả lời thẳng)

**Phase 3 — Deep Dive (15–20 phút):**
- AI chọn 1–2 component từ diagram để probe sâu: "Tại sao dùng Kafka thay vì Redis Pub/Sub ở đây?", "Cache invalidation strategy của bạn là gì?"
- Câu hỏi được sinh dựa trên component ứng viên đã vẽ — không hỏi về component không có trong diagram

**Phase 4 — Edge Cases / Curveball (còn lại):**
- AI hỏi về failure scenarios, scaling limits
- **Curveball injection** (nếu bật): Khi `componentCoverage >= 80%` AND `phase >= HIGH_LEVEL` → AI inject một scenario từ `problem.curveBallScenarios[]`: *"Nếu traffic Black Friday tăng đột ngột 50×, kiến trúc hiện tại nghẽn ở đâu?"*
- **Hard rule**: Không inject curveball nếu `componentCoverage < 60%` hoặc ứng viên đang bế tắc (không có node mới trong 5 phút)

**Hint mechanism:**
- Ứng viên có thể nhấn "Hint" để AI đặt câu hỏi gợi ý thêm
- Mỗi hint được log → giảm điểm trong Scoring Engine (tương tự hint penalty trong DSA round)
- AI không đưa câu trả lời trực tiếp dù ứng viên yêu cầu

**Kỹ thuật — Payload management:**
- Chỉ gửi JSON diff (node/edge được thêm/xóa) cho AI, không gửi toàn bộ diagram mỗi lần
- Throttle evaluation call tối đa mỗi 30s để tránh chi phí token bùng nổ
- Session transcript được summarize sau mỗi phase để giảm context window

**Tham khảo thị trường:**
- **Interviewing.io** — mock interview 1:1 với FAANG engineer thật; phase flow (clarification → design → deep dive) là nguồn chuẩn để calibrate AI behavior
- **Interview Warmup** (Google) — AI text-based Q&A luyện phỏng vấn; không có phase-aware flow, không tích hợp diagram
- **Pramp** — peer-to-peer mock interview có SD round; interviewer là người thật, không AI; curveball do người inject thủ công
- **Yoodli** — AI speech coach phân tích giọng nói khi trả lời; không có diagram integration
- Không có platform nào kết hợp cả phase-aware AI conversation lẫn live diagram context — đây là core differentiator

---

### Epic 4: Architecture Evaluation Engine

AI phân tích `ArchitectureJSON` + `transcriptHistory` cuối session để đưa ra đánh giá định lượng theo rubric — không phải verdict mơ hồ.

**Inputs:**
- `finalArchitectureJSON`: Snapshot diagram tại thời điểm kết thúc
- `transcriptHistory`: Toàn bộ chat + voice transcript (đã có timestamp)
- `problem.referenceArchitecture`: JSON từ problem bank
- `problem.scalingConstraints`: QPS, DAU, storage target
- `hintsUsed`: Số hint đã dùng
- `curveballAdaptation`: JSON diff trước/sau curveball inject (nếu có)

**Dimensions đánh giá — tổng 100 điểm:**

| # | Dimension | Max | Cách tính |
|---|-----------|-----|-----------|
| 1 | **Component Coverage** | 25 | `expectedComponents` có mặt trong diagram / tổng expected |
| 2 | **Scalability Fit** | 20 | AI đối chiếu topology với `scalingConstraints` — check over/under-engineering |
| 3 | **Trade-off Articulation** | 20 | AI đếm số lượng trade-off được giải thích rõ trong transcript |
| 4 | **Communication Clarity** | 15 | Fluency, cấu trúc câu, dùng đúng terminology |
| 5 | **Curveball Adaptation** | 20 | JSON diff sau curveball có phản ánh đúng hướng xử lý không |

> Nếu session không có Curveball: 20 điểm Curveball Adaptation được phân bổ lại vào 4 dimension còn lại theo tỉ lệ.

**Hint Penalty:** `hintsUsed × 5` điểm, tối đa trừ 15 điểm.

**Grade Bands:**

| Score | Label |
|-------|-------|
| 90–100 | Exceptional |
| 75–89 | Strong |
| 60–74 | Good |
| 45–59 | Developing |
| < 45 | Needs Work |

**Kỹ thuật — Streaming evaluation:**
- Evaluation được chạy từng dimension một, stream kết quả về FE theo thứ tự
- FE hiển thị skeleton loader với copy thực tế: "Đang phân tích Component Coverage…" → "Đang kiểm tra Scalability Fit…"
- Tổng latency mục tiêu: <= 15s cho toàn bộ 5 dimensions

**Tham khảo thị trường:**
- **Architecture Review Agent** (Microsoft, open-source) — phân tích data flow để flag anti-pattern (shared DB, missing gateway, redundancy); gần nhất với dimension Scalability Fit. Tham khảo rule set để bổ sung vào prompt evaluation
- **Exponent / Educative** — rubric chấm theo dimension (scoping, trade-off, communication) nhưng do human chấm, không automated; dùng làm benchmark để calibrate thang điểm
- Không có tool nào so sánh diagram ứng viên với reference architecture dạng JSON để tính Component Coverage tự động — phần này phải tự implement

---

### Epic 5: Scoring, Debrief & Reference Walkthrough

Ứng viên phải rời khỏi session với hiểu biết rõ ràng về điểm mạnh và điểm yếu — đây là lý do họ quay lại dùng platform.

**Nội dung:**
- **Score breakdown**: Hiển thị điểm từng dimension kèm Grade Band tổng, có progress bar visual theo từng dimension
- **Reference Architecture Walkthrough**: Render `problem.referenceArchitecture` thành diagram (cùng canvas component của Epic 2, read-only), hiển thị song song với diagram ứng viên đã vẽ. Highlight: component ứng viên có nhưng thiếu (đỏ), component ứng viên vẽ đúng (xanh)
- **Annotated Transcript**: Re-render `transcriptHistory` với comment AI inline — highlight điểm trade-off tốt (xanh), highlight câu trả lời thiếu chiều sâu (vàng), highlight câu không trả lời được (đỏ). Mỗi highlight có citation timestamp
- **Actionable Suggestion**: 2–3 câu cụ thể dựa trên dimension yếu nhất — không phải nhận xét chung chung
- **Combined scoring integration**: Nếu SD là 1 trong nhiều round trong phiên phỏng vấn, score được đưa vào bảng điểm tổng hợp (xem DSA round design — WHAT 0.2)

**Tham khảo thị trường:**
- **Pramp** — post-interview peer feedback dạng text tự do; không structured, không annotated transcript
- **Interview Warmup** (Google) — highlight từ khóa tốt/thiếu trong câu trả lời; gần với Annotated Transcript nhưng chỉ ở word-level, không ở argument-level
- **Yoodli** — debrief phân tích giọng nói (filler words, pace, clarity); tham khảo UX layout của debrief report
- Không platform nào có Reference Architecture Walkthrough dạng overlay diagram — đây là tính năng độc đáo nhất của epic này

---

## Dependency map

```
Epic 0 (Problem Bank)
    └─► Epic 1 (Personalization & Setup)
            ├─► Epic 2 (Whiteboard) ──────────────────────┐
            └─► Epic 3 (AI Interviewer) ◄── Epic 2 JSON ──┤
                        └─► Epic 4 (Evaluation Engine) ───┘
                                    └─► Epic 5 (Debrief)
```

Epic 2 và Epic 3 có thể triển khai song song sau khi Epic 0 + 1 done — Whiteboard là UI-only, AI Interviewer cần `ArchitectureJSON` contract từ Epic 2 nhưng không cần UI hoàn thiện.

---

## Quản trị Rủi ro Kỹ thuật & Product

| Epic | Rủi ro | Impact | Mitigation |
|------|--------|--------|-----------|
| 2 — Whiteboard | Ứng viên không quen dùng node library, bị friction | UX tệ, abandon session | Onboarding tooltip lần đầu; auto-suggest node khi ứng viên nhập text |
| 3 — AI Interviewer | AI không detect đúng phase transition, hỏi sai thứ tự | Mất tính xác thực | Hybrid: rule-based phase gate (elapsed time + keyword trigger) + AI confidence score |
| 3 — Curveball | Inject sai lúc, phá tâm lý ứng viên đang bế tắc | Trải nghiệm tiêu cực, complaint | Hard rule bất khả vi phạm: `componentCoverage < 60%` → block curveball dù config bật |
| 4 — Evaluation | AI hallucinate khi đánh giá trade-off từ transcript | Score sai, mất trust | Ground evaluation vào structured rubric + citation bắt buộc (Mandatory Quoting) |
| 4 — Evaluation | Latency > 15s khi evaluate JSON + transcript lớn | UX chờ đợi | Stream từng dimension; skeleton loader với copy thực tế thay vì spinner |
| 3 + 4 | Token cost bùng nổ nếu gửi full JSON mỗi diagram update | Chi phí vận hành | Chỉ gửi JSON diff; throttle evaluation call tối đa 1 lần/30s |
| 3 | STT accuracy thấp với tiếng Việt technical terms | Voice transcript sai → ảnh hưởng score | Fallback: text input song song với voice; STT có confidence threshold — câu dưới 70% confidence được flag để ứng viên confirm |

---

## Quyết định đã chốt

| Vấn đề | Quyết định |
|--------|-----------|
| SD round position | Sau Live Coding trong cùng phiên phỏng vấn |
| STT provider | Web Speech API — tái sử dụng `useVoiceInput` hook từ behavioral round, không có external service |
| Practice Mode AI output | Text only — không có TTS. TTS thuộc Combat Mode (phase sau) |
| Curveball default | Bật — ứng viên có thể tắt khi chọn round |
| Walkthrough tab | Đã bỏ — ứng viên giải thích thiết kế qua AI Chat duy nhất |
