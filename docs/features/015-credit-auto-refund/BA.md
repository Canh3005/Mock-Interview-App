## WHAT

Nếu một phiên luyện tập bị gián đoạn do lỗi từ phía hệ thống — server crash, AI timeout, lỗi mạng phía server — toàn bộ Credit đã trừ sẽ được hoàn tự động vào ví user trong vòng 5 phút. User không cần làm bất cứ điều gì: không cần gửi ticket, không cần chụp màn hình, không cần liên hệ hỗ trợ. Credit về ví rồi user nhận thông báo.

## WHY

User đã trả Credit thật để dùng dịch vụ. Nếu dịch vụ thất bại do lỗi kỹ thuật và Credit không được hoàn, user mất tiền mà không nhận được gì. Đây không chỉ là vấn đề tài chính — đây là vấn đề niềm tin. Một lần mất Credit oan có thể khiến user không bao giờ nạp tiền lại. Refund tự động loại bỏ hoàn toàn rào cản "phải liên hệ support để đòi lại Credit" — rào cản đó hầu hết user sẽ bỏ qua và im lặng churn thay vì mất công khiếu nại.

## Epic Context

Thuộc **Epic 1 — Credit Wallet Core**. Story này là safety net cho story 013 (Credit Gate & Deduction). Cần 013 xong trước vì chỉ khi Credit đã bị trừ thì mới cần cơ chế hoàn.

- **Phụ thuộc vào:** 013 (Credit Gate — Credit đã được trừ trước khi phiên bắt đầu)
- **Block:** Không block story nào trong B2C Core
- **Bắt buộc có trước go-live production** — không thể ra mắt hệ thống thu tiền mà không có cơ chế bảo vệ user

## SCOPE

**In:**
- Phát hiện phiên bị kết thúc bất thường do lỗi kỹ thuật phía server (server error, AI service failure, network error phía server)
- Tự động hoàn toàn bộ Credit đã trừ cho phiên đó (hoàn 100%, không partial)
- Ghi nhận giao dịch REFUND vào lịch sử ví: "Hoàn Credit — Phiên [loại phiên] bị gián đoạn kỹ thuật"
- Cập nhật số dư trên header ngay sau khi hoàn
- Gửi thông báo cho user: "Phiên [loại phiên] bị gián đoạn do lỗi hệ thống. X Credit đã được hoàn lại vào ví."
- Đảm bảo mỗi phiên chỉ được hoàn Credit đúng 1 lần dù hệ thống retry nhiều lần

**Out:**
- Hoàn Credit khi user tự thoát giữa chừng (không hoàn — đây là hành động chủ động của user)
- Refund tiền mặt VND (không hỗ trợ — Credit không quy đổi ngược)
- Manual refund bởi Admin (xử lý riêng trong Admin FinOps — giai đoạn sau)
- Partial refund theo % phiên đã hoàn thành (không làm — quá phức tạp và không nhất quán)
- Hoàn Credit khi mất kết nối internet phía user (lỗi phía user, không hoàn)

**Depends on:** 013 (Credit Gate & Deduction)

**Blocks:** Không (nhưng bắt buộc có trước production launch)

### Phân biệt lỗi kỹ thuật (hoàn Credit) vs. hành động user (không hoàn)

| Tình huống | Hoàn Credit? | Lý do |
|---|---|---|
| Server AI crash/unavailable | Có | Lỗi phía hệ thống |
| AI response timeout > 30 giây | Có | Degraded service — user không nhận được gì |
| Network error phía server | Có | Lỗi phía hệ thống |
| User tự nhấn "Kết thúc phiên sớm" | Không | Hành động chủ động của user |
| User đóng tab hoặc thoát app | Không | Hành động chủ động của user |
| Mất internet phía user | Không | Lỗi phía user — nằm ngoài tầm kiểm soát của hệ thống |
| Phiên hoàn thành 100% rồi lỗi khi lưu kết quả | Không | Phiên đã hoàn thành — user đã nhận được giá trị |

## Business Flow

### Happy Path — Server AI crash giữa phiên

1. User đang trong phiên Behavioral Interview (đã trừ 4 Credit trước khi bắt đầu)
2. Server AI gặp lỗi, không phản hồi được → phiên chuyển sang trạng thái **ERROR** với lý do: "AI_SERVICE_UNAVAILABLE"
3. User thấy màn hình lỗi: "Phiên bị gián đoạn do lỗi hệ thống. Chúng tôi đang xử lý..."
4. Trong vòng 5 phút: hệ thống phát hiện phiên ở trạng thái ERROR → xác nhận Credit đã bị trừ trước đó (4 Credit) → hoàn 4 Credit vào ví
5. Ghi nhận giao dịch REFUND: "Hoàn Credit — Behavioral Interview bị gián đoạn kỹ thuật — 4 Credit"
6. Header cập nhật số dư (cộng lại 4 Credit)
7. User nhận thông báo (ngay nếu đang online, hoặc khi online lại): "Phiên Behavioral Interview bị gián đoạn do lỗi hệ thống. 4 Credit đã được hoàn lại vào ví của bạn."

