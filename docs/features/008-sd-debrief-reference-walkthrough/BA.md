# BA.md — SD Debrief & Reference Architecture Walkthrough (Epic 5)

## WHAT

Sau khi kết thúc phiên phỏng vấn System Design, ứng viên được chuyển đến **ScoringPage** — trang tổng hợp kết quả cho toàn bộ interview session — với tab **System Design** tự động active. Tab này gồm 4 phần: (1) **Score Breakdown** — điểm từng dimension kèm Grade Band tổng; (2) **Reference Architecture Walkthrough** — diagram tham chiếu chuẩn hiển thị song song với diagram ứng viên đã vẽ, có highlight màu xanh/đỏ theo component; (3) **Annotated Transcript** — toàn bộ cuộc trò chuyện được AI chú thích inline màu xanh/vàng/đỏ; (4) **Actionable Suggestions** — 2–3 câu cụ thể dựa trên dimension yếu nhất.

## WHY

Ứng viên sau phiên phỏng vấn cần biết **cụ thể** họ làm đúng gì, thiếu gì, và cần cải thiện ở đâu — không phải chỉ một con số tổng. Không có debrief có chiều sâu, ứng viên không có lý do để quay lại luyện tập. Epic 5 là điểm khép lại vòng feedback loop của toàn bộ SD practice flow, và là tính năng tạo retention cao nhất.

## Epic Context

Đây là Epic 5 — bước cuối trong chuỗi: Problem Bank → Setup → Whiteboard → AI Interviewer → Evaluation Engine → **Debrief**.

- Phụ thuộc Epic 4 (Evaluation Engine): `session.evaluationResult` phải tồn tại trước khi Debrief có thể render
- Phụ thuộc Epic 2 (Whiteboard): tái sử dụng `SDCanvas` component với `isViewOnly=true` để render cả hai diagram
- Phụ thuộc Epic 3 (AI Interviewer): `session.transcriptHistory` là input của Annotated Transcript
- Blocks: không có — ScoringPage đã là trang tổng hợp cho tất cả loại session; SD tab thêm vào cùng infrastructure

## SCOPE

**In:**
- Score Breakdown: điểm 5 dimensions (bar progress từng dimension), Grade Band tổng (A/B/C/D), hint penalty indicator
- Reference Architecture Walkthrough: render `problem.referenceArchitecture` thành diagram read-only (tái sử dụng `SDCanvas` + `isViewOnly`), hiển thị song song với diagram ứng viên; highlight node GREEN (ứng viên có) / RED (ứng viên thiếu) dựa trên type-based comparison; highlight edge GREEN (pattern hợp lệ) / YELLOW (pattern không có trong reference)
- Annotated Transcript: render lại `transcriptHistory`, AI chú thích inline từng đoạn: GREEN (trade-off tốt), YELLOW (thiếu chiều sâu), RED (không trả lời được); mỗi annotation có timestamp citation
- Actionable Suggestions: 2–3 câu cụ thể từ AI dựa trên dimension điểm thấp nhất
- Layout: 4 section dọc bên trong tab **System Design** của **ScoringPage** — cùng trang hiển thị kết quả behavioral/DSA/prompt, có thể scroll

**Out:**
- Voice playback / replay phiên phỏng vấn
- So sánh với lần làm trước (history comparison)
- Export PDF/share debrief
- Annotation do ứng viên chú thích thêm
- Combined scoring summary tổng hợp điểm tất cả rounds trên 1 dòng (phase sau)
- Tính lại score hoặc re-evaluate

**Depends on:** Epic 2 (SDCanvas + isViewOnly), Epic 3 (transcriptHistory), Epic 4 (evaluationResult)

**Blocks:** Combined scoring summary (hiển thị điểm tổng hợp nhiều round — phase sau)

## Business Flow

### Happy Path

