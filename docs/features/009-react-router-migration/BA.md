## WHAT
Migrate hệ thống routing của frontend từ custom state-based routing (useState + navigate prop) sang react-router-dom v7. Sau khi migrate, mỗi trang trong ứng dụng có một URL riêng biệt, user có thể dùng nút Back/Forward của browser, bookmark và share link trực tiếp đến bất kỳ trang nào.

## WHY
Hệ thống routing hiện tại giữ URL cố định tại `/` trong suốt session — user không thể bookmark trang cụ thể, không thể share link phòng phỏng vấn hay kết quả debrief, và nút Back/Forward của browser không hoạt động. Đây là UX debt cơ bản cần giải quyết trước khi mở rộng thêm tính năng navigation phức tạp hơn (deep link vào room, share kết quả).

react-router-dom v7 đã được install sẵn trong package.json nhưng chưa được sử dụng.

## Epic Context
Đây là refactor infrastructure, không thuộc epic SD Interview hay bất kỳ feature flow nào. Đây là nền tảng cho mọi tính năng navigation phía sau — bao gồm deep link vào interview room, share link debrief, và sau này là SSR/code-splitting nếu cần.

## SCOPE
In:
- Định nghĩa URL path cho tất cả ~19 trang hiện có
- Bọc app trong BrowserRouter, định nghĩa cấu trúc Routes/Route
- Tạo ProtectedRoute component thay thế logic guard trong hàm navigate() hiện tại (auth guard + role-based guard cho admin)
- Thay thế prop `navigate` bằng hook `useNavigate()` trên tất cả page components
- Xử lý side effect khi navigate đến interview-setup (reset interview setup state)
- Redirect tự động: authenticated user vào login/register → dashboard; unauthenticated user vào protected route → login

Out:
- Thay đổi logic nghiệp vụ của bất kỳ trang nào
- Lazy loading / code splitting (có thể làm sau)
- Server-side rendering
- Thay đổi Redux state management
- Thêm route params động cho interview room (e.g., `/dsa-room/:sessionId`) — chỉ làm URL tĩnh trong story này

Depends on: none

Blocks: none (refactor thuần, không block feature mới)

## Business Flow

### Happy Path
1. User mở trình duyệt, truy cập `/` — được redirect đến `/landing`
2. User chưa đăng nhập click "Bắt đầu" → navigate đến `/login`, URL thay đổi thành `/login`
3. User đăng nhập thành công → redirect đến `/dashboard`, URL thay đổi thành `/dashboard`
4. User bấm Back trên browser → quay về `/login` (nhưng vì đã auth, redirect ngay về `/dashboard`)
5. User vào `/interview-setup` → chọn cấu hình → vào `/sd-room`, URL thành `/sd-room`
6. User copy URL `/sd-room` và paste vào tab mới → vì chưa có interview setup state, được redirect về `/interview-setup`
7. User bookmark `/dashboard` → lần sau mở thẳng `/dashboard` không cần qua landing

### Edge Cases & Business Rules
- **Unauthenticated direct URL access:** User truy cập trực tiếp bất kỳ protected route (e.g., `/dashboard`) khi chưa đăng nhập → redirect về `/login`, sau khi login xong redirect về URL gốc
- **Admin route non-admin:** User có role `candidate` truy cập `/admin-problems` → redirect về `/dashboard`
- **Interview room without setup:** User truy cập `/sd-room`, `/dsa-room`, `/behavioral-room`, `/combat-room` mà không có interview setup state trong Redux → redirect về `/interview-setup`
- **Auth check in progress:** Khi app đang `isAuthenticating` (chưa biết có token hợp lệ không) → hiển thị loading spinner, không redirect sớm
- **Authenticated user vào login/register:** Redirect ngay về `/dashboard`
- **404:** URL không khớp bất kỳ route nào → redirect về `/landing`

**Business Rules:**
- Mọi route trong nhóm interview room đều yêu cầu: (1) đã đăng nhập, (2) có interview setup state hợp lệ
- Admin routes yêu cầu: đã đăng nhập + role = `admin`
- Việc navigate đến `/interview-setup` phải reset interview setup state trong Redux (constraint hiện tại giữ nguyên)

## Acceptance Criteria
- Given user chưa đăng nhập, When user gõ thẳng URL `/dashboard` vào browser, Then user bị redirect về `/login` và URL hiển thị `/login`
- Given user đã đăng nhập, When user navigate giữa các trang, Then URL trên thanh địa chỉ thay đổi tương ứng với từng trang
- Given user đang ở `/sd-room`, When user nhấn nút Back của browser, Then user quay về trang trước đó đúng với lịch sử navigation
- Given user đã đăng nhập với role `candidate`, When user truy cập `/admin-problems`, Then user bị redirect về `/dashboard`
- Given app đang kiểm tra auth (isAuthenticating = true), When user truy cập bất kỳ protected route, Then app hiển thị loading spinner và không redirect cho đến khi auth check xong
- Given user navigate đến `/interview-setup`, Then interview setup state trong Redux bị reset (behavior hiện tại được giữ nguyên)
- Given URL không tồn tại trong hệ thống, When user truy cập URL đó, Then user được redirect về `/landing`
