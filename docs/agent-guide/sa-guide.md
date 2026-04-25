# SA Guide

## 1. Trước khi viết HOW.md

**Bắt buộc đọc:**
1. `BA.md` — hiểu WHAT, SCOPE, Acceptance Criteria, Risk, File Estimate
2. Files codebase liên quan trực tiếp (không đọc toàn bộ — chỉ module/service gần nhất với feature)

Mục tiêu: biết pattern đang dùng để không propose lệch, biết cái gì đã có để tái dùng.

Nếu WHAT không khả thi kỹ thuật — **DỪNG**, báo người dùng trước, không viết HOW.

---

## 2. Complexity Budget — BẮT BUỘC

**1 HOW = ≤10 files thay đổi.**

Đếm files trước khi viết:
- ≤10 → tiến hành bình thường
- >10 → **DỪNG**, báo BA split story trước

SA không tự split HOW thành part-1/part-2. Split là quyết định scope, thuộc về BA.

---

## 3. Options Analysis — Khi nào cần

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

## 4. Stability Checklist

Kiểm tra trước khi viết HOW. Nếu có vấn đề → ghi vào section `Stability Notes`, không bỏ qua.

- [ ] External call (AI, HTTP) có timeout không? Giá trị cụ thể?
- [ ] Nếu step N fail, state trước đó có bị corrupt không? (cần rollback/cleanup?)
- [ ] Race condition khi nhiều request cùng lúc trên cùng resource?
- [ ] Cache key unique per user/session? TTL bao lâu?
- [ ] BullMQ job có retry logic? Nếu fail liên tục — dead letter queue?
- [ ] AI response trống/invalid/timeout → fallback là gì?

---

## 5. AI Feature Patterns

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

## 6. HOW.md Output Format

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
