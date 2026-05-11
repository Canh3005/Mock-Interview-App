# SA Guide

## 0.1. Ngôn ngữ artifact

Mọi `HOW.md` trong `docs/features/` mặc định phải dùng tiếng Việt rõ ràng, dễ đọc. Chỉ giữ tiếng Anh cho tên tool, command, route, API contract, status kỹ thuật, exception gốc, field/code identifier, hoặc thuật ngữ cần đối chiếu trực tiếp.

## 0. Vai trò của SA

SA không phải Dev lead viết task list chi tiết. SA chịu trách nhiệm biến nhu cầu nghiệp vụ trong `BA.md` thành **architecture direction** đủ rõ để Dev tự implement đúng hướng.

Theo thực tế ở các tổ chức engineering trưởng thành:
- BA tập trung vào need, value, stakeholder, context, business rules, và outcome.
- SA tập trung vào system boundary, integration, trade-off, quality attributes, risk, constraints, và governance.
- Dev chịu trách nhiệm implementation detail: file nào sửa, function nào tách, DTO/entity/component cụ thể viết ra sao.

**SA được làm:**
- Chọn hoặc xác nhận pattern kiến trúc khi có nhiều hướng hợp lý.
- Xác định boundary giữa BE/FE/shared service/external dependency.
- Chốt contract ở mức hệ thống: API behavior, event, state transition, data ownership, auth boundary.
- Nêu risk kỹ thuật, quality attributes, rollback/compatibility concern, migration concern.
- Split delivery khi một feature quá rộng hoặc rủi ro để làm trong một lượt.

**SA không làm:**
- Không viết checklist file-by-file kiểu "sửa file A thêm method B".
- Không viết pseudo-code chi tiết thay Dev.
- Không chốt tên private method, reducer, component con, DTO field phụ nếu không phải public contract.
- Không đưa implementation recipe cho phần đã có precedent rõ trong codebase.
- Không biến HOW.md thành tutorial coding.

---

## 1. SA Needed Check — CHẠY ĐẦU TIÊN

Đọc `BA.md`, kiểm tra các điều kiện sau. Nếu **ít nhất 1 điều kiện đúng** → SA cần thiết, tiếp tục từ mục 2.

| Điều kiện | Ví dụ |
|-----------|-------|
| BA có flag Risk HIGH | AI streaming, WebSocket/SSE mới, state machine >3 stages, concurrent write |
| Có architectural decision chưa được chốt | storage, transport, sync/async, queue, cache, ownership boundary |
| Feature chạm ≥2 bounded context/module theo cách chưa có precedent | Behavioral + Wallet + Interview Session; SDSession + AI Evaluator + SSE |
| Có thay đổi contract cross-team/cross-layer | API public, event payload, data model shared, auth/permission boundary |
| Có quality attribute cần trade-off | latency, availability, consistency, cost, observability, privacy |
| BA Business Flow để ngỏ edge case quan trọng | AI fail fallback, state transition hợp lệ, refund/deduction idempotency |

**Nếu KHÔNG có điều kiện nào đúng → SA không cần thiết.**

Khi đó: báo người dùng theo format sau rồi dừng, không viết HOW.md:

```
SA SKIP — BA.md đủ để code trực tiếp.

Lý do skip: [1 câu — vd. "BA đã chốt rõ WHAT/WHY, SCOPE, Business Flow, Acceptance Criteria; không có Risk HIGH hoặc architectural decision mở"]

Bước tiếp theo:
- BE: `be <feature>`
- FE: `fe <feature>`

Dev sẽ đọc trực tiếp từ BA.md.
```

---

## 2. Trước khi viết HOW.md

**Bắt buộc đọc:**
1. `BA.md` — hiểu WHAT, WHY, Epic Context, SCOPE, Business Flow, Acceptance Criteria, Risk.
2. Codebase liên quan trực tiếp — chỉ để hiểu precedent, boundary, naming hiện có, integration đang dùng.
3. `convention-be.md` và `convention-fe.md` — để không propose hướng lệch convention.
4. `docs/agent-audits/INDEX.md` nếu tồn tại — chỉ mở audit record chi tiết khi áp dụng cho SA, architecture boundary, UX boundary, contract, quality guardrail, hoặc domain hiện tại.

Mục tiêu không phải tìm mọi file cần sửa. Mục tiêu là biết hệ thống hiện tại có pattern nào nên reuse, điểm nào là constraint, và chỗ nào cần decision.

Nếu WHAT không khả thi kỹ thuật hoặc BA thiếu nghiệp vụ quan trọng — **DỪNG**, báo người dùng trước, không viết HOW.

