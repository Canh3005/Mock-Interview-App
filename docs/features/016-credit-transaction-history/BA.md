## WHAT

User có thể xem toàn bộ lịch sử Credit của mình trên một trang dành riêng: từng lần nạp Credit (khi nào, gói gì, bao nhiêu tiền), từng lần tiêu Credit (phiên nào, loại gì), từng lần hoàn Credit (do lỗi gì), và Credit bonus nhận được khi đăng ký. Mỗi dòng lịch sử đều rõ ràng về thời gian, số Credit thay đổi, và số dư sau giao dịch. User có thể lọc theo loại giao dịch để tìm kiếm nhanh hơn.

## WHY

User trả tiền thật để mua Credit. Họ có quyền biết chính xác Credit của mình đi đâu, đến từ đâu. Khi không có lịch sử giao dịch rõ ràng, mọi sự nhầm lẫn về số dư đều trở thành support ticket tốn kém — "Tôi nạp 30 Credit sao chỉ thấy 22?", "Credit của tôi biến đi đâu vậy?". Lịch sử minh bạch giải đáp các câu hỏi này trước khi user cần hỏi, đồng thời làm tăng niềm tin rằng hệ thống không "ăn" Credit của họ.

## Epic Context

Thuộc **Epic 1 — Credit Wallet Core**. Đây là story cuối trong nhóm core wallet B2C. Cần các story 013, 014, 015 xong trước để có đủ loại giao dịch để hiển thị ý nghĩa.

- **Phụ thuộc vào:** 012 (BONUS), 013 (SPEND), 014 (PURCHASE), 015 (REFUND)
- **Block:** Không block story nào trong B2C Core
- **Đây là read-only feature** — không thay đổi bất kỳ dữ liệu nào, chỉ hiển thị

## SCOPE

**In:**
- Trang "Lịch sử Giao dịch" hiển thị toàn bộ giao dịch Credit của user
- Mỗi giao dịch hiển thị: thời gian (ngày giờ), loại (Nạp / Tiêu / Hoàn / Bonus), số Credit thay đổi (+ hoặc −), số dư sau giao dịch, ghi chú (tên phiên hoặc tên gói)
- Phân biệt màu sắc: màu xanh cho giao dịch cộng Credit (Nạp, Hoàn, Bonus), màu đỏ cho giao dịch trừ Credit (Tiêu)
- Filter theo loại: Tất cả / Nạp & Bonus / Tiêu / Hoàn
- Phân trang hoặc infinite scroll — không load toàn bộ lịch sử 1 lần

**Out:**
- Export lịch sử ra CSV/PDF (giai đoạn sau, dành cho power user hoặc kế toán)
- Filter theo khoảng thời gian tùy chọn (có thể bổ sung sau khi có data usage)
- Click vào giao dịch để xem chi tiết phiên/debrief (link sang trang debrief riêng)
- Lịch sử Order thanh toán chi tiết có hóa đơn VAT (dành cho B2B — giai đoạn C)
- Search tự do theo text

**Depends on:** 012, 013, 014, 015

**Blocks:** Không

## Business Flow

### Happy Path — Xem toàn bộ lịch sử

1. User nhấn vào số Credit trên header hoặc vào menu "Ví Credit" → mở trang Lịch sử Giao dịch
2. Đầu trang hiển thị số dư hiện tại nổi bật: "Số dư: 27 Credit"
3. Phía dưới là danh sách giao dịch, mới nhất lên trước:
   - "Hôm nay 14:32 — Tiêu 4 Credit — Behavioral Interview — Còn lại: 27 Credit" (màu đỏ, −4)
   - "Hôm nay 10:15 — Nạp 30 Credit — Gói Standard (129,000 VND) — Còn lại: 31 Credit" (màu xanh, +30)
   - "Hôm nay 09:58 — Tiêu 4 Credit — Behavioral Interview — Còn lại: 1 Credit" (màu đỏ, −4)
   - "3 ngày trước — Hoàn 8 Credit — System Design bị gián đoạn kỹ thuật — Còn lại: 5 Credit" (màu xanh, +8)
   - "7 ngày trước — Bonus 5 Credit — Quà tặng đăng ký — Còn lại: 5 Credit" (màu xanh, +5)
