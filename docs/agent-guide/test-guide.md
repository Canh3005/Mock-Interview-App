# Test Agent Guide

## 0.1. Ngôn ngữ artifact

Mọi `TEST.md` và test done report mặc định phải dùng tiếng Việt rõ ràng, dễ đọc. Chỉ giữ tiếng Anh cho tên tool, command, route, API contract, status kỹ thuật, exception gốc, field/code identifier, hoặc thuật ngữ cần đối chiếu trực tiếp.

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

Áp dụng nguyên tắc **spec-first test design**:

1. Viết ma trận test case từ tài liệu trước khi đọc code product.
2. Chỉ đọc code sau khi đã có ma trận test case, để xác định selector, route, API path, seed data, dependency và cách automation chạy được.
3. Không đổi test case cho khớp implementation hiện tại nếu implementation lệch BA/HOW/WALKTHROUGH. Khi lệch, ghi `Fail` hoặc `Spec gap`, rồi nêu rõ nguồn tài liệu bị lệch.
4. Nếu phải thêm test case sau khi đọc code, ghi rõ đó là regression/technical coverage bổ sung, không thay thế test case từ spec.

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

- Backend service/unit: business rule, state machine, validation nội bộ, edge case nhỏ, chạy nhanh và không cần DB thật.
- Backend API integration: create, list/filter, detail, update, delete/retire/archive, validation failure, permission failure, forbidden transition, audit/side effect nếu có. Với CRUD quan trọng, ưu tiên chạy qua controller/guard/service/repository thật và test database thật thay vì chỉ mock repository.
- FE Playwright mock API: form validation, payload wiring, loading/error state, i18n label cơ bản và action trên UI. Dùng cho test nhanh, ổn định, không phụ thuộc backend.
- FE Playwright real-flow: browser thật + frontend thật + backend thật + database thật cho các happy path CRUD quan trọng sau khi API integration đã ổn định.
- State machine: allowed transitions và blocked transitions.

## 5. Tooling hiện tại và đề xuất

### Quy ước vị trí test file

Không đặt `*.spec.*`, `*.test.*`, e2e spec, hoặc test helper trong `src/` hay trong folder module code. Product code và test code phải tách rời để module code không bị trộn với verification artifact.

- Backend unit/service test: `server/tests/unit/**`.
- Backend API integration/e2e test và Supertest helper: `server/tests/integration/**`.
- Frontend Playwright mock/real-flow test và helper: `client/apps/web/tests/integration/**`.
- Helper mới đặt trong `tests/<unit|integration>/helpers` gần lớp test đang dùng. Chỉ tạo shared helper ngoài layer khi có nhu cầu dùng chung thật sự và phải nằm dưới `tests/`, không nằm trong `src/`.
- Tên domain/module có chữ `test`, ví dụ `test-cases`, không tính là test artifact nếu đó là product code.

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

Dùng `npm run test` cho service/unit test. Dùng `npm run test:e2e` cho API integration test. Với CRUD quan trọng, API e2e nên kiểm tra auth boundary, DTO validation, repository/TypeORM persistence, list/filter/pagination và transition rule bằng test database thật.

### Frontend

Repo hiện tại trong `client/apps/web/` có:

```bash
npm run build
npm run test:e2e
npm run test:e2e:real
npm run test:e2e:ui
npm run test:e2e:headed
npm run test:e2e:report
```

Build check không chứng minh CRUD UI chạy đúng; nó chỉ bắt lỗi compile/bundle.

Dùng `npm run test:e2e` cho Playwright test nhanh, mặc định có thể mock API để kiểm tra UI flow/payload. Dùng `npm run test:e2e:real` cho browser real-flow khi cần kiểm tra frontend thật gọi backend/database thật. File real-flow nên đặt dạng `*.real.spec.js` để không vô tình chạy trong suite mock/nhanh.

Nếu cần FE component/unit test, đề xuất setup:

- Vitest
- React Testing Library
- `@testing-library/user-event`
- jsdom

Full CRUD UI trong browser:

- Playwright (`@playwright/test`)

Playwright là lựa chọn mặc định cho UI E2E vì nó mở browser thật, thao tác như người dùng, chạy lại được bằng command và phù hợp đưa vào CI.

