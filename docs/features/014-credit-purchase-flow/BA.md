## WHAT

Khi muốn nạp thêm Credit, user vào trang mua Credit (hoặc được điều hướng từ thông báo thiếu Credit), xem các gói Credit với giá cả rõ ràng, chọn gói phù hợp với nhu cầu, rồi thanh toán qua MoMo hoặc VNPay. Sau khi thanh toán thành công, Credit tự động cộng vào ví ngay lập tức và user có thể dùng ngay để bắt đầu phiên — không cần reload, không cần chờ admin duyệt.

## WHY

Đây là điểm chuyển đổi từ Free user sang Paid user — điểm quan trọng nhất trong toàn bộ funnel doanh thu của nền tảng. Luồng thanh toán phải tối giản nhất có thể: ít click, rõ ràng về giá trị, không có rào cản kỹ thuật. Mỗi bước thừa trong luồng mua là một điểm rơi rụng conversion. Việc gợi ý gói phù hợp dựa trên Credit thiếu giúp user quyết định nhanh hơn thay vì phải so sánh thủ công.

## Epic Context

Thuộc **Epic 1 — Credit Wallet Core** + **Epic 2 — Payment Gateway Integration**. Đây là story duy nhất kết nối hệ thống Credit với cổng thanh toán thực tế.

- **Phụ thuộc vào:** 012 (Wallet phải tồn tại để có nơi cộng Credit), 013 (user được điều hướng đến đây sau khi bị chặn thiếu Credit)
- **Block:** 016 (Transaction History cần có data PURCHASE từ story này)
- **Ưu tiên gateway:** MoMo (P1 — penetration cao nhất B2C Việt Nam), VNPay (P2 — cần thiết cho doanh nghiệp)

## SCOPE

**In:**
- Trang "Nạp Credit" hiển thị 4 gói Credit với đầy đủ thông tin (tên gói, số Credit, giá VND, giá/Credit, badge ưu đãi)
- Gợi ý tự động gói phù hợp nhất khi user đến từ thông báo thiếu Credit (dựa trên số Credit còn thiếu)
- User chọn gói và phương thức thanh toán (MoMo hoặc VNPay)
- Redirect sang cổng thanh toán tương ứng
- Webhook từ MoMo/VNPay xác nhận thành công → tự động cộng Credit vào ví
- Toast thông báo thành công: "Đã nạp X Credit. Số dư: Y Credit."
- Bảo vệ chống duplicate: cùng một giao dịch không được cộng Credit 2 lần dù webhook đến nhiều lần

**Out:**
- Stripe / thanh toán quốc tế (giai đoạn sau)
- Chuyển khoản ngân hàng thủ công (dành cho B2B Enterprise)
- Subscription billing định kỳ (giai đoạn B)
- Refund tiền mặt (không hỗ trợ — Credit không hết hạn)
- Bonus Credit kèm gói (ví dụ "mua Standard tặng thêm 5 Credit bonus") — giai đoạn sau

**Depends on:** 012 (Wallet), 013 (Credit Gate tạo trigger mua)

**Blocks:** 016 (Transaction History)

### Bảng gói Credit

| Gói | Credit | Giá | Giá/Credit | Badge |
|---|---|---|---|---|
| Starter | 10 | 49,000 VND | 4,900 | — |
| Standard | 30 | 129,000 VND | 4,300 | "Phổ biến nhất" |
| Pro | 100 | 379,000 VND | 3,790 | "Tiết kiệm 23%" |
| Elite | 300 | 990,000 VND | 3,300 | "Tiết kiệm 33%" |

## Business Flow

### Happy Path — Từ thông báo thiếu Credit (luồng chuyển đổi chính)

1. User bị chặn khi bắt đầu System Design vì thiếu 5 Credit → nhấn "Nạp Credit" trong thông báo
2. Trang Nạp Credit mở ra, tự động highlight gói **Standard** (30 Credit — đủ để bù 5 Credit thiếu và còn dư nhiều) với ghi chú gợi ý: "Gợi ý cho bạn — đủ để bắt đầu System Design và còn dư 25 Credit"
3. User thấy 4 gói, so sánh và chọn "Mua Standard — 129,000 VND"
4. User chọn phương thức thanh toán: **MoMo**
5. Hệ thống tạo Order với trạng thái PENDING và sinh idempotency_key duy nhất
6. Hệ thống chuyển user sang MoMo (app MoMo hoặc QR web) để thanh toán
7. User xác nhận thanh toán trên MoMo — thao tác xảy ra hoàn toàn trong môi trường MoMo
8. MoMo gửi webhook về hệ thống: "Order X đã thanh toán thành công"
9. Hệ thống kiểm tra idempotency_key → chưa xử lý → cộng 30 Credit vào ví, cập nhật Order sang PAID, ghi giao dịch PURCHASE
10. Hệ thống gửi 200 response cho MoMo ngay lập tức (tránh MoMo retry)
11. User được redirect về ứng dụng → toast: "Đã nạp 30 Credit. Số dư: 33 Credit."
12. User tiếp tục nhấn bắt đầu System Design — lần này đủ Credit, phiên bắt đầu

### Happy Path — Tự vào trang Nạp Credit (không từ gate)

