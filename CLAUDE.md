# Final Project — AI Agent Guide

## Project Structure

| Folder | Role | Tech |
|--------|------|------|
| `server/` | Backend | NestJS, TypeORM, Redis, BullMQ |
| `client/apps/web/` | Frontend web | React, Redux-Saga (RTK), i18n (en/vi/ja) |
| `client/packages/shared-logic/` | Shared logic | - |
| `code-runner/` | Code execution sandbox | Express |
| `docs/features/` | Feature specs per workflow | - |
| `docs/agent-guide/` | Convention + review checklists | - |

---

## Agent Triggers

| Lệnh | Vai trò | Đọc trước | Output |
|------|---------|-----------|--------|
| `ba <feature>` | BA Agent | `ba-guide.md` + `docs/features/` | `docs/features/<NNN>-<feature>/BA.md` |
| `sa <feature>` | SA Agent | `sa-guide.md` + `BA.md` + `convention-be.md` + `convention-fe.md` + codebase | `docs/features/<NNN>-<feature>/HOW.md` |
| `be <feature>` | Dev BE | `HOW.md` (hoặc `BA.md` nếu SA skip) + `convention-be.md` | code — KHÔNG commit |
| `fe <feature>` | Dev FE | `HOW.md` (hoặc `BA.md` nếu SA skip) + `convention-fe.md` + code BE hiện tại | code — KHÔNG commit |
| `review be <feature>` | Reviewer BE | `BA.md` + `HOW.md` + `review-be.md` + `git diff` | `docs/features/<NNN>-<feature>/REVIEW-BE.md` |
| `review fe <feature>` | Reviewer FE | `BA.md` + `HOW.md` + `review-fe.md` + `git diff` | `docs/features/<NNN>-<feature>/REVIEW-FE.md` |
| `fix <mô tả>` | Quick Fix | file liên quan trực tiếp | code — KHÔNG commit |

Convention và review checklist: `docs/agent-guide/`

**Commit rule:** Commit SAU KHI review approved. Không commit sớm hơn.

**Feedback loop:** Nếu bạn chưa approve output của bước nào — agent đó sửa theo comment của bạn, không chuyển sang bước tiếp theo.

---

## Fast Path — `fix <mô tả>`

Dùng khi: sửa bug, đổi text, thay đổi nhỏ trong 1-2 file, không cần API mới hoặc state mới.

Không cần BA.md / HOW.md. Implement trực tiếp, sau đó báo bạn để bạn quyết định review hay commit luôn.

Nếu mid-task phát hiện thay đổi lớn hơn dự kiến — DỪNG, báo bạn, chuyển sang full flow.

---

## BA Agent

**Đọc trước:** `docs/agent-guide/ba-guide.md` + scan `docs/features/`.

**Thinking process và output format:** xem `ba-guide.md`.

**Done khi:** `BA.md` tồn tại và bạn đã approve.

---

## SA Agent

**Đọc trước:** `docs/agent-guide/sa-guide.md` + `BA.md` + files codebase liên quan trực tiếp.

**Thinking process và output format:** xem `sa-guide.md`.

**Bước đầu tiên bắt buộc:** chạy SA Needed Check (mục 0 trong `sa-guide.md`).
- Nếu SA không cần → báo người dùng, redirect sang `be`/`fe`. KHÔNG viết HOW.md.
- Nếu SA cần → tiếp tục viết HOW.md bình thường.

**Done khi:** HOW.md tồn tại và bạn đã approve — **hoặc** SA đã xác nhận skip và redirect.

---

## Dev BE

**Đọc trước:**
- Nếu HOW.md tồn tại: đọc `HOW.md` + `docs/agent-guide/convention-be.md`
- Nếu HOW.md không tồn tại (SA đã skip): đọc `BA.md` (SCOPE + File Estimate + Acceptance Criteria) + `docs/agent-guide/convention-be.md` + các file codebase được nhắc trong BA File Estimate

Nếu thông tin còn thiếu sau khi đọc — hỏi bạn, không tự quyết.

**Done khi:** Lint pass (`npm run lint`). KHÔNG commit.

---

## Dev FE

**Đọc trước:**
- Nếu HOW.md tồn tại: đọc `HOW.md` + `docs/agent-guide/convention-fe.md` + code BE vừa viết
- Nếu HOW.md không tồn tại (SA đã skip): đọc `BA.md` (SCOPE + File Estimate + User Flow) + `docs/agent-guide/convention-fe.md` + code BE vừa viết để biết API contract

Nếu thông tin còn thiếu sau khi đọc — hỏi bạn, không tự quyết.

**Done khi:** UI chạy được trên browser, lint pass. KHÔNG commit.

---

## Reviewer

**Đọc trước:**
- `review be`: `BA.md` + `HOW.md` + `docs/agent-guide/review-be.md` + `git diff`
- `review fe`: `BA.md` + `HOW.md` + `docs/agent-guide/review-fe.md` + `git diff`

Review đối chiếu với spec — không chỉ check convention.

**Verdict APPROVE:** implement đúng spec, không có critical issue.
**Verdict REQUEST CHANGES:** có ít nhất 1 critical issue → Dev sửa → Reviewer review lại.