1. Ứng viên nhấn **End Session** hoặc phase tự động chuyển sang COMPLETED → hệ thống enqueue evaluation job.
2. Ứng viên được chuyển sang **ScoringPage** (tab **System Design** tự động active) — skeleton loader cho từng section hiển thị theo thứ tự dimension được hoàn thành (stream từ evaluation engine).
3. Section **Score Breakdown** render trước khi tất cả AI dimensions xong: component coverage (rule-based) hiện trước, 4 AI dimensions lần lượt fill vào khi job stream kết quả về.
4. Khi evaluation hoàn tất, **Reference Architecture Walkthrough** render — 2 canvas song song: trái là diagram ứng viên (read-only, không highlight đặc biệt), phải là reference diagram (read-only). Trên reference diagram: node GREEN nếu ứng viên có đúng type đó, RED nếu thiếu. Edge trên diagram ứng viên: GREEN nếu type-pair khớp reference, YELLOW nếu không khớp.
5. **Annotated Transcript** render bên dưới — AI call riêng sau khi evaluation done, annotate transcript thành các đoạn màu với icon và tooltip giải thích.
6. **Actionable Suggestions** render cuối — 2–3 câu cụ thể, AI generate dựa trên dimension thấp điểm nhất.
7. Ứng viên có thể cuộn xem toàn bộ, click vào annotation để đọc chi tiết, hover node để xem label.

### Edge Cases & Business Rules

**Evaluation chưa xong / job thất bại:**
- Nếu `evaluationResult` null và job không tồn tại → hiển thị lỗi "Không thể tải kết quả, vui lòng thử lại" với nút Retry enqueue lại job.
- Nếu job đang processing → polling 2s, skeleton loader chờ đến khi done.

**referenceArchitecture null / thiếu:**
- Section Reference Walkthrough ẩn hoàn toàn (không placeholder), không ảnh hưởng các section khác.

**Diagram ứng viên rỗng (không vẽ gì):**
- Score Component Coverage = 0, tất cả nodes trong reference đều RED.
- Không crash canvas, render reference-only với toàn bộ node đỏ.

**Annotation AI timeout / lỗi:**
- Annotated Transcript hiển thị transcript thuần túy (không màu), không có annotation — không block render các section khác.
- Actionable Suggestions tương tự: hiển thị fallback text "Không thể tạo gợi ý lúc này."

**Session chưa COMPLETED:**
- `SDScoringTab` guard: nếu `session.phase !== 'COMPLETED'` → redirect về sd-room; ScoringPage không hiện tab systemDesign nếu `allSessions.systemDesign === null`.

**Node type không map được (unexpected type trong candidate diagram):**
- Node đó không tham gia vào comparison, không tính matched, không tính missing.

## Acceptance Criteria

- Given ứng viên vừa kết thúc phiên SD (phase = COMPLETED) và evaluation đã xong, When ứng viên vào trang Debrief, Then Score Breakdown hiển thị điểm từng dimension (có progress bar) và Grade Band tổng trong vòng 2s sau khi trang load.

- Given evaluation đã có `evaluationResult` và `problem.referenceArchitecture` tồn tại, When Debrief render xong, Then Reference Architecture Walkthrough hiển thị 2 diagram song song — diagram ứng viên bên trái (read-only) và reference bên phải; mỗi node trong reference có màu GREEN nếu ứng viên đã vẽ đúng type đó, RED nếu thiếu.

- Given ứng viên vẽ đủ các component type của reference nhưng có 1 edge nối trực tiếp `client → database` (không qua load balancer hay web server), When Debrief render, Then edge đó trên diagram ứng viên được highlight YELLOW (pattern không có trong reference).

- Given evaluation xong với dimension Scalability Fit có điểm thấp nhất, When Actionable Suggestions render, Then hiển thị 2–3 câu cụ thể về scalability (không phải nhận xét chung về toàn bộ bài làm).

- Given evaluation job thất bại (trạng thái "failed"), When ứng viên vào Debrief, Then hiển thị thông báo lỗi rõ ràng và nút Retry để enqueue lại — không crash trang.

- Given `problem.referenceArchitecture` là null, When Debrief render, Then section Reference Walkthrough ẩn hoàn toàn, các section còn lại (Score, Transcript, Suggestions) vẫn hiển thị bình thường.

## Risk

**Annotated Transcript — AI output không deterministic, ảnh hưởng trực tiếp đến cảm nhận của ứng viên về bài làm**
- Impact: AI gán nhãn RED sai cho câu trả lời đúng → ứng viên mất tin tưởng vào platform
- Mitigation: Annotation AI phải cite đúng timestamp từ transcript; fallback về transcript thuần túy nếu confidence thấp hoặc format parse lỗi

**Reference Walkthrough render 2 canvas song song — performance trên màn hình nhỏ / diagram lớn**
- Impact: lag, node chồng lên nhau do auto-layout không đủ space → UX tệ
- Mitigation: auto-layout với dagre (spacing đủ), canvas có fixed height + scroll riêng cho mỗi panel; render reference diagram lazy (chỉ khi section visible)