1. User vào từ menu "Ví Credit" hoặc từ header → trang Nạp Credit
2. Hiển thị đầy đủ 4 gói không có gợi ý đặc biệt, badge mặc định theo config
3. User chọn gói và thanh toán — luồng tương tự từ bước 3

### Happy Path — Thanh toán qua VNPay

- Luồng giống MoMo nhưng redirect sang cổng VNPay (web)
- VNPay hỗ trợ thêm: thẻ ATM nội địa, thẻ quốc tế (Visa/Mastercard)
- Webhook từ VNPay xử lý tương tự — idempotency bắt buộc

### Edge Cases & Business Rules

**User đóng MoMo giữa chừng không thanh toán:**
- Order giữ trạng thái PENDING
- Sau 15 phút không có webhook xác nhận → Order chuyển sang EXPIRED
- Credit không được cộng
- User quay lại app thấy thông báo: "Phiên thanh toán đã hết hạn. Vui lòng thử lại."

**MoMo gửi webhook nhiều lần (retry tự động):**
- Webhook lần 1 đến → xử lý thành công → Credit cộng 1 lần → trả 200
- Webhook lần 2 (retry) đến với cùng idempotency_key → đã xử lý → bỏ qua → vẫn trả 200 (tránh MoMo tiếp tục retry)
- Credit chỉ cộng đúng 1 lần trong mọi trường hợp

**Webhook đến nhưng bị delay > 5 phút:**
- User redirect về app sau khi thanh toán MoMo nhưng webhook chưa đến
- User thấy thông báo tạm: "Đang xác nhận thanh toán..."
- Khi webhook đến (dù muộn) → Credit vẫn được cộng đầy đủ → toast xuất hiện ngay
- Nếu sau 30 phút vẫn không có webhook → hiện thông báo: "Nếu bạn đã thanh toán thành công, Credit sẽ cập nhật trong tối đa 1 giờ. Liên hệ hỗ trợ nếu cần."

**Thanh toán thất bại (không đủ tiền MoMo, user hủy):**
- MoMo gửi webhook failure hoặc user redirect về với trạng thái failed
- Order chuyển sang FAILED
- Credit không cộng
- User thấy thông báo: "Thanh toán không thành công. Vui lòng kiểm tra tài khoản MoMo và thử lại."

**Stripe chargeback (rủi ro gian lận — note để xử lý sau):**
- Không áp dụng cho MoMo/VNPay trong giai đoạn này
- Credit chỉ cộng sau khi gateway xác nhận PAID — không cộng trước

**Business Rules cứng:**
- Credit chỉ cộng sau khi nhận webhook PAID từ gateway — KHÔNG cộng khi user redirect về dù URL có tham số "success"
- idempotency_key là bắt buộc cho mỗi Order — hệ thống phải kiểm tra trước khi credit
- Order PENDING timeout sau 15 phút → tự chuyển EXPIRED
- Không refund tiền mặt khi user mua Credit — Credit không hết hạn nên không có lý do refund
- Giá gói hiển thị theo bảng cố định — không thể thay đổi frontend-side

## Acceptance Criteria

- Given user bị chặn vì thiếu 5 Credit để bắt đầu System Design, When user vào trang Nạp Credit, Then gói Standard được tự động highlight/gợi ý với ghi chú giải thích tại sao gói đó phù hợp.

- Given user chọn gói Standard và thanh toán MoMo thành công, When MoMo gửi webhook xác nhận PAID, Then 30 Credit được cộng vào ví trong vòng 30 giây và user thấy toast "Đã nạp 30 Credit. Số dư: [số mới] Credit."

- Given MoMo gửi webhook xác nhận cho cùng 1 Order 3 lần liên tiếp (do retry), When webhook thứ 2 và 3 đến, Then Credit chỉ được cộng 1 lần duy nhất — hệ thống trả 200 cho cả 3 lần webhook nhưng chỉ xử lý lần đầu.

- Given user nhấn thanh toán MoMo nhưng không xác nhận và để qua 15 phút, When timeout xảy ra, Then Order chuyển sang EXPIRED và Credit không bị cộng — user thấy thông báo "Phiên thanh toán đã hết hạn" khi quay lại.

- Given user ở trang Nạp Credit từ menu thông thường (không phải từ gate thiếu Credit), When trang load, Then 4 gói hiển thị đầy đủ với giá, số Credit, badge ưu đãi — không có gợi ý đặc biệt nào.

## Risk

**HIGH** — Duplicate Credit do webhook retry từ payment gateway

- MoMo/VNPay tự động retry webhook nếu không nhận được 200 response → nếu server chậm reply → Credit cộng 2 lần
- **Impact:** Thất thoát Credit trực tiếp, mỗi lần gian lận có giá trị thực (129K–990K VND/gói)
- **Mitigation:** idempotency_key mandatory — check và mark "đã xử lý" trong cùng transaction trước khi credit; reply 200 ngay lập tức sau khi verify

**HIGH** — Credit không đến dù user đã thanh toán thành công

- Server fail sau khi MoMo confirm → webhook chưa được xử lý → user đã mất tiền nhưng chưa có Credit
- **Impact:** Mất trust trực tiếp, user phải liên hệ support → tốn nguồn lực, nguy cơ chargeback
- **Mitigation:** Webhook idempotent + retry queue — nếu handler fail thì queue retry trong 24 giờ; alert tự động nếu Order PAID > 5 phút mà chưa credit
