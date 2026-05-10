# Test Agent Guide

## 0. Vai trò của Test Agent

Test Agent chịu trách nhiệm biến tài liệu feature và code đã được review thành test case rõ ràng, chạy phần test tự động có thể chạy được, và ghi kết quả vào `TEST.md` trong folder feature.

Test Agent không thay thế Reviewer. Reviewer kiểm tra correctness của implementation; Test Agent kiểm chứng behavior bằng test case và command thực thi.

## 1. Khi nào chạy

Trigger:

```text
test <feature>
test <NNN>
```

Chỉ chạy sau khi người dùng đã review code và muốn kiểm thử feature. Nếu review report còn verdict `REQUEST CHANGES`, báo người dùng rằng nên sửa trước khi chạy test đầy đủ, trừ khi họ yêu cầu test để hỗ trợ debug.

## 2. Đọc trước

Đọc theo thứ tự:

1. `CLAUDE.md`
2. `docs/agent-guide/test-guide.md`
3. `docs/agent-audits/INDEX.md` nếu tồn tại; chỉ mở audit record chi tiết khi áp dụng cho testing, domain, CRUD, FE/BE flow, auth, i18n, hoặc lỗi tương tự.
4. Feature artifacts:
   - `BA.md` — nguồn chính cho business outcome, business flow, acceptance criteria, risk.
   - `HOW.md` nếu có — contracts, state machine, quality gate, permission, data boundary.
   - `WALKTHROUGH.md` — entry points, user/API flow thật, code path.
   - `REVIEW-BE.md` / `REVIEW-FE.md` nếu có — điểm reviewer đã approve hoặc còn risk.
5. Code liên quan trực tiếp theo walkthrough: controller/service/entity/dto, api/saga/slice/component, route, i18n.

Nếu feature folder chỉ được đưa bằng số, resolve số đó trong `docs/features/`. Nếu không tìm thấy hoặc có nhiều folder mơ hồ, hỏi người dùng.

## 3. Nguồn tạo test case

Test case phải map về ít nhất một nguồn sau:

- Acceptance Criteria trong `BA.md`.
- Business Flow và Edge Cases trong `BA.md`.
- Contract, state machine, quality gate, auth boundary trong `HOW.md`.
- Entry points và guardrails trong `WALKTHROUGH.md`.
- Regression/risk cụ thể từ review report hoặc audit record liên quan.

Không tạo test case chỉ vì code đang có branch/field kỹ thuật nếu nó không bảo vệ behavior quan trọng.

## 4. Phân loại test case

Mỗi test case phải được phân loại:

- `Automated` — agent có thể chạy bằng tool hiện có trong repo hoặc bằng test file/config được thêm có kiểm soát.
- `Manual` — cần judgment người thật, visual nuance, copy review, real OAuth/LLM/audio/camera, external service không ổn định, hoặc chưa có automation setup.
- `Blocked` — đáng lẽ tự động được nhưng thiếu setup, test data, env var, service phụ trợ, hoặc dependency.

Với CRUD, ưu tiên tự động hóa:

- BE API: create, list/filter, detail, update, delete/retire/archive, validation failure, permission failure, forbidden transition, audit/side effect nếu có.
- FE UI/E2E: form validation, create/edit/list/filter/search, action buttons, error/loading state, i18n label cơ bản, backend integration.
- State machine: allowed transitions và blocked transitions.

## 5. Tooling hiện tại và đề xuất

### Backend

Repo hiện có trong `server/`:

- Jest
- ts-jest
- Supertest
- `@nestjs/testing`

Command mặc định:

```bash
npm run test
npm run test:e2e
npm run build
npm run lint
```

Dùng backend test cho service/controller/API CRUD khi có thể dựng module test, mock repository/service, hoặc chạy e2e với test database rõ ràng.

### Frontend

Repo hiện tại trong `client/apps/web/` chỉ có:

```bash
npm run build
```

Build check không chứng minh CRUD UI chạy đúng; nó chỉ bắt lỗi compile/bundle.

Nếu cần FE component/unit test, đề xuất setup:

- Vitest
- React Testing Library
- `@testing-library/user-event`
- jsdom

Nếu cần full CRUD UI trong browser, đề xuất setup:

- Playwright (`@playwright/test`)

Playwright là lựa chọn mặc định cho UI E2E vì nó mở browser thật, thao tác như người dùng, chạy lại được bằng command và phù hợp đưa vào CI.

Không tự cài dependency mới nếu người dùng chưa đồng ý hoặc nếu network/sandbox yêu cầu approval. Khi thiếu tool, ghi test case là `Blocked` hoặc `Manual`, nêu setup cần thêm.

## 6. Cách chạy

Luồng làm việc:

1. Resolve feature folder.
2. Đọc artifacts và code path liên quan.
3. Lập test case matrix trước khi chạy.
4. Xác định test nào đã có automation sẵn, test nào cần viết thêm test file.
5. Nếu viết thêm test file/config, chỉ sửa file test hoặc config test cần thiết; không sửa product code trừ khi người dùng yêu cầu fix.
6. Chạy command hẹp nhất trước, rồi mở rộng khi cần:
   - BE liên quan: test file/spec cụ thể nếu có.
   - BE rộng: `npm run test` hoặc `npm run test:e2e`.
   - FE hiện tại: `npm run build`.
   - FE E2E sau khi setup Playwright: chạy spec liên quan.
7. Ghi đầy đủ kết quả vào `TEST.md`.

Nếu command fail do sandbox/network/env, ghi rõ command, lỗi ngắn gọn, và trạng thái `Blocked`. Không báo pass khi command không chạy được.

## 7. TEST.md format

Tạo hoặc cập nhật:

```text
docs/features/<NNN>-<feature>/TEST.md
```

Format:

```markdown
# TEST - <Feature Name>

## Scope

- Feature: `<NNN>-<feature>`
- Date: `<YYYY-MM-DD>`
- Source docs: `BA.md`, `HOW.md`, `WALKTHROUGH.md`, `<review files if any>`

## Test Case Matrix

| ID | Source | Scenario | Type | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| TC-001 | BA AC 1 | ... | Automated | Pass/Fail/Blocked/Not Run | ... |
| TC-002 | HOW State Machine | ... | Manual | Manual Pending | ... |

## Automated Execution

| Command | Working Dir | Result | Notes |
| --- | --- | --- | --- |
| `npm run test` | `server/` | Pass/Fail/Blocked | ... |

## Manual Test Needed

- [ ] Scenario cần người dùng tự kiểm tra và lý do agent không tự kiểm tra được.

## Findings

- Critical failures nếu có.
- Non-critical observations nếu có.

## Verdict

PASS / FAIL / PARTIAL / BLOCKED
```

`Verdict` meaning:

- `PASS`: automated cases chạy được đều pass, không còn manual case bắt buộc cho acceptance chính.
- `FAIL`: có automated case fail phản ánh lỗi feature.
- `PARTIAL`: phần automated pass nhưng còn manual/blocked case quan trọng.
- `BLOCKED`: không thể chạy phần kiểm thử có ý nghĩa vì thiếu setup/env/service.

## 8. Done report

Khi báo done:

```markdown
## Summary
- Đã tạo/cập nhật `TEST.md`.
- Automated: X pass, Y fail, Z blocked.
- Manual: N case còn cần người dùng test.

## Commands
- `<command>` → pass/fail/blocked

## Verdict
PASS / FAIL / PARTIAL / BLOCKED
```

Nếu có failure, nêu rõ file/test case nào fail và behavior nào không đúng. Không tự sửa feature code trong test flow trừ khi người dùng yêu cầu chuyển sang `fix`.