4. User cuộn xuống hết → tự động load thêm giao dịch cũ hơn

### Happy Path — Filter theo loại

1. User nhấn tab "Nạp & Bonus" → chỉ hiện giao dịch PURCHASE và BONUS, các loại khác ẩn đi
2. User nhấn tab "Tiêu" → chỉ hiện giao dịch SPEND
3. User nhấn tab "Hoàn" → chỉ hiện giao dịch REFUND
4. User nhấn tab "Tất cả" → quay lại hiện toàn bộ
5. Filter không xóa dữ liệu — chỉ thay đổi view

### Edge Cases & Business Rules

**User mới chỉ có 1 giao dịch (signup bonus):**
- Hiện đúng 1 dòng: "Bonus 5 Credit — Quà tặng đăng ký — Còn lại: 5 Credit"
- Không hiện trạng thái "trống" hay "chưa có giao dịch"

**Filter không có kết quả:**
- User filter "Hoàn" nhưng chưa có giao dịch hoàn nào → hiện "Chưa có giao dịch loại này"
- Không phải lỗi — đây là trạng thái hợp lệ

**Giao dịch đang pending (Order chưa thanh toán):**
- Order PENDING không hiển thị trong lịch sử
- Chỉ hiện khi Order chuyển sang PAID (PURCHASE) hoặc REFUNDED

**Tính nhất quán số dư:**
- Số dư sau mỗi giao dịch phải khớp hoàn toàn khi tính ngược từ đầu: tổng cộng tất cả (+) và trừ tất cả (−) = số dư hiện tại
- Đây là invariant bất biến — nếu không nhất quán thì lỗi nằm ở story 012/013/014/015, không phải ở story này

**Lịch sử có hàng trăm giao dịch:**
- Không load tất cả 1 lần — phân trang 20 giao dịch/lần hoặc infinite scroll
- Thứ tự luôn mới nhất lên trước

**Business Rules cứng:**
- Lịch sử là append-only — không thể xóa hay chỉnh sửa bất kỳ giao dịch nào
- Chỉ hiện giao dịch đã hoàn tất — không hiện pending, không hiện EXPIRED
- Dữ liệu giữ ít nhất 24 tháng kể từ ngày giao dịch
- Số dư hiển thị ở đầu trang phải khớp với số dư trên header (cùng nguồn dữ liệu)

## Acceptance Criteria

- Given user có 5 giao dịch gồm 1 Bonus, 1 Purchase, 2 Spend, 1 Refund, When user vào trang Lịch sử Giao dịch, Then cả 5 giao dịch hiển thị đầy đủ theo thứ tự mới nhất lên trước, mỗi dòng có loại giao dịch, số Credit thay đổi (+/−), và số dư sau giao dịch chính xác.

- Given user đang xem toàn bộ lịch sử và nhấn filter "Nạp & Bonus", When filter được áp dụng, Then chỉ hiện giao dịch loại PURCHASE và BONUS — các giao dịch SPEND và REFUND ẩn đi nhưng không bị xóa; nhấn "Tất cả" hiện lại đầy đủ.

- Given user có hơn 20 giao dịch và đang xem danh sách, When user cuộn đến cuối danh sách hiện tại, Then giao dịch cũ hơn được tải thêm tự động mà không cần reload trang.

- Given user nhấn filter "Hoàn" nhưng chưa từng có giao dịch hoàn nào, When filter được áp dụng, Then trang hiển thị thông báo "Chưa có giao dịch loại này" thay vì trang trắng hay lỗi.

- Given số dư hiện tại trên header là 27 Credit, When user vào trang Lịch sử Giao dịch, Then số dư hiển thị ở đầu trang cũng là 27 Credit và khớp chính xác với tổng cộng tất cả giao dịch trong lịch sử.
