# Use Case Diagrams — Hệ thống giả lập phỏng vấn kỹ thuật

Render bằng PlantUML (plugin IDE, [plantuml.com](https://plantuml.com) hoặc [kroki.io](https://kroki.io)).

---

## UC00 — Tổng quan

```plantuml
@startuml UC00-TongQuan
left to right direction

actor "Ứng viên" as Candidate
actor "Quản trị viên" as Admin

rectangle "Hệ thống giả lập phỏng vấn kỹ thuật" {
  usecase "Đăng ký / Đăng nhập" as UC_Auth
  usecase "Quản lý hồ sơ cá nhân" as UC_Profile
  usecase "Thiết lập phiên phỏng vấn" as UC_Setup
  usecase "Thực hiện phỏng vấn hành vi" as UC_Behavioral
  usecase "Thực hiện phỏng vấn\nlive-coding" as UC_DSA
  usecase "Thực hiện phỏng vấn\nsystem design" as UC_SD
  usecase "Xem kết quả phỏng vấn" as UC_Result
  usecase "Duyệt ngân hàng câu hỏi" as UC_QBank
  usecase "Luyện tập câu hỏi đơn lẻ" as UC_Practice
  usecase "Quản lý ví Credit" as UC_Wallet
  usecase "Nạp Credit" as UC_BuyCredit

  usecase "Quản lý người dùng" as UC_AdminUsers
  usecase "Quản lý nội dung hệ thống" as UC_AdminContent
  usecase "Quản lý lợi nhuận & vận hành" as UC_AdminOps
}

Candidate -- UC_Auth
Candidate -- UC_Profile
Candidate -- UC_Setup
Candidate -- UC_Behavioral
Candidate -- UC_DSA
Candidate -- UC_SD
Candidate -- UC_Result
Candidate -- UC_QBank
Candidate -- UC_Practice
Candidate -- UC_Wallet
Candidate -- UC_BuyCredit

Admin -- UC_AdminUsers
Admin -- UC_AdminContent
Admin -- UC_AdminOps
@enduml
```

---

## UC01 — Xác thực & Hồ sơ cá nhân

```plantuml
@startuml UC01-XacThucHoSo
actor "Ứng viên" as Candidate
actor "GitHub" as GitHub

rectangle "Xác thực & Hồ sơ cá nhân" {
  usecase "Đăng ký tài khoản" as UC_Register
  usecase "Đăng nhập bằng email" as UC_LoginEmail
  usecase "Đăng ký / đăng nhập qua GitHub" as UC_LoginGH
  usecase "Tạo ví Credit" as UC_CreateWallet
  usecase "Xem & cập nhật hồ sơ" as UC_Profile
  usecase "Tải lên & phân tích CV" as UC_CV
}

Candidate -- UC_Register
Candidate -- UC_LoginEmail
Candidate -- UC_LoginGH
Candidate -- UC_Profile
Candidate -- UC_CV
GitHub -- UC_LoginGH

UC_Register ..> UC_CreateWallet : <<include>>

note right of UC_CreateWallet
  Tự động tặng 5 Credit khi
  đăng ký lần đầu
end note
@enduml
```

---

## UC02 — Thiết lập phiên phỏng vấn

```plantuml
@startuml UC02-ThietLapPhien
actor "Ứng viên" as Candidate

rectangle "Thiết lập phiên phỏng vấn" {
  usecase "Cấu hình phiên phỏng vấn" as UC_Config
  usecase "Khai báo thông tin\ntrước phiên hành vi" as UC_Intake
  usecase "Khởi động phiên phỏng vấn" as UC_Start
  usecase "Cấp quyền camera & micro" as UC_Permission
}

Candidate -- UC_Config
Candidate -- UC_Intake
Candidate -- UC_Start

UC_Intake ..> UC_Start : <<extend>>

note on link
  {chỉ loại Hành vi}
end note

UC_Permission ..> UC_Start : <<extend>>

note on link
  {chế độ Thực chiến}
end note

note right of UC_Config
  Loại: Hành vi / Live-coding / System Design
  Chế độ: Luyện tập / Thực chiến
  Thời lượng, Curveball (System Design)
end note

note right of UC_Start
  Hệ thống tự kiểm tra đủ Credit
  và trừ Credit khi khởi động phiên
end note
@enduml
```

---

## UC03 — Phỏng vấn hành vi

```plantuml
@startuml UC03-PVHanhVi
actor "Ứng viên" as Candidate

rectangle "Phỏng vấn hành vi" {
  usecase "Trả lời câu hỏi hành vi" as UC_Answer
  usecase "Nhận câu hỏi follow-up từ AI" as UC_FollowUp
  usecase "Xem kết quả & tiến độ hành vi" as UC_Score
}

Candidate -- UC_Answer
Candidate -- UC_Score

UC_Answer ..> UC_FollowUp : <<include>>

note right of UC_Answer
  {chế độ Thực chiến}
  Hệ thống tự giám sát camera, micro,
  eye tracking và dấu hiệu gian lận
end note
@enduml
```

---

## UC04 — Phỏng vấn Live-Coding (DSA)

```plantuml
@startuml UC04-PVLiveCoding
actor "Ứng viên" as Candidate

rectangle "Phỏng vấn Live-Coding (DSA)" {
  usecase "Xem đề bài lập trình" as UC_ViewProblem
  usecase "Viết & chạy code" as UC_Code
  usecase "Nhận gợi ý từ AI" as UC_Hint
  usecase "Nộp bài" as UC_Submit
  usecase "Xem kết quả chấm điểm" as UC_Result
}

Candidate -- UC_ViewProblem
Candidate -- UC_Code
Candidate -- UC_Hint
Candidate -- UC_Submit

UC_Submit ..> UC_Result : <<include>>

note right of UC_Hint
  TTS là tùy chọn trình bày âm thanh,
  không tách thành use case riêng
end note

note right of UC_Code
  {chế độ Thực chiến}
  Hệ thống tự giám sát camera, micro,
  tab switch và dấu hiệu gian lận
end note
@enduml
```

---

## UC05 — Phỏng vấn System Design

```plantuml
@startuml UC05-PVSystemDesign
actor "Ứng viên" as Candidate

rectangle "Phỏng vấn System Design" {
  usecase "Làm rõ yêu cầu bài toán" as UC_Clarify
  usecase "Vẽ kiến trúc hệ thống" as UC_Draw
  usecase "Trình bày & thảo luận thiết kế" as UC_Present
  usecase "Nhận câu hỏi phản biện từ AI" as UC_Challenge
  usecase "Xử lý tình huống curveball" as UC_Curveball
  usecase "Xem đánh giá & so sánh\nvới kiến trúc tham chiếu" as UC_Evaluate
}

Candidate -- UC_Clarify
Candidate -- UC_Draw
Candidate -- UC_Present
Candidate -- UC_Evaluate

UC_Present ..> UC_Challenge : <<include>>
UC_Curveball ..> UC_Present : <<extend>>

note on link
  {nếu bật Curveball}
end note

note right of UC_Draw
  Bao gồm hoàn tất/nộp bản thiết kế
  sau khi vẽ kiến trúc
end note
@enduml
```

---

## UC06 — Ngân hàng câu hỏi

```plantuml
@startuml UC06-NganHangCauHoi
actor "Ứng viên" as Candidate

rectangle "Ngân hàng câu hỏi" {
  usecase "Duyệt & tìm kiếm câu hỏi" as UC_Browse
  usecase "Xem chi tiết câu hỏi" as UC_Detail
  usecase "Luyện tập câu hỏi đơn lẻ" as UC_Practice
}

Candidate -- UC_Browse
Candidate -- UC_Detail
Candidate -- UC_Practice

note right of UC_Browse
  Bao gồm tìm kiếm và lọc theo
  role / level / loại câu hỏi

  Hỗ trợ đa ngôn ngữ:
  Tiếng Việt / English / 日本語
end note
@enduml
```

---

## UC07 — Ví Credit & Thanh toán

```plantuml
@startuml UC07-ViCreditThanhToan
actor "Ứng viên" as Candidate
actor "Cổng thanh toán MoMo" as MoMo
actor "Cổng thanh toán VNPay" as VNPay

rectangle "Ví Credit & Thanh toán" {
  usecase "Xem số dư & lịch sử ví" as UC_Wallet
  usecase "Nạp Credit" as UC_Buy
  usecase "Nhận hoàn Credit tự động" as UC_Refund
}

Candidate -- UC_Wallet
Candidate -- UC_Buy
Candidate -- UC_Refund
MoMo -- UC_Buy
VNPay -- UC_Buy

note right of UC_Buy
  Gói: Starter / Standard / Pro / Elite
  Phương thức: MoMo hoặc VNPay
  Bao gồm tạo đơn, chuyển hướng thanh toán
  và nhận xác nhận giao dịch
end note

note right of UC_Refund
  Tự động khi phiên bị lỗi
  không hoàn thành
end note
@enduml
```

---

## UC08 — Quản lý người dùng

```plantuml
@startuml UC08-QuanLyNguoiDung
actor "Quản trị viên" as Admin

rectangle "Quản lý người dùng" {
  usecase "Xem danh sách người dùng" as UC_List
  usecase "Xem chi tiết hồ sơ người dùng" as UC_Detail
  usecase "Quản lý tài khoản" as UC_Account
}

Admin -- UC_List
Admin -- UC_Detail
Admin -- UC_Account
@enduml
```

---

## UC09 — Quản lý nội dung hệ thống

```plantuml
@startuml UC09-QuanLyNoiDung
actor "Quản trị viên" as Admin

rectangle "Quản lý nội dung hệ thống" {
  usecase "Quản lý ngân hàng câu hỏi" as UC_Questions
  usecase "Quản lý đề bài lập trình" as UC_Problems
  usecase "Quản lý đề bài System Design" as UC_SDProblems
  usecase "Quản lý test case" as UC_TestCases
}

Admin -- UC_Questions
Admin -- UC_Problems
Admin -- UC_SDProblems
Admin -- UC_TestCases

note right of UC_Questions
  Tạo, sửa, xóa câu hỏi (probe)
  Duyệt nội dung theo ngôn ngữ
  Theo dõi chất lượng câu hỏi
end note

note right of UC_Problems
  Tạo, sửa, xóa đề bài lập trình
  Import đề bài hàng loạt
  Xác minh dữ liệu đề bài
end note

note right of UC_SDProblems
  Tạo, sửa, xóa đề bài
  Cấu hình metadata:
  domain, level, referenceArchitecture
  curveBallScenarios
end note

note right of UC_TestCases
  Tạo, sửa, xóa test case
  Liên kết với đề bài DSA
end note
@enduml
```

---

## UC10 — Quản lý lợi nhuận & vận hành

```plantuml
@startuml UC10-QuanLyLoiNhuanVanHanh
actor "Quản trị viên" as Admin

rectangle "Quản lý lợi nhuận & vận hành" {
  usecase "Xem thống kê doanh thu Credit" as UC_Revenue
  usecase "Theo dõi chi phí gọi LLM\ntheo model" as UC_LlmCost
  usecase "Phân tích câu hỏi\nđược lựa chọn nhiều" as UC_QuestionUsage
  usecase "Phân tích hình thức bài thi\nđược lựa chọn nhiều" as UC_ExamModeUsage
}

Admin -- UC_Revenue
Admin -- UC_LlmCost
Admin -- UC_QuestionUsage
Admin -- UC_ExamModeUsage

note right of UC_LlmCost
  Thống kê số lần gọi API LLM,
  model sử dụng và chi phí ước tính
end note

note right of UC_Revenue
  Theo dõi tiền thu được từ Credit
  và hiệu quả vận hành hệ thống
end note
@enduml
```