Với Playwright real-flow, chỉ mock phần không thuộc mục tiêu test nếu cần thiết, ví dụ cấp session admin ổn định qua `/auth/refresh`. Không mock API nghiệp vụ đang cần kiểm tra, như `/admin/...`, nếu mục tiêu là xác nhận backend/database thật.

Không tự cài dependency mới nếu người dùng chưa đồng ý hoặc nếu network/sandbox yêu cầu approval. Khi thiếu test data, auth, browser runtime, hoặc service phụ trợ, ghi test case là `Blocked` hoặc `Manual`, nêu setup cần thêm.

## 6. Cách chạy

Luồng làm việc:

1. Resolve feature folder.
2. Đọc artifacts và code path liên quan.
3. Lập test case matrix trước khi chạy.
4. Xác định test nào đã có automation sẵn, test nào cần viết thêm test file.
5. Trước khi viết test/helper mới, kiểm tra helper có sẵn trong `server/tests/unit/helpers`, `server/tests/integration/helpers`, `client/apps/web/tests/integration/helpers`, và các spec gần nhất. Ưu tiên tái sử dụng hoặc mở rộng helper hiện có cho payload mẫu, seed data, JWT/session, mock route, app setup và cleanup. Nếu cần thêm helper mới, đặt vào folder helper đúng lớp test và export bằng named export để các test sau dùng lại được.
6. Nếu viết thêm test file/config, chỉ sửa file test, helper test hoặc config test cần thiết; không sửa product code trừ khi người dùng yêu cầu fix.
7. Chạy command hẹp nhất trước, rồi mở rộng khi cần:
   - BE liên quan: test file/spec cụ thể nếu có.
   - BE service/unit: `npm run test -- <spec> --runInBand`.
   - BE API integration: `npm run test:e2e -- <spec> --runInBand`.
   - FE build: `npm run build`.
   - FE Playwright mock/nhanh: `npm run test:e2e -- <spec>`.
   - FE Playwright real-flow: `npm run test:e2e:real`.
8. Ghi đầy đủ kết quả vào `TEST.md`.

Nếu command fail do sandbox/network/env, ghi rõ command, lỗi ngắn gọn, và trạng thái `Blocked`. Không báo pass khi command không chạy được.

Với `TEST.md`, ghi rõ mỗi test tự động đang thuộc lớp nào: service/unit, API integration, Playwright mock API, hay Playwright real-flow. Nếu real-flow vẫn mock login/session, nói rõ phần nào được mock và phần API nghiệp vụ nào vẫn đi qua backend thật.

## 7. TEST.md format

Tạo hoặc cập nhật:

```text
docs/features/<NNN>-<feature>/TEST.md
```

Ngôn ngữ mặc định của `TEST.md` là **tiếng Việt dễ đọc**. Chỉ dùng tiếng Anh khi đó là tên tool, command, route, status kỹ thuật, exception gốc, hoặc wording gốc cần đối chiếu. Không viết cả báo cáo bằng tiếng Anh nếu người dùng không yêu cầu.

Format:

```markdown
# TEST - <Tên feature dễ đọc>

## Phạm vi

- Feature: `<NNN>-<feature>`
- Ngày chạy: `<YYYY-MM-DD>`
- Tài liệu nguồn: `BA.md`, `HOW.md`, `WALKTHROUGH.md`, `<review files nếu có>`

## Tóm tắt kết quả

- [Tóm tắt ngắn phần đã test được và phần còn thiếu.]

## Ma trận test case

| ID | Nguồn | Kịch bản cần kiểm tra | Loại | Kết quả | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| TC-001 | BA AC 1 | ... | Tự động | Pass/Fail/Blocked/Chưa chạy | ... |
| TC-002 | HOW State Machine | ... | Thủ công | Chưa chạy | ... |

## Lệnh đã chạy

| Lệnh | Thư mục | Kết quả | Ghi chú |
| --- | --- | --- | --- |
| `npm run test` | `server/` | Pass/Fail/Blocked | ... |

## Cần test thủ công hoặc bổ sung sau

- [ ] Scenario cần người dùng tự kiểm tra và lý do agent không tự kiểm tra được.

## Ghi nhận

- Lỗi nghiêm trọng nếu có.
- Rủi ro còn lại nếu có.

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
