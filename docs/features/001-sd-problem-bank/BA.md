## WHAT

Admin có thể tạo và quản lý ngân hàng bài tập System Design (SD Problem Bank) thông qua admin portal. Mỗi problem lưu metadata cấu trúc đầy đủ: domain, targetRole, targetLevel, scalingConstraints, expectedComponents, referenceArchitecture (JSON topology), và curveBallScenarios. Dữ liệu này là ground truth cho toàn bộ Epic 1–5 của Phase 3.

## WHY

Hiện chưa có entity hay data model nào cho SD problems. Epic 1 cần query problem theo targetLevel để personalize, Epic 4 cần `referenceArchitecture` để so sánh với diagram ứng viên, Epic 3 cần `curveBallScenarios` để inject đúng lúc. Nếu không có problem bank với metadata chuẩn, mọi epic sau đều không có ground truth — AI phải generate on-the-fly, chất lượng không kiểm soát được.

## SCOPE

In:
- TypeORM entity `SDProblem` với đầy đủ fields metadata
- CRUD API: `GET /admin/sd-problems`, `GET /admin/sd-problems/:id`, `POST`, `PATCH /:id`, `DELETE /:id` — guard admin-only
- Query endpoint cho Epic 1: `GET /sd-problems?targetLevel=&domain=&limit=` — public (candidate dùng)
- Admin UI: tab "System Design" trong AdminLayout sidebar + `AdminSDProblemsPage` (list + create/edit modal)
- Seed script: 3 problem mẫu đủ fields (URL Shortener, Twitter Feed, Rate Limiter)

Out:
- Problem selection algorithm (Epic 1 — Story 2)
- Candidate-facing problem display trong session room (Epic 3)
- Curveball injection engine (Epic 3)

Depends on: Phase 1 Epic 0 — AdminLayout, AdminProblemsPage đã có làm mẫu pattern

## User Flow

1. Admin vào Admin Portal → click "System Design" trong sidebar (nav item mới)
2. Xem danh sách SD problems dạng table: title, domain, targetLevel, status
3. Click "Tạo mới" → modal form gồm:
   - title, domain (text)
   - targetRole (multi-select: backend / full-stack / data-eng)
   - targetLevel (select: mid / senior / staff)
   - difficulty (select: medium / hard)
   - estimatedDuration (number, phút)
   - scalingConstraints (JSON textarea: `{ peakQPS, dau, readWriteRatio, storageTarget, p99Latency }`)
   - expectedComponents (tag input: tên component)
   - referenceArchitecture (JSON textarea: `{ nodes: [], edges: [] }`)
   - curveBallScenarios (repeatable fields: trigger, prompt, expectedAdaptation)
   - tags (tag input)
4. Save → problem xuất hiện trong list với id mới
5. Click row bất kỳ → mở edit modal, có thể cập nhật hoặc delete

## Acceptance Criteria

```
Given admin submit form tạo problem với title hợp lệ, domain="url-shortener",
      targetLevel="mid", referenceArchitecture JSON hợp lệ
When POST /admin/sd-problems
Then trả về 201 với id mới, problem xuất hiện trong list GET /admin/sd-problems

Given problem bank có 3 problems: 2 với targetLevel="mid", 1 với targetLevel="senior"
When GET /sd-problems?targetLevel=mid&limit=5
Then response trả đúng 2 problems, không có problem targetLevel="senior"

Given một SDProblem đang tồn tại
When admin PATCH /admin/sd-problems/:id với title mới
Then GET /admin/sd-problems/:id trả về title đã cập nhật

Given admin DELETE /admin/sd-problems/:id
When gọi GET /admin/sd-problems/:id
Then trả về 404
```

## File Estimate

Ước tính số file thay đổi: ~8 / 10

| File | Loại |
|------|------|
| `server/src/sd-problem/entities/sd-problem.entity.ts` | Tạo mới |
| `server/src/sd-problem/sd-problem.service.ts` | Tạo mới |
| `server/src/sd-problem/sd-problem.controller.ts` | Tạo mới |
| `server/src/sd-problem/sd-problem.module.ts` | Tạo mới |
| `server/src/sd-problem/dto/create-sd-problem.dto.ts` | Tạo mới |
| `server/src/app.module.ts` | Sửa — import SDProblemModule |
| `client/apps/web/src/components/admin/AdminSDProblemsPage.jsx` | Tạo mới |
| `client/apps/web/src/components/admin/AdminLayout.jsx` | Sửa — thêm nav item "System Design" |
