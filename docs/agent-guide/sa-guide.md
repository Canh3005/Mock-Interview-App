# SA Guide

## 0. SA Needed Check — CHẠY ĐẦU TIÊN

Đọc `BA.md`, kiểm tra các điều kiện sau. Nếu **ít nhất 1 điều kiện đúng** → SA cần thiết, tiếp tục từ mục 1.

| Điều kiện | Ví dụ |
|-----------|-------|
| BA có flag Risk HIGH | AI streaming, WebSocket/SSE mới, state machine >3 stages, concurrent write |
| BA để ngỏ architectural decision | "lưu ở đâu?", "dùng transport nào?", "sync hay async?" chưa được chốt |
| Feature cần ≥2 module mới tương tác với nhau theo cách chưa có precedent trong codebase | SDSession + AI Evaluator + WebSocket channel cùng lúc |
| BA Business Flow để ngỏ cách xử lý edge case quan trọng | Không rõ fallback khi AI fail, không rõ state nào được phép transition sang state nào |

**Nếu KHÔNG có điều kiện nào đúng → SA không cần thiết.**

Khi đó: báo người dùng theo format sau rồi dừng, không viết HOW.md:

```
SA SKIP — BA.md đủ để code trực tiếp.

Lý do skip: [1 câu — vd. "BA có File Estimate đầy đủ, không có Risk HIGH, không có architectural decision mở"]

Bước tiếp theo:
- BE: `be <feature>`
- FE: `fe <feature>`

Dev sẽ đọc trực tiếp từ BA.md.
```

---

## 1. Trước khi viết HOW.md

**Bắt buộc đọc:**
1. `BA.md` — hiểu WHAT, SCOPE, Business Flow, Acceptance Criteria, Risk
2. Files codebase liên quan trực tiếp (không đọc toàn bộ — chỉ module/service gần nhất với feature)

Mục tiêu: biết pattern đang dùng để không propose lệch, biết cái gì đã có để tái dùng.

Nếu WHAT không khả thi kỹ thuật — **DỪNG**, báo người dùng trước, không viết HOW.

---

## 2. Complexity Budget — BẮT BUỘC

**1 HOW = ≤10 files thay đổi.**

SA ước tính file count trước khi viết HOW:
- ≤10 → tiến hành bình thường
- >10 → SA tự split (xem mục 3), không cần hỏi BA

---

## 3. Story Splitting — Khi nào và cách tách

SA là người quyết định có cần split hay không, dựa trên file count và complexity — không phải BA.

Nếu file count >10 sau khi SA phân tích: **DỪNG**, tự split thành Story 1 / Story 2 trong HOW.md, báo người dùng trước khi code.

| Dấu hiệu | Cách split |
|----------|-----------|
| BE và FE có thể làm song song sau khi có API contract | Story 1: entity + API. Story 2: FE + saga |
| Cần DB schema mới VÀ business logic phức tạp | Story 1: schema + API skeleton. Story 2: business logic + FE |
| Có AI integration mới | Story 1: AI service + basic call. Story 2: evaluation logic + FE display |
| Có real-time channel mới (SSE/WebSocket) | Story 1: infra + echo endpoint. Story 2: business feature dùng channel |
| Feature phụ thuộc vào feature khác chưa done | Tách thành 2 story độc lập có thứ tự rõ |

Sau khi split, mỗi story vẫn phải ≤10 files. Nếu vẫn >10 → split tiếp.

---

## 4. Options Analysis — Khi nào cần

Bắt buộc present ≥2 options khi có architectural decision quan trọng:
- Transport layer mới (REST vs WebSocket vs SSE)
- Storage strategy (DB vs Redis vs in-memory)
- Processing model (sync vs async queue)
- AI call pattern (streaming vs batch)

Không cần options analysis cho quyết định hiển nhiên (thêm DTO field, CRUD endpoint mới).

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

---

## 5. Stability Checklist

Kiểm tra trước khi viết HOW. Nếu có vấn đề → ghi vào section `Stability Notes`, không bỏ qua.

- [ ] External call (AI, HTTP) có timeout không? Giá trị cụ thể?
- [ ] Nếu step N fail, state trước đó có bị corrupt không? (cần rollback/cleanup?)
- [ ] Race condition khi nhiều request cùng lúc trên cùng resource?
- [ ] Cache key unique per user/session? TTL bao lâu?
- [ ] BullMQ job có retry logic? Nếu fail liên tục — dead letter queue?
- [ ] AI response trống/invalid/timeout → fallback là gì?

---

## 6. AI Feature Patterns

Áp dụng khi story có AI integration.

**Streaming vs Batch:**
- User chờ real-time response → SSE (`Content-Type: text/event-stream`)
- Background / không cần real-time → BullMQ job

**Prompt phải có trong HOW — dạng template đầy đủ, không pseudo-code:**
```typescript
const prompt = `You are evaluating a system design interview answer.

Question: ${question}
Candidate answer: ${answer}

Evaluate on three dimensions:
- correctness (1–10): technical accuracy
- depth (1–10): level of detail and nuance
- communication (1–10): clarity and structure

Return JSON only:
{ "correctness": number, "depth": number, "communication": number, "feedback": string }`;
```

**Fallback bắt buộc:**
- AI timeout (>30s) → trả lỗi có message cụ thể, không hang request
- AI trả về không phải JSON hợp lệ → log error + trả fallback response đã định nghĩa trước

---

## 7. HOW.md Output Format

```
## Overview
[Approach tóm tắt — 1–2 câu, nêu rõ pattern chính được dùng]

## Architectural Decisions
[Options analysis theo format ở mục 3 — bỏ qua nếu không có decision quan trọng]

## Backend Changes (server/)
[Mỗi file: tên đường dẫn + thay đổi cụ thể — đủ để Dev không cần hỏi thêm]

## Frontend Changes (client/apps/web/)
[Mỗi file: tên đường dẫn + thay đổi cụ thể]

## API Contract
[Endpoint mới: method, path, auth required, request body, response shape]

## Stability Notes
[Timeout values, error handling, cache TTL, retry logic — hoặc "N/A"]

## Not Changing
[Những gì KHÔNG đụng tới]

## File Count
Tổng files thay đổi: X / 10
```
