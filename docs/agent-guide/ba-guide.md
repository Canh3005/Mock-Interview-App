# BA Guide

## 1. Trước khi viết BA.md

Scan `docs/features/` để biết features đã có — tránh overlap hoặc duplicate scope.

**Đánh số folder:** Folder mới có dạng `docs/features/<NNN>-<feature-name>/` trong đó `NNN` là số thứ tự 3 chữ số. Lấy số lớn nhất hiện có rồi cộng 1. Nếu chưa có folder nào → bắt đầu từ `001`.

Hỏi tối đa **3 câu clarify** nếu yêu cầu mơ hồ. Ưu tiên:
- Ai là người dùng (candidate, interviewer, admin)?
- Flow kết thúc như thế nào (kết quả, trạng thái, bước tiếp)?
- Feature này thuộc epic nào? Phụ thuộc vào gì đã có chưa?

---

## 2. Epic Context — BẮT BUỘC

BA.md phải định vị feature trong epic của nó:
- Feature này giải quyết bước nào trong epic?
- Feature nào phải xong trước? Feature nào bị block nếu feature này chưa có?

Không viết BA.md mà không biết feature nằm ở đâu trong luồng lớn hơn.

---

## 3. Business Flow Analysis — TRỌNG TÂM

Đây là phần quan trọng nhất. BA phân tích luồng nghiệp vụ, không mô tả implementation.

**Luồng chính (Happy Path):**
- Step-by-step từ góc nhìn user
- State thay đổi thế nào sau mỗi bước — dùng ngôn ngữ nghiệp vụ ("phiên chuyển sang trạng thái ACTIVE"), không dùng ngôn ngữ kỹ thuật ("update DB column")
- Kết quả cuối cùng user nhận được

**Luồng ngoại lệ (Edge Cases):**
- Điều kiện boundary: không có data, data rỗng, timeout
- Business rule vi phạm: sai quyền, sai trạng thái, sai thứ tự
- Fallback behavior: hệ thống xử lý thế nào khi fail — từ góc nhìn user nhìn thấy gì

**Business Rules:**
- Điều kiện để action được phép (role, trạng thái hiện tại, quota)
- Validation từ góc nhìn nghiệp vụ — không phải DTO rule
- Constraints cứng (không thể vi phạm) vs mềm (có thể override)

---

## 4. Acceptance Criteria — BẮT BUỘC

Mỗi story ít nhất **2 acceptance criteria** theo format:

```
Given [trạng thái nghiệp vụ — ai đang ở đâu trong flow]
When [hành động của user hoặc trigger của hệ thống]
Then [kết quả đo được từ góc nhìn nghiệp vụ]
```

Acceptance criteria phải phản ánh **business outcome**, không phải technical response:
- Tốt: "Then ứng viên nhận score theo 3 chiều kèm feedback text"
- Xấu: "Then API trả về 200 với JSON có field score"
- Xấu: "Then UI hiển thị đúng"

---

## 5. Dependency Detection

Kiểm tra trước khi viết SCOPE:

- [ ] Feature cần data/entity từ feature nào chưa done? → Ghi vào `Depends on`
- [ ] Feature này thay đổi behavior của feature đang có? → Ghi rõ vào `SCOPE > Out`
- [ ] Feature này block feature nào phía sau trong epic? → Ghi vào `Blocks`

---

## 6. Risk Flag

Flag **HIGH** nếu có ít nhất 1 trong:
- Luồng AI với output không deterministic ảnh hưởng trực tiếp đến trải nghiệm candidate
- Real-time interaction (user thấy response ngay lập tức, không có loading)
- State machine phức tạp với nhiều transitions có thể conflict
- Concurrent action (nhiều user tác động lên cùng 1 resource)
- External dependency với SLA thấp hoặc quota giới hạn

Khi HIGH: thêm section `## Risk` — mô tả impact từ góc nhìn user nếu fail và mitigation 1 dòng.

---

## 7. BA.md Output Format

```
## WHAT
[Feature là gì — 2–4 câu từ góc nhìn user]

## WHY
[Vấn đề đang xảy ra, tại sao cần làm, feature này unlock gì cho epic phía sau]

## Epic Context
[Feature này thuộc epic nào, giải quyết bước nào, phụ thuộc vào gì trước, block gì sau]

## SCOPE
In:  [list behavior/tính năng được build]
Out: [list những thứ liên quan nhưng KHÔNG làm trong story này]
Depends on: [feature/story phải done trước — hoặc "none"]
Blocks: [feature/story bị block nếu story này chưa done — hoặc "none"]

## Business Flow

### Happy Path
[Step-by-step user flow, state transitions bằng ngôn ngữ nghiệp vụ, kết quả cuối]

### Edge Cases & Business Rules
[Boundary conditions, fallback behavior từ góc nhìn user, constraints]

## Acceptance Criteria
- Given ... When ... Then ...
- Given ... When ... Then ...

## Risk (chỉ khi HIGH)
- [mô tả impact từ góc nhìn user nếu fail]
  Mitigation: [1 dòng]
```

> BA.md không có File Estimate. Estimation, splitting, và implementation decisions là việc của SA.
