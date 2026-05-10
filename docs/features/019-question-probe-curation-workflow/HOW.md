# HOW - Question Probe Curation Workflow

## Overview

Xây workflow quản trị cho `QuestionProbe` và `InterviewSet` trên nền taxonomy của feature 018. Kiến trúc trọng tâm là admin-only boundary, state machine publish/review rõ ràng, quality gate trước khi active và audit trail cho mọi thay đổi quan trọng.

## Business Alignment

BA yêu cầu chỉ probe đã đủ intent, localized content, expected signals, red flags, scoring hints và follow-up guidance mới được dùng cho candidate hoặc AI session. Vì vậy workflow không được là CRUD tự do; mọi hành động publish, retire hoặc đưa về needs revision phải đi qua transition hợp lệ, có validation và có dấu vết người thực hiện.

Feature này cũng phải bảo vệ các feature sau: public question bank, interview set discovery và AI selector chỉ nên đọc probe hoặc set ở trạng thái usable.

## Architecture Decisions

### Decision: Curation State Control

**Option A - Admin sửa trực tiếp `status`:** endpoint update cho phép gửi status bất kỳ.
- Pro: đơn giản, ít endpoint.
- Con: dễ active probe thiếu quality gate hoặc nhảy trạng thái không audit được.

**Option B - Explicit transition commands:** update content và transition status là hai loại action khác nhau.
- Pro: kiểm soát được draft -> in_review -> active, needs_revision, retired; dễ enforce reason/audit.
- Con: nhiều contract hơn.

**Chọn: Option B** - state machine là rủi ro chính của feature, phải explicit thay vì là side effect của update.

### Decision: Published Content Mutability

**Option A - Active probe được sửa trực tiếp:** mọi edit tác động ngay tới candidate/AI.
- Pro: sửa lỗi nhanh.
- Con: session history và scoring evidence có thể không còn khớp với nội dung đã hỏi.

**Option B - Stable identity + audit/version snapshot:** probe giữ identity ổn định, nhưng các lần publish quan trọng tạo revision/audit đủ để hiểu nội dung tại thời điểm dùng.
- Pro: session cũ vẫn giải thích được, active content có lịch sử rõ.
- Con: tăng yêu cầu lưu metadata audit.

**Chọn: Option B** - tối thiểu phải có revision/audit trail; nếu chưa làm full versioning UI thì backend vẫn cần lưu đủ dữ kiện để truy vết.

### Decision: Import/Export Review

**Option A - Import ghi thẳng vào active inventory:** batch content đủ field thì publish luôn.
- Pro: nhanh khi seed nhiều probe.
- Con: đi ngược nguyên tắc curation, dễ publish nội dung chưa review.

**Option B - Import tạo draft/in_review only:** import hỗ trợ bulk review nhưng không bypass quality gate.
- Pro: giữ kiểm soát chất lượng.
- Con: curator cần thêm bước publish.

**Chọn: Option B** - bulk tooling là cách nhập liệu, không phải cơ chế bypass review.

## System Boundaries

Backend Question Bank domain owns:

- Admin CRUD cho probe draft/content.
- State transition service cho probe lifecycle.
- Quality gate validation trước publish.
- Audit trail cho create, update, submit review, publish, mark needs revision và retire.
- Admin CRUD/curation cho `InterviewSet`.

Frontend admin owns:

- Admin-only screens/forms để curator quản lý probe và interview set.
- Client-side validation để giảm lỗi nhập liệu, nhưng backend vẫn là authority.
- Loading/error/success feedback theo convention Redux-Saga hiện có.

Auth boundary:

- Admin API phải dùng `JwtAuthGuard + RolesGuard` và `Role.ADMIN`, cùng precedent của `/admin/problems` và `/admin/sd-problems`.
- Candidate/public route không được dùng các endpoint admin này.

Feature này không quyết định AI runtime selection. Nó chỉ đảm bảo inventory active đủ tin cậy cho selector ở feature sau.

## Contracts

### Admin Probe API Behavior

Admin boundary nên có các behavior public ở cấp hệ thống:

| Behavior | Contract |
| --- | --- |
| List probes | Paged list, filter theo status, role family, level, type, competency, language coverage, search |
| Get probe detail | Trả full canonical metadata, localized content, AI guidance, status, audit summary |
| Create draft | Tạo probe ở `draft`, không active ngay |
| Update content | Chỉ sửa nội dung/metadata theo rule trạng thái; không publish bằng update thường |
| Submit review | `draft` hoặc `needs_revision` -> `in_review` khi structurally valid tối thiểu |
| Publish | `in_review` -> `active` khi pass quality gate |
| Mark needs revision | `in_review` hoặc `active` -> `needs_revision`, bắt buộc có reason |
| Retire | `active` hoặc `needs_revision` -> `retired`, bắt buộc có reason |
| Import/export | Import tạo draft/in_review; export phục vụ review bulk |