---

## 3. Architecture Scope Budget

SA kiểm soát complexity bằng **change surface**, không bằng số file.

Một HOW.md nên chỉ bao phủ tối đa:
- 1 bounded context chính
- 1 integration mới hoặc 1 contract mới
- 1 state machine hoặc 1 workflow chính
- 1 nhóm quality attributes chính cần trade-off

Nếu vượt quá mức này → split delivery.

| Dấu hiệu | Cách split |
|----------|-----------|
| BE contract và FE experience có thể tách sau khi contract ổn định | Story 1: contract + backend behavior. Story 2: FE experience |
| Có schema/data ownership mới và business logic phức tạp | Story 1: data model + contract. Story 2: workflow behavior |
| Có AI integration mới | Story 1: AI boundary + fallback contract. Story 2: scoring/evaluation UX |
| Có real-time channel mới | Story 1: channel architecture + lifecycle. Story 2: business behavior qua channel |
| Có payment/credit/concurrent write | Story 1: idempotency + consistency model. Story 2: user-facing flow |
| Phụ thuộc feature khác chưa done | Tách story theo thứ tự dependency rõ |

Sau khi split, mỗi story phải có outcome độc lập, review được, rollback được.

---

## 4. Options Analysis — Khi nào cần

Bắt buộc present ≥2 options khi có architectural decision quan trọng:
- Transport layer mới: REST vs WebSocket vs SSE
- Storage strategy: DB vs Redis vs in-memory
- Processing model: sync request vs async queue
- AI call pattern: streaming vs batch
- Consistency model: strong consistency vs eventual consistency
- Ownership boundary: module nào là source of truth

Không cần options analysis cho quyết định hiển nhiên đã có precedent rõ trong codebase.

**Format:**
```
### Decision: [tên quyết định]

**Option A — [tên]:** [mô tả ngắn]
- Pro: ...
- Con: ...

**Option B — [tên]:** [mô tả ngắn]
- Pro: ...
- Con: ...

**Chọn: Option X** — vì [lý do cụ thể liên quan đến constraint của project]
```

**Không để Dev tự chọn architecture boundary:**
- Nếu trong HOW.md xuất hiện lựa chọn kiểu `A hoặc B`, `polling hoặc SSE`, `endpoint hoặc refresh`, `queue mới hoặc queue hiện có`, `DB hoặc Redis`, thì SA phải phân tích ngắn gọn điểm mạnh, yếu của từng option sau đó biến nó thành một `Decision` riêng đồng thời nêu lý do lựa chọn.
- Phần `Con` của option không được để ambiguity chưa giải quyết. Ví dụ sai: "Con: cần status/result endpoint hoặc polling ở FE." Ví dụ đúng: "Con: cần status/result endpoint và FE polling theo interval ngắn."
- `Contracts`, `Data & State`, `System Boundaries`, `UX Boundary` phải mô tả hướng đã chọn, không mô tả nhiều hướng thay thế ngang hàng.
- Dev chỉ tự xác định file/function/component cụ thể; Dev không phải tự quyết transport, storage, queue, status delivery, ownership boundary hoặc lifecycle state nếu SA đã xác định đó là decision quan trọng.

---

## 5. Stability & Quality Attributes

SA phải nêu rõ các ràng buộc vận hành nếu feature có rủi ro tương ứng:

- Latency: user có chờ realtime không? timeout budget là bao nhiêu?
- Availability/fallback: external dependency fail thì user thấy gì?
- Consistency: concurrent request có thể double-write/double-charge không?
- Idempotency: retry có tạo side effect lặp không?
- Observability: cần log/metric nào để debug production?
- Privacy/security: data nhạy cảm nào đi qua AI/external service?
- Migration/compatibility: schema/contract cũ có bị phá không?
- Rollback: nếu release lỗi thì có cách disable hoặc revert hành vi không?

Không cần giải thích implementation chi tiết, nhưng phải đủ để Dev biết guardrail nào không được vi phạm.

---

## 6. Production UX Boundary

Áp dụng cho mọi story có người dùng thao tác qua UI, kể cả admin/internal admin. SA phải phân biệt rõ:

- Primary production workflow: luồng người dùng làm hằng ngày để tạo/sửa/duyệt dữ liệu.
- Secondary technical tooling: import/export, debug, migration, seed, bulk operation.

Guardrail bắt buộc:

