## WHAT

Mỗi khi user muốn bắt đầu một phiên luyện tập (DSA Combat, Behavioral Interview, System Design, CV–JD Match), hệ thống kiểm tra số dư Credit của user trước khi cho phép. Nếu đủ Credit, Credit bị trừ ngay lập tức và phiên bắt đầu. Nếu không đủ, user bị chặn lại với thông báo rõ ràng về số Credit còn thiếu bao nhiêu và cần làm gì. Khi số dư sau khi trừ xuống thấp (dưới 5 Credit), hệ thống chủ động nhắc user nạp thêm để không bị gián đoạn ở phiên kế tiếp.

## WHY

Đây là cơ chế kiếm tiền cốt lõi của nền tảng — không có Credit Gate, user dùng thoải mái mà không trả tiền. Credit phải bị trừ **trước** khi phiên bắt đầu (không phải sau), vì nếu trừ sau thì không có cơ chế nào đảm bảo user không tắt app ngay khi phiên kết thúc. Cảnh báo thấp Credit giúp user chủ động nạp thêm trước khi hết hoàn toàn — tránh bị gián đoạn giữa lộ trình luyện tập, đồng thời tạo điểm trigger tự nhiên cho purchase flow.

## Epic Context

Thuộc **Epic 1 — Credit Wallet Core**. Story này là cổng kiểm soát giữa Wallet và toàn bộ hệ thống session hiện có.

- **Phụ thuộc vào:** 012 (Credit Wallet Core — phải có Wallet tồn tại và có số dư trước)
- **Block:** 014 (Purchase Flow) về mặt UX — user cần bị chặn tại đây để có lý do vào trang mua Credit
- **Tích hợp với:** Tất cả màn hình bắt đầu session (DSA Combat, Behavioral, System Design, CV–JD)

## SCOPE

**In:**
- Kiểm tra số dư Credit trước khi bắt đầu bất kỳ loại phiên nào
- Trừ Credit ngay khi xác nhận đủ (trừ trước, tạo session sau — không đảo ngược)
- Cập nhật số dư trên header ngay sau khi trừ (không cần reload)
- Thông báo chặn khi không đủ Credit: rõ cần bao nhiêu, còn bao nhiêu, thiếu bao nhiêu
- Nút "Nạp Credit" trong thông báo chặn — dẫn sang story 014
- Toast cảnh báo khi số dư sau khi trừ xuống dưới 5 Credit: "Bạn còn ít Credit, nạp thêm để không bị gián đoạn"

**Out:**
- Trang/màn hình mua Credit (→ story 014)
- Hoàn Credit khi phiên lỗi kỹ thuật (→ story 015)
- Logic tạo session AI (đã có ở các story session riêng)
- Deduct Credit theo subscription plan (giai đoạn B)
- Quản lý Credit theo campaign B2B (giai đoạn C)

**Depends on:** 012 (Credit Wallet Core)

**Blocks:** 014 (user cần bị chặn ở đây để có lý do mua Credit)

### Bảng chi phí Credit theo loại phiên

| Loại phiên | Credit cần |
|---|---|
| DSA Combat Session (30 phút) | 3 Credit |
| Behavioral Interview (45 phút) | 4 Credit |
| System Design Full Session | 8 Credit |
| CV–JD Match Analysis | 2 Credit |

## Business Flow

### Happy Path — Đủ Credit

1. User đang ở màn hình chọn loại phiên, nhấn "Bắt đầu Behavioral Interview" (cần 4 Credit)
2. Hệ thống kiểm tra: số dư hiện tại (ví dụ 10 Credit) ≥ 4 Credit → đủ điều kiện
3. Hệ thống trừ 4 Credit khỏi ví trong một thao tác nguyên tử — tạo giao dịch SPEND: "Behavioral Interview bắt đầu"
4. Số dư trên header cập nhật từ 10 → 6 Credit ngay lập tức
5. Phiên Behavioral Interview bắt đầu bình thường
6. Kiểm tra số dư còn lại sau khi trừ: 6 Credit ≥ 5 → không hiện cảnh báo

### Happy Path — Đủ Credit nhưng số dư thấp sau khi trừ

1. User có 6 Credit, nhấn "Bắt đầu DSA Combat" (cần 3 Credit)
2. Kiểm tra: 6 ≥ 3 → đủ, trừ 3 Credit → còn 3 Credit
3. Số dư header cập nhật về 3
4. Phiên bắt đầu bình thường
5. Toast xuất hiện: "Bạn còn 3 Credit. Nạp thêm để không bị gián đoạn phiên tiếp theo." kèm nút "Nạp Credit"
6. Toast tự đóng sau 5 giây hoặc user đóng thủ công — không block phiên đang chạy

### Happy Path — Chọn nhiều Round trong một phiên

1. User ở màn hình cấu hình phiên, chọn 3 round: DSA Combat (3 Credit) + Behavioral Interview (4 Credit) + System Design (8 Credit)
2. Hệ thống tính tổng: 3 + 4 + 8 = 15 Credit
3. Kiểm tra số dư (ví dụ 20 Credit) ≥ 15 Credit → đủ điều kiện
4. Hệ thống trừ 15 Credit trong một thao tác nguyên tử duy nhất — tạo 1 giao dịch SPEND: "Phiên 3 round (DSA + Behavioral + System Design)"
5. Số dư header cập nhật từ 20 → 5 Credit ngay lập tức
6. Toàn bộ phiên (tất cả các round) bắt đầu bình thường
7. Kiểm tra số dư còn lại: 5 Credit = ngưỡng cảnh báo → toast xuất hiện: "Bạn còn 5 Credit. Nạp thêm để không bị gián đoạn phiên tiếp theo."

