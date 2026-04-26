## WHAT

Khi ứng viên chọn round "System Design" trong màn hình setup phiên phỏng vấn, hệ thống hiển thị config panel với 2 tùy chọn (thời lượng 45/60 phút, bật/tắt Curveball). Sau khi khởi động phiên, backend tự động đọc `candidateLevel` + `cvContextSnapshot` từ `InterviewSession` đã có, chọn SDProblem phù hợp từ bank, và tạo `SDSession` — ứng viên không cần chọn đề bài.

Feature được chia thành 2 story vì backend (entity + selection logic) và frontend (UI + saga) có thể triển khai song song sau khi API contract được chốt.

---

## Story 1 — SDSession Backend: Entity + Problem Selection + API

### WHAT

Backend cung cấp endpoint `POST /sd-sessions` để tạo SDSession. Service tự động đọc context từ InterviewSession, query SDProblem bank theo targetLevel, random chọn problem phù hợp, và persist SDSession với trạng thái ban đầu.

### WHY

SDSession phải được tạo ở backend để ứng viên không biết mình sẽ được hỏi gì trước khi vào room. Problem selection logic ở backend còn đảm bảo fallback khi không có problem khớp hoàn toàn — FE không nên tự xử lý logic này.

### SCOPE

In:
- TypeORM entity `SDSession` với các fields: id, interviewSessionId, problemId (FK → SDProblem), phase, enableCurveball, durationMinutes, architectureJSON, transcriptHistory, status, createdAt
- `SDSessionService.create()` — logic: load InterviewSession → đọc `candidateLevel` + `cvContextSnapshot` → query SDProblem bank với `targetLevel = candidateLevel` → random 1 result → tạo SDSession
- Fallback: nếu không có problem khớp targetLevel → random 1 problem bất kỳ từ toàn bank (không được trả 404)
- `POST /sd-sessions` — nhận `{ interviewSessionId, durationMinutes, enableCurveball }` — trả về `{ sdSessionId, phase }`
- `GET /sd-sessions/:id` — lấy session state (dùng bởi Epic 2, 3)
- SDSessionModule + import vào app.module.ts

Out:
- SDConfigPanel FE (Story 2)
- Whiteboard canvas (Epic 2)
- AI Interviewer engine (Epic 3)
- PATCH endpoints để update phase, architectureJSON, transcriptHistory (Epic 3)

Depends on: `001-sd-problem-bank` — SDProblem entity và dữ liệu seed phải có trước

### User Flow (backend)

1. FE gọi `POST /sd-sessions { interviewSessionId, durationMinutes: 45, enableCurveball: true }`
2. Service load `InterviewSession` → đọc `candidateLevel` (vd. "mid")
3. Query `SDProblem` với `targetLevel = "mid"`, lấy list → random 1
4. Nếu list rỗng → query toàn bank, random 1 (fallback)
5. Tạo `SDSession { interviewSessionId, problemId, phase: "CLARIFICATION", enableCurveball: true, durationMinutes: 45, architectureJSON: null, transcriptHistory: [] }`
6. Trả về `{ sdSessionId, phase: "CLARIFICATION" }`

### Acceptance Criteria

```
Given InterviewSession tồn tại với candidateLevel="mid"
      và SDProblem bank có ≥1 problem với targetLevel="mid"
When POST /sd-sessions { interviewSessionId, durationMinutes: 45, enableCurveball: true }
Then trả về 201 với sdSessionId, SDSession được tạo với problem.targetLevel="mid"
     và phase="CLARIFICATION"

Given SDProblem bank không có problem nào với targetLevel khớp candidateLevel
When POST /sd-sessions
Then vẫn trả về 201 (fallback random) — không được trả 404 hay 500

Given SDSession đã tạo với sdSessionId
When GET /sd-sessions/:sdSessionId
Then trả về session object đầy đủ kèm problem metadata
```

### File Estimate

Ước tính số file thay đổi: ~6 / 10

