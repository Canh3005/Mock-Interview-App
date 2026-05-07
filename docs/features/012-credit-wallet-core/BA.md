## WHAT

User có một ví Credit gắn liền với tài khoản của mình. Ngay sau khi đăng ký thành công, user tự động nhận 5 Credit miễn phí — không cần làm thêm bất cứ thao tác nào. Số dư Credit luôn hiển thị rõ ràng trên header ở mọi trang của ứng dụng, giống như ví MoMo hiển thị số dư liên tục, để user luôn biết mình còn bao nhiêu Credit mà không cần vào trang riêng để kiểm tra.

## WHY

Đây là nền tảng của toàn bộ hệ thống monetization. Nếu user không thấy số dư Credit của mình, họ không có lý do tâm lý để nạp thêm — không có "ví" thì không có "tiêu". Signup bonus 20 Credit tồn tại để user có thể trải nghiệm trọn vẹn ít nhất 1 phiên luyện tập ngay sau đăng ký, trước khi hệ thống yêu cầu thanh toán — đây là cơ chế acquisition quan trọng nhất, quyết định conversion từ visitor sang active user.

## Epic Context

Thuộc **Epic 1 — Credit Wallet Core**. Đây là story đầu tiên và nền tảng của toàn bộ hệ thống Credit. Không có Wallet, không có story nào khác chạy được:

- **Phụ thuộc vào:** Hệ thống đăng ký/đăng nhập tài khoản (đã có)
- **Block các story:** 013 (Credit Gate), 014 (Purchase Flow), 015 (Auto Refund), 016 (Transaction History) — tất cả đều cần Wallet tồn tại trước

## SCOPE

**In:**
- Ví Credit (Wallet) tự động tạo khi user đăng ký tài khoản mới (1 tài khoản = 1 ví, không thể tạo nhiều)
- Tự động tặng 5 Credit vào ví khi user hoàn thành đăng ký và xác thực tài khoản lần đầu
- Ghi nhận giao dịch BONUS: "Quà tặng đăng ký" vào lịch sử ví
- Hiển thị số dư Credit cố định trên header ở toàn bộ màn hình sau khi đăng nhập
- Số dư trên header cập nhật realtime khi Credit thay đổi (không cần reload trang)

**Out:**
- Nạp Credit bằng tiền thật (→ story 014)
- Trừ Credit khi bắt đầu phiên (→ story 013)
- Lịch sử giao dịch đầy đủ dạng trang riêng (→ story 016)
- Cảnh báo sắp hết Credit (→ story 013)
- Subscription plan (giai đoạn B — sau launch)
- Bonus Credit kèm gói mua (→ story 014)

**Depends on:** Hệ thống đăng ký/đăng nhập (đã có)

**Blocks:** 013, 014, 015, 016

## Business Flow

### Happy Path

1. User hoàn thành form đăng ký và xác thực tài khoản (verify email hoặc OTP)
2. Hệ thống tự động tạo Wallet gắn với tài khoản vừa tạo — user không thấy bước này, xảy ra ngầm
3. Hệ thống tự động cộng 5 Credit vào Wallet, ghi nhận giao dịch BONUS với ghi chú "Quà tặng đăng ký"
4. User được redirect vào trang chính sau đăng ký → trên header xuất hiện "5 Credit" ngay lập tức
5. Từ đây trở đi, dù user ở bất kỳ trang nào (Dashboard, Session, Settings, History) — số dư Credit luôn hiển thị trên header
6. Khi Credit thay đổi (ví dụ sau khi nạp thêm hoặc bị trừ ở story khác) → số dư trên header cập nhật ngay không cần reload

### Edge Cases & Business Rules

**Email trùng lặp (tái đăng ký):**
- User đã từng đăng ký với email A, sau đó xóa tài khoản và đăng ký lại bằng email A → KHÔNG nhận thêm signup bonus lần 2
- Hệ thống kiểm tra email đã từng nhận bonus trước khi credit — không phải kiểm tra tài khoản còn tồn tại hay không

**Đăng ký chưa xác thực:**
- User submit form đăng ký nhưng chưa verify email/OTP → Wallet chưa được tạo, bonus chưa được tặng
- Chỉ tạo Wallet và tặng bonus SAU KHI tài khoản được activate thành công

**Lỗi kỹ thuật khi tặng bonus:**
- Tài khoản được tạo thành công nhưng bước cộng bonus bị lỗi → tài khoản vẫn hoạt động bình thường, hệ thống tự retry cộng bonus trong vòng 5 phút
- User không bị kẹt ở màn hình đăng ký hay mất tài khoản chỉ vì bonus fail

**Số dư hiển thị:**
- Credit không bao giờ hiển thị số âm trên header — nếu có lỗi tính toán, hiển thị 0 thay vì âm
- Số dư luôn là số nguyên dương (Credit không có số thập phân)

**Business Rules cứng:**
- Mỗi email nhận signup bonus đúng 1 lần — vĩnh viễn, không hết hạn rule này
- Wallet luôn tồn tại cùng tài khoản — không có user nào đăng nhập được mà không có Wallet
- Credit không có giá trị quy đổi ngược thành tiền mặt — chỉ dùng trong nền tảng
- Số dư Credit không bao giờ xuống âm (hệ thống chặn trừ khi không đủ — story 013)

## Acceptance Criteria

- Given user vừa hoàn thành đăng ký tài khoản mới và xác thực thành công, When user được redirect vào trang chính, Then header hiển thị "5 Credit" ngay lập tức mà không cần user làm thêm bất kỳ thao tác nào.

- Given user đã có tài khoản với 15 Credit đang hiển thị trên header, When user chuyển từ trang Dashboard sang trang Settings và quay lại, Then số dư 15 Credit vẫn hiển thị chính xác và không bị reset về 0 hay mất đi.

- Given user đã từng đăng ký với email A và nhận signup bonus, When user tạo tài khoản mới lại với cùng email A (sau khi xóa tài khoản cũ), Then hệ thống không cộng thêm 5 Credit lần 2 — ví bắt đầu với 0 Credit.

- Given hệ thống gặp lỗi kỹ thuật trong bước cộng bonus ngay sau đăng ký, When lỗi xảy ra, Then tài khoản user vẫn được tạo thành công và hệ thống tự cộng 5 Credit trong vòng 5 phút tiếp theo mà không cần user làm gì.

## Risk

**HIGH** — Race condition khi tặng signup bonus

- User mở nhiều tab đăng ký cùng lúc hoặc double-submit → có thể nhận bonus 2 lần
- **Impact:** User gian lận nhận Credit miễn phí → thất thoát doanh thu, nếu phổ biến sẽ ảnh hưởng nặng vì bonus là chi phí trực tiếp
- **Mitigation:** Atomic check-and-set — ghi nhận email đã nhận bonus trong cùng transaction với việc credit, dùng database unique constraint trên (email, bonus_type) để chặn duplicate tuyệt đối