List endpoint trả pagination shape chuẩn `{ data, total, page, limit }`.

Transition command nên nhận `reason` cho các action làm giảm availability hoặc reject content: needs revision, retire, reject review. Publish nên lưu reviewer/admin id và timestamp.

### State Machine

Allowed transitions:

| From | To | Điều kiện |
| --- | --- | --- |
| `draft` | `in_review` | Có metadata và localized content tối thiểu để reviewer hiểu probe |
| `in_review` | `active` | Pass full quality gate |
| `in_review` | `needs_revision` | Reviewer nêu reason cần sửa |
| `needs_revision` | `draft` | Admin bắt đầu sửa lại nội dung |
| `needs_revision` | `in_review` | Nội dung đã sửa và pass structural validation |
| `active` | `needs_revision` | Có report, quality issue hoặc scoring concern |
| `active` | `retired` | Không còn phù hợp hoặc cần ngừng dùng |
| `retired` | `draft` | Chỉ khi admin muốn clone/rework có chủ đích; không tự động re-active |

Blocked transitions:

- `draft` -> `active`
- `needs_revision` -> `active`
- `retired` -> `active`
- Bất kỳ transition nào thiếu reason khi reason là bắt buộc

### Publish Quality Gate

Publish phải fail nếu thiếu một trong các nhóm:

- Canonical metadata hợp lệ: stage, role family, level, type, competency, difficulty.
- AI guidance: intent, primary question, expected signals, red flags, scoring hints, follow-ups.
- Localized content tối thiểu cho các locale publish được cấu hình, trước mắt `vi`, `en`, `ja` theo overview.
- Display question/title/guidance không trống.
- Source/reference metadata không bị dùng làm public content nguyên văn nếu có.

Quality gate trả lỗi theo field group để admin biết cần sửa phần nào, không chỉ trả generic failure.

### InterviewSet Curation Contract

`InterviewSet` là curated grouping của active probes theo role, level, duration, stage coverage và competency coverage.

Minimum contract:

| Nhóm | Ý nghĩa |
| --- | --- |
| Identity/display | title, slug/code, localized display fields |
| Targeting | role family, level, duration, difficulty |
| Coverage | required stages, competencies, question count |
| Composition | ordered probe references hoặc slot rules |
| Governance | status, audit metadata |

InterviewSet chỉ được publish/active nếu các referenced probes đang active hoặc slot rules chỉ chọn active probes. Nếu một probe active bị retire, set liên quan phải bị đánh dấu cần review hoặc không dùng probe đó cho session mới.

## Data & State

`QuestionProbe` vẫn là aggregate nội dung chính từ feature 018. Feature 019 bổ sung lifecycle behavior và audit:

- `createdBy`, `updatedBy`, `reviewedBy`, `publishedAt`, `retiredAt` ở mức metadata nếu cần cho list/detail.
- Audit records cho action quan trọng, gồm actor, action, previous status, next status, reason, timestamp và snapshot summary.
- Revision/version marker để session history sau này biết probe content nào đã được dùng.

Concurrency:

- Update/transition nên chống lost update bằng `updatedAt`/revision precondition hoặc equivalent optimistic locking.
- Nếu hai admin cùng sửa, request sau phải biết content đã thay đổi thay vì âm thầm ghi đè review decision.

Historical behavior:

- Retired probe không xuất hiện trong session mới.
- Session cũ sau này vẫn phải resolve được probe đã dùng qua stable id và revision/audit snapshot.

## Quality & Stability Notes

- Security: toàn bộ admin write/read detail route cần admin role; không tin client-side `AdminRoute` là đủ.
- Observability: log transition failure, publish validation failure, import summary và bulk validation error count.
- Data quality: import phải trả successful/failed/errors theo item để curator sửa batch.
- Consistency: publish và audit nên là một transaction logic; không để status active mà thiếu audit record.
- Rollback: có thể chuyển active về needs revision hoặc retired để ngừng dùng trong session mới mà không xóa dữ liệu.
- i18n: mọi text admin UI dùng `t()` và cập nhật đủ `en`, `vi`, `ja` theo convention.

## Delivery Slices

Nên split thành hai delivery slices nếu implementation lớn:

1. Probe curation backend contract: admin API, state machine, quality gate, audit.
2. Admin UI và InterviewSet curation: màn quản lý probe/set dùng contract ở slice 1.

Nếu làm single slice, vẫn phải review riêng state transition backend trước khi nối UI để tránh UI che mất lỗi workflow.

## Not Changing

- Không xây public browse/search cho candidate.
- Không cho AI tự sinh production probe và tự publish.
- Không thay selector chọn probe trong session.
- Không xây analytics dashboard chi tiết.
- Không xóa hard constraints của feature 018.

## Dev Ownership

Dev tự xác định file/function/component cụ thể dựa trên convention và codebase hiện có. HOW.md chỉ ràng buộc architecture decisions, contracts, boundaries, và quality guardrails.