### Happy Path — AI response timeout

1. User đang trong phiên DSA Combat (đã trừ 3 Credit)
2. AI không phản hồi trong 30 giây → hệ thống đánh dấu phiên lỗi timeout
3. Luồng hoàn Credit tương tự như server crash ở trên

### Edge Cases & Business Rules

**Hệ thống retry hoàn Credit nhiều lần:**
- Vì lý do kỹ thuật, hệ thống có thể cố hoàn Credit 2 lần cho cùng 1 phiên
- Lần 2 phải bị chặn — kiểm tra: phiên này đã có giao dịch REFUND chưa? → nếu rồi thì bỏ qua
- Ví không bị cộng thêm lần 2

**User offline khi được hoàn:**
- Credit vẫn được cộng vào ví ngay — không cần user online
- Thông báo được lưu lại và hiển thị khi user mở app lại

**Phiên lỗi sau khi đã hoàn thành 90%:**
- Hoàn 100% Credit — không tính % hoàn thành
- Lý do: không có cách khách quan nào định nghĩa "đã nhận được bao nhiêu giá trị" khi phiên chưa có debrief

**Nhiều sự kiện ERROR liên tiếp cho cùng 1 phiên:**
- Chỉ tạo 1 giao dịch REFUND duy nhất
- Idempotency đảm bảo dựa trên session_id — mỗi session chỉ refund 1 lần

**Phiên hoàn thành bình thường nhưng lỗi khi lưu kết quả:**
- Nếu AI đã hoàn thành toàn bộ phiên và user nhận được đầy đủ phản hồi, nhưng bước lưu debrief bị lỗi → KHÔNG hoàn Credit (user đã nhận được giá trị phỏng vấn)
- Hệ thống retry lưu kết quả độc lập với việc hoàn Credit

**Business Rules cứng:**
- Hoàn 100% Credit — không có partial refund
- Chỉ hoàn khi lỗi phía server — danh sách lỗi phải được định nghĩa rõ ràng trong hệ thống, không tự diễn giải
- Thời gian hoàn tối đa: 5 phút kể từ khi phiên chuyển sang ERROR
- Mỗi phiên chỉ được hoàn Credit đúng 1 lần — idempotency bắt buộc
- Credit hoàn có cùng tính chất với Credit mua — không hết hạn, dùng bình thường

## Acceptance Criteria

- Given user đang trong phiên System Design (đã trừ 8 Credit) và server AI crash, When phiên chuyển sang trạng thái ERROR, Then trong vòng 5 phút user nhận lại đúng 8 Credit vào ví và thấy thông báo rõ ràng về lý do hoàn.

- Given phiên đã được hoàn 8 Credit, When hệ thống retry và cố hoàn thêm lần nữa, Then lần hoàn thứ 2 bị chặn — ví không bị cộng thêm và số dư giữ nguyên.

- Given user tự nhấn "Kết thúc phiên sớm" khi phiên đang chạy bình thường, When phiên kết thúc, Then Credit KHÔNG được hoàn — số dư giữ nguyên như sau khi đã trừ.

- Given user mất kết nối internet phía mình (wifi ngắt) trong khi phiên đang chạy, When phiên kết thúc bất thường do mất kết nối phía user, Then Credit KHÔNG được hoàn — hệ thống phân biệt lỗi phía server và lỗi phía user.

- Given user offline khi hệ thống hoàn Credit, When hệ thống xử lý hoàn xong, Then Credit đã được cộng vào ví ngay cả khi user chưa online — khi user mở app lại thấy số dư đã cập nhật và thông báo hoàn Credit.

## Risk

**HIGH** — Hoàn Credit 2 lần cho cùng 1 phiên

- Hệ thống retry refund job do queue failure → phiên được hoàn Credit 2 lần
- **Impact:** Thất thoát Credit trực tiếp — nếu xảy ra nhiều lần mà không phát hiện sẽ làm méo toàn bộ dữ liệu kinh tế
- **Mitigation:** Idempotency flag trên CreditTransaction — tạo record với session_id + type=REFUND trước khi credit wallet; database unique constraint ngăn insert 2 lần cho cùng session