| File | Loại |
|------|------|
| `server/src/sd-session/entities/sd-session.entity.ts` | Tạo mới |
| `server/src/sd-session/sd-session.service.ts` | Tạo mới |
| `server/src/sd-session/sd-session.controller.ts` | Tạo mới |
| `server/src/sd-session/sd-session.module.ts` | Tạo mới |
| `server/src/sd-session/dto/create-sd-session.dto.ts` | Tạo mới |
| `server/src/app.module.ts` | Sửa — import SDSessionModule |

---

## Story 2 — SDConfigPanel Frontend: Round Config UI + Saga

### WHAT

Bật `available: true` cho round `system_design` trong RoundSelectionStep. Khi ứng viên chọn round này, hiển thị `SDConfigPanel` (giống `DSAConfigPanel` pattern) với 2 option: thời lượng (45/60 phút) và Curveball toggle (default ON). State lưu vào `interviewSetupSlice.sdConfig`. Khi session khởi động, saga gọi `POST /sd-sessions` để tạo SDSession.

### WHY

Round `system_design` đang hardcode `available: false`. Story này là thay đổi tối thiểu để ứng viên có thể chọn round và config trước khi vào — không có UI này thì flow không thể bắt đầu.

### SCOPE

In:
- `SDConfigPanel.jsx` — dropdown duration (45/60 phút) + Curveball toggle (default ON)
- `interviewSetupSlice.js` — thêm `sdConfig: { durationMinutes: 45, enableCurveball: true }` + action `setSdConfig`
- `RoundSelectionStep.jsx` — đổi `available: true` cho system_design, render `<SDConfigPanel />` khi round được chọn (giống DSA pattern)
- `interviewSetupSaga.js` — sau khi `initSessionSuccess`, nếu `selectedRounds.includes('system_design')` → gọi `POST /sd-sessions` với `sdConfig` hiện tại
- `client/apps/web/src/api/sdSession.js` — axiosClient wrapper cho SD session endpoints

Out:
- Màn hình phòng phỏng vấn SD (Epic 2)
- Navigate vào SD room sau khi SDSession được tạo

Depends on: Story 1 (`POST /sd-sessions` endpoint phải có)

### User Flow

1. Ứng viên ở bước "Chọn vòng thi" → thấy "System Design (Whiteboard)" không còn "Sắp ra mắt"
2. Click chọn round → `SDConfigPanel` xuất hiện bên dưới (expandable, giống DSAConfigPanel)
3. Ứng viên chọn duration: 45 phút (default) hoặc 60 phút
4. Ứng viên có thể tắt Curveball nếu muốn (default bật)
5. Click "Bắt đầu" → saga init interview session → nếu SD round được chọn → gọi POST /sd-sessions → navigate vào SD room với sdSessionId

### Acceptance Criteria

```
Given ứng viên ở màn hình chọn round
When nhìn vào card "System Design (Whiteboard)"
Then card không còn badge "Sắp ra mắt", có thể click chọn

Given ứng viên đã chọn round system_design
When SDConfigPanel hiển thị
Then có dropdown duration (45/60 phút, default 45) và Curveball toggle (default ON)

Given ứng viên đã chọn round system_design với duration=45, curveball=true
When click "Bắt đầu" và interview session init thành công
Then saga gọi POST /sd-sessions với { interviewSessionId, durationMinutes: 45, enableCurveball: true }
     và nhận về sdSessionId
```

### File Estimate

Ước tính số file thay đổi: ~5 / 10

| File | Loại |
|------|------|
| `client/apps/web/src/components/interview-setup/sd/SDConfigPanel.jsx` | Tạo mới |
| `client/apps/web/src/store/slices/interviewSetupSlice.js` | Sửa — thêm sdConfig + setSdConfig |
| `client/apps/web/src/components/interview-setup/steps/RoundSelectionStep.jsx` | Sửa — available: true + SDConfigPanel |
| `client/apps/web/src/store/sagas/interviewSetupSaga.js` | Sửa — create SD session sau init |
| `client/apps/web/src/api/sdSession.js` | Tạo mới |