### Happy Path — Không đủ Credit

1. User có 3 Credit, nhấn "Bắt đầu System Design" (cần 8 Credit)
2. Hệ thống kiểm tra: 3 < 8 → không đủ
3. Hệ thống KHÔNG tạo session, KHÔNG trừ Credit
4. Hiển thị thông báo chặn: "Bạn cần 8 Credit để bắt đầu System Design. Hiện có 3 Credit. Thiếu 5 Credit."
5. Thông báo có 2 nút: "Nạp Credit" (→ story 014) và "Đóng" (user có thể chọn không mua)
6. User nhấn "Đóng" → trở về màn hình chọn phiên, không có gì thay đổi

### Edge Cases & Business Rules

**Concurrent request (nhiều thiết bị/tab):**
- User mở 2 tab, cả 2 cùng nhấn bắt đầu phiên DSA (cần 3 Credit) trong khi ví có 3 Credit
- Chỉ 1 tab được trừ thành công, tab còn lại nhận thông báo "Không đủ Credit" — số dư chính xác sau thao tác đầu
- Không có trường hợp cả 2 cùng trừ thành công và số dư xuống âm

**Số dư vừa đúng (credit = giá phiên):**
- User có đúng 8 Credit, bắt đầu SD (cần 8 Credit) → đủ, trừ về 0
- Toast cảnh báo hiển thị: "Bạn đã hết Credit sau phiên này"
- Header hiển thị 0 Credit

**User đóng thông báo chặn và không mua:**
- Không có penalty, không tự redirect, user hoàn toàn tự do chọn không mua
- Lần sau user lại nhấn bắt đầu → kiểm tra lại như bình thường

**Phiên tạo thành công nhưng gặp lỗi ngay sau đó:**
- Credit đã trừ → story 015 (Auto Refund) xử lý việc hoàn Credit
- Story này chỉ chịu trách nhiệm deduction, không chịu trách nhiệm refund

**Toast cảnh báo thấp Credit không spam:**
- Toast chỉ hiện 1 lần sau mỗi lần trừ Credit thành công
- Không hiện lại cho đến lần trừ Credit tiếp theo

**Business Rules cứng:**
- Credit bị trừ TRƯỚC khi session tạo — không bao giờ đảo ngược thứ tự này
- Số dư Credit không bao giờ xuống âm — hệ thống chặn tuyệt đối
- Giá Credit của từng loại phiên là cố định — không có discount, không thỏa thuận
- Không cho phép "nợ" Credit dù user có lịch sử tốt

## Acceptance Criteria

- Given user có 10 Credit, When user nhấn bắt đầu Behavioral Interview (cần 4 Credit), Then 4 Credit bị trừ ngay lập tức, header hiển thị 6 Credit, và phiên bắt đầu — tất cả xảy ra trước khi bất kỳ câu hỏi AI nào xuất hiện.

- Given user có 3 Credit, When user cố bắt đầu System Design (cần 8 Credit), Then hệ thống chặn và hiển thị thông báo "Cần 8 Credit — Hiện có 3 Credit — Thiếu 5 Credit" kèm nút "Nạp Credit", và Credit không bị trừ.

- Given user có 6 Credit và vừa trừ 3 Credit để bắt đầu DSA (còn 3 Credit), When deduction thành công, Then toast "Bạn còn 3 Credit, nạp thêm để không bị gián đoạn" xuất hiện trong vòng 2 giây và header cập nhật về 3 ngay lập tức.

- Given user chọn 3 round (DSA 3 Credit + Behavioral 4 Credit + System Design 8 Credit) và có 20 Credit, When user xác nhận bắt đầu, Then hệ thống trừ tổng 15 Credit trong 1 giao dịch duy nhất, header hiển thị 5 Credit, toast cảnh báo thấp Credit xuất hiện, và toàn bộ 3 round bắt đầu.

- Given user chọn 2 round (DSA 3 Credit + System Design 8 Credit = 11 Credit) nhưng chỉ có 8 Credit, When user xác nhận bắt đầu, Then hệ thống chặn với thông báo "Cần 11 Credit — Hiện có 8 Credit — Thiếu 3 Credit", không trừ Credit, không tạo round nào.

- Given user mở 2 tab và cả 2 cùng nhấn bắt đầu DSA (cần 3 Credit) khi ví có 3 Credit, When cả 2 request cùng đến server, Then chỉ 1 phiên được tạo và Credit trừ đúng 1 lần — tab còn lại nhận thông báo "Không đủ Credit".

## Risk

**HIGH** — Race condition dẫn đến số dư âm

- 2 request song song cùng check-then-deduct → cả 2 thấy "đủ Credit" rồi cùng trừ → số dư âm
- **Impact:** User dùng Credit mà hệ thống không có đủ → thất thoát doanh thu trực tiếp, không có cách recover nếu không phát hiện sớm
- **Mitigation:** Deduction phải dùng atomic database transaction với pessimistic lock trên Wallet row — đảm bảo chỉ 1 transaction thành công tại một thời điểm