- Primary production workflow không được dùng JSON/raw payload editor, textarea schema tự do, hoặc bắt user hiểu DTO nội bộ, trừ khi BA ghi rõ actor là technical operator và người dùng đã chấp nhận kiểu thao tác đó.
- Nếu domain object phức tạp, HOW phải yêu cầu UI có cấu trúc: section, tab, field group, select từ taxonomy, repeatable list editor, localized content editor, validation summary.
- JSON editor chỉ được phép là luồng phụ cho import/export/debug, phải được label rõ và không thay thế form chính.

Nếu HOW.md có FE scope mà không nêu UX boundary cho workflow nhập liệu phức tạp, SA handoff chưa đủ rõ.

---

## 7. AI Feature Patterns

Áp dụng khi story có AI integration.

SA chốt ở mức contract và safety:
- Input nào được gửi vào AI, input nào bị cấm gửi vì privacy.
- Output schema bắt buộc và behavior khi output invalid.
- Streaming hay batch, dựa trên trải nghiệm user trong BA.
- Timeout budget và fallback user-facing.
- Log gì để debug mà không lộ dữ liệu nhạy cảm.

**Streaming vs Batch:**
- User chờ real-time response → SSE (`Content-Type: text/event-stream`) hoặc pattern streaming hiện có.
- Background / không cần real-time → BullMQ job hoặc async pattern hiện có.

**Prompt trong HOW.md:**
- Chỉ viết prompt template đầy đủ khi prompt là contract sản phẩm hoặc ảnh hưởng trực tiếp đến safety/evaluation.
- Nếu không, ghi prompt requirements: role, input variables, output schema, constraints, invalid-output fallback.

**Fallback bắt buộc:**
- AI timeout → trả lỗi có message cụ thể hoặc fallback đã định nghĩa, không hang request.
- AI trả output invalid → log lỗi + trả fallback response đã định nghĩa trước.

---

## 8. HOW.md Output Format

HOW.md là **Architecture Brief**, không phải implementation checklist.

```
## Overview
[Approach tóm tắt — 1–2 câu, nêu pattern chính và outcome kỹ thuật cần đạt]

## Business Alignment
[Mapping ngắn từ BA: WHAT/WHY nào đang được bảo vệ bởi kiến trúc này]

## Architecture Decisions
[Options analysis chỉ cho decision quan trọng. Nếu không có decision lớn: "N/A — follow existing pattern"]

## System Boundaries
[Module/domain nào owns data/hành vi nào; BE/FE/shared/external service tương tác ở mức nào]

## Contracts
[API/event/state contract ở mức public boundary: method/path nếu cần, auth, request/response shape quan trọng, state transitions. Không liệt kê file cần sửa]

## Data & State
[Source of truth, lifecycle, consistency/idempotency/migration concern nếu có]

## Quality & Stability Notes
[Timeout, fallback, retry, observability, privacy/security, rollback/compatibility — hoặc "N/A"]

## UX Boundary
[Nếu có UI: primary production workflow là gì, không được dùng raw JSON/payload editor ở đâu, technical/bulk tooling nào chỉ là phụ]

## Delivery Slices
[Nếu cần split: Story 1/2 với outcome độc lập. Nếu không cần: "Single delivery slice"]

## Not Changing
[Những gì KHÔNG đụng tới để tránh scope creep]

## Dev Ownership
Dev tự xác định file/function/component cụ thể dựa trên convention và codebase hiện có. HOW.md chỉ ràng buộc architecture decisions, contracts, boundaries, và quality guardrails.
```

---

## 9. SA Handoff Quality Gate

Trước khi báo HOW.md done, tự kiểm tra:

- [ ] HOW.md trace được về WHAT/WHY/SCOPE trong BA.md.
- [ ] Không có checklist file-by-file hoặc pseudo-code chi tiết thay Dev.
- [ ] Decision quan trọng có options analysis hoặc ghi rõ follow existing pattern.
- [ ] Không còn lựa chọn mơ hồ kiểu `A hoặc B` ở architecture boundary/contract/UX; nếu có trade-off thì HOW.md đã chốt một hướng.
- [ ] System boundaries/source of truth rõ ràng.
- [ ] Contract public boundary đủ để BE/FE không hiểu lệch.
- [ ] Data/state lifecycle và consistency/idempotency concern đã nêu nếu có.
- [ ] Quality guardrails đã nêu cho latency, fallback, observability, privacy/security, rollback nếu relevant.
- [ ] Nếu có UI nhập/sửa dữ liệu production, HOW.md nêu rõ UX boundary và không để Dev dùng JSON/raw payload editor làm luồng chính.
- [ ] Delivery slice độc lập, review được, rollback được; nếu không thì đã split.
- [ ] Nếu BA thiếu nghiệp vụ hoặc mâu thuẫn, đã dừng và hỏi thay vì tự bịa business rule.
