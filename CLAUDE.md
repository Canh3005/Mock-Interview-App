# Final Project — AI Agent Guide

## Entrypoint Rule

Treat `CLAUDE.md` as the first document to read before running any agent flow in this repository.

When the user asks for a workflow such as `ba`, `sa`, `be`, `fe`, `review`, or `fix`, start here, then follow the matching guide and feature documents listed below.

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
| `sa <feature>` | SA Agent | `sa-guide.md` + `BA.md` + `convention-be.md` + `convention-fe.md` + codebase | `docs/features/<NNN>-<feature>/HOW.md` (architecture brief) |
| `be <feature>` | Dev BE | `dev-guide.md` + `HOW.md` (hoặc `BA.md` nếu SA skip) + `convention-be.md` | code + done report — KHÔNG commit |
| `fe <feature>` | Dev FE | `dev-guide.md` + `HOW.md` (hoặc `BA.md` nếu SA skip) + `convention-fe.md` + code BE hiện tại | code + done report — KHÔNG commit |
| `review be <feature>` | Reviewer BE | `BA.md` + `HOW.md` nếu có + Dev done report nếu có + `review-be.md` + `git diff` | `docs/features/<NNN>-<feature>/REVIEW-BE.md` |
| `review fe <feature>` | Reviewer FE | `BA.md` + `HOW.md` nếu có + Dev done report nếu có + `review-fe.md` + `git diff` | `docs/features/<NNN>-<feature>/REVIEW-FE.md` |
| `fix <mô tả>` | Quick Fix | file liên quan trực tiếp | code — KHÔNG commit |

Convention, dev guide, và review checklist: `docs/agent-guide/`

**Commit rule:** Commit SAU KHI review approved. Không commit sớm hơn.

**Feedback loop:** Nếu bạn chưa approve output của bước nào — agent đó sửa theo comment của bạn, không chuyển sang bước tiếp theo.

**Handoff rule:** Mỗi bước chỉ chuyển giao artifact thuộc trách nhiệm của mình.
- BA → mô tả nghiệp vụ: WHAT/WHY/SCOPE/Business Flow/Acceptance Criteria.
- SA → architecture brief: decisions/boundaries/contracts/quality guardrails khi cần.
- Dev → code + done report: implementation, acceptance mapping, verification.
- Reviewer → verdict: approve hoặc request changes dựa trên BA/HOW/diff.

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

**Thinking process và output format:** xem `sa-guide.md`. SA viết architecture brief: decisions, boundaries, contracts, quality guardrails. SA không viết implementation checklist thay Dev.

**Bước đầu tiên bắt buộc:** chạy SA Needed Check (mục 0 trong `sa-guide.md`).
- Nếu SA không cần → báo người dùng, redirect sang `be`/`fe`. KHÔNG viết HOW.md.
- Nếu SA cần → tiếp tục viết HOW.md bình thường.

**Done khi:** HOW.md tồn tại và bạn đã approve — **hoặc** SA đã xác nhận skip và redirect.

---

## Dev BE

**Đọc trước:**
- `docs/agent-guide/dev-guide.md`
- Nếu HOW.md tồn tại: đọc `HOW.md` như architecture constraints + `docs/agent-guide/convention-be.md`; Dev tự xác định file/function cụ thể theo codebase
- Nếu HOW.md không tồn tại (SA đã skip): đọc `BA.md` (WHAT, WHY, Epic Context, SCOPE, Business Flow, Acceptance Criteria, Risk nếu có) + `docs/agent-guide/convention-be.md`, sau đó tự scan module/service/controller/entity gần nhất trong codebase để xác định file cần sửa

Nếu thông tin còn thiếu sau khi đọc — hỏi bạn, không tự quyết.

**Done khi:** code đúng BA/HOW, done report có acceptance mapping, verification theo `dev-guide.md` đã chạy hoặc nêu rõ lý do không chạy được. KHÔNG commit.

---

## Dev FE

**Đọc trước:**
- `docs/agent-guide/dev-guide.md`
- Nếu HOW.md tồn tại: đọc `HOW.md` như architecture/API constraints + `docs/agent-guide/convention-fe.md` + code BE vừa viết; Dev tự xác định route/api/saga/component cụ thể theo codebase
- Nếu HOW.md không tồn tại (SA đã skip): đọc `BA.md` (WHAT, WHY, Epic Context, SCOPE, Business Flow, Acceptance Criteria, Risk nếu có) + `docs/agent-guide/convention-fe.md` + code BE vừa viết để biết API contract, sau đó tự scan route/api/saga/component gần nhất trong codebase để xác định file cần sửa

Nếu thông tin còn thiếu sau khi đọc — hỏi bạn, không tự quyết.

**Done khi:** UI/API integration đúng BA/HOW, done report có acceptance mapping, verification theo `dev-guide.md` đã chạy hoặc nêu rõ lý do không chạy được. KHÔNG commit.

---

## Reviewer

**Đọc trước:**
- `review be`: `BA.md` + `HOW.md` nếu có + Dev done report nếu có + `docs/agent-guide/review-be.md` + `git diff`
- `review fe`: `BA.md` + `HOW.md` nếu có + Dev done report nếu có + `docs/agent-guide/review-fe.md` + `git diff`

Review đối chiếu với spec — không chỉ check convention.

**Verdict APPROVE:** implement đúng spec, không có critical issue.
**Verdict REQUEST CHANGES:** có ít nhất 1 critical issue → Dev sửa → Reviewer review lại.
