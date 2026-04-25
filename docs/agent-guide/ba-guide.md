# BA Guide

## 1. Trước khi viết BA.md

Scan `docs/features/` để biết features đã có — tránh overlap hoặc duplicate scope.

**Đánh số folder:** Folder mới có dạng `docs/features/<NNN>-<feature-name>/` trong đó `NNN` là số thứ tự 3 chữ số (001, 002, ...). Lấy số lớn nhất hiện có trong `docs/features/` rồi cộng 1. Nếu chưa có folder nào → bắt đầu từ `001`.

Hỏi tối đa **3 câu clarify** nếu yêu cầu mơ hồ. Ưu tiên hỏi:
- User là ai (candidate, interviewer, admin)?
- Flow kết thúc như thế nào (score, report, next step)?
- Có phụ thuộc vào feature khác chưa done không?

---

## 2. Story Sizing — BẮT BUỘC

**1 story = 1 coding session = ≤10 files thay đổi.**

Ước tính file count trước khi viết:

| Loại thay đổi | File ước tính |
|---------------|---------------|
| CRUD đơn giản (BE only) | 4–5 files |
| Feature full-stack (BE + FE) | 7–9 files |
| Feature có AI integration | 9–12 files → thường cần split |
| Feature có real-time (SSE/WebSocket) | 10–14 files → phải split |

Nếu ước tính >10 → **split trước khi viết BA.md**.

---

## 3. Khi nào split — Trigger cụ thể

| Dấu hiệu | Cách split |
|----------|-----------|
| >2 user flow độc lập | Split theo từng flow |
| Cần DB schema mới VÀ business logic phức tạp | Story 1: schema + API skeleton. Story 2: business logic + FE |
| Có AI integration mới | Story 1: AI service + basic call. Story 2: evaluation logic + FE display |
| Có real-time channel mới (SSE/WebSocket) | Story 1: infra setup + echo endpoint. Story 2: business feature dùng channel |
| Feature phụ thuộc vào feature khác chưa done | Tách thành 2 story riêng có thứ tự rõ |

Nếu sau khi split vẫn >10 files → split tiếp.

---

## 4. Acceptance Criteria — BẮT BUỘC

Mỗi story ít nhất **2 acceptance criteria** theo format:

```
Given [trạng thái ban đầu]
When [hành động]
Then [kết quả mong đợi — đo được]
```

Ví dụ cho "system design interview round":
```
Given candidate đã vào phòng interview và AI đã load context
When AI gửi câu hỏi system design đầu tiên
Then câu hỏi hiển thị trong vòng 3 giây kèm rõ requirements và constraints

Given candidate submit câu trả lời
When AI hoàn thành đánh giá
Then hiển thị score theo 3 chiều: correctness / depth / communication, mỗi chiều có feedback text
```

Không viết acceptance criteria mơ hồ như "UI hiển thị đúng" hay "API trả về data".

---

## 5. Dependency Detection

Kiểm tra trước khi viết SCOPE:

- [ ] Cần DB table/column mới? → Story này phải done trước story dùng nó
- [ ] Cần service/API từ story khác chưa done? → Ghi vào `Depends on`
- [ ] Cần external integration mới (AI model, WebSocket, S3)? → Tách thành story riêng
- [ ] Thay đổi behavior của feature đang có? → Ghi rõ vào `SCOPE > Out`

---

## 6. Risk Flag

Flag **HIGH** nếu story có ít nhất 1 trong:
- AI integration với streaming response
- Real-time (WebSocket / SSE)
- State machine với >3 stages
- Concurrent write (nhiều user modify cùng 1 resource)
- External service có SLA thấp hoặc quota giới hạn

Khi HIGH: thêm section `## Risk` vào BA.md (xem format bên dưới).

---

## 7. BA.md Output Format

```
## WHAT
[Tính năng là gì, từ góc nhìn user — 2–4 câu]

## WHY
[Vấn đề đang xảy ra, tại sao cần làm]

## SCOPE
In:  [list cái gì được làm trong story này]
Out: [list cái gì KHÔNG làm — kể cả những thứ liên quan nhưng để story sau]
Depends on: [story/feature cần có trước — hoặc "none"]

## User Flow
[Step-by-step user tương tác thế nào]

## Acceptance Criteria
- Given ... When ... Then ...
- Given ... When ... Then ...

## Risk (chỉ khi HIGH)
- [mô tả risk] — impact nếu fail: [user impact]
  Mitigation: [1 dòng]

## File Estimate
Ước tính số file thay đổi: ~X / 10
[Nếu X > 10: "⚠ PHẢI SPLIT — xem stories bên dưới"]
```
