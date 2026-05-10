# BA Guide

## 0. Cổng kiểm tra ngôn ngữ artifact

Mọi `BA.md` trong `docs/features/` mặc định phải dùng tiếng Việt rõ ràng, dễ đọc. Chỉ giữ tiếng Anh cho tên tool, command, route, API contract, status kỹ thuật, exception gốc, field/code identifier, hoặc thuật ngữ cần đối chiếu trực tiếp.

Trước khi báo BA done, BA phải rà lại artifact và đổi các cụm tiếng Anh không cần thiết sang tiếng Việt. Ví dụ: viết "ứng viên" thay vì `candidate`, "luồng nghiệp vụ" thay vì `business flow` trong phần giải thích, "trạng thái rỗng" thay vì `empty state`, "bộ lọc" thay vì `filter`, trừ khi đang nói về tên field/API/code cụ thể.

## 1. Trước khi viết BA.md

Scan `docs/features/` để biết features đã có — tránh overlap hoặc duplicate scope.

Đọc `docs/agent-audits/INDEX.md` nếu tồn tại. Nếu có audit record áp dụng cho BA, product scope, user flow, acceptance criteria, hoặc domain hiện tại thì mở record đó trước khi viết BA.md. Không đọc toàn bộ audit records theo mặc định.

BA chịu trách nhiệm làm rõ **need, value, stakeholder, context, business rules, và outcome**. BA không thiết kế solution kỹ thuật và không viết handoff implementation.

**Đánh số folder:** Folder mới có dạng `docs/features/<NNN>-<feature-name>/` trong đó `NNN` là số thứ tự 3 chữ số. Lấy số lớn nhất hiện có rồi cộng 1. Nếu chưa có folder nào → bắt đầu từ `001`.

Hỏi tối đa **3 câu clarify** nếu yêu cầu mơ hồ. Ưu tiên:
- Ai là người dùng (candidate, interviewer, admin)?
- Flow kết thúc như thế nào (kết quả, trạng thái, bước tiếp)?
- Feature này thuộc epic nào? Phụ thuộc vào gì đã có chưa?

---

## 2. Khi input là plan/overview tổng quan

Nếu người dùng yêu cầu chạy BA cho một file plan/overview dài, roadmap, epic brief, hoặc tài liệu mô tả nhiều product surface, BA **không được** nhồi toàn bộ nội dung vào một `BA.md`.

Trước khi viết BA.md, BA phải tự tách overview thành các **feature slice vừa đủ, độc lập**, rồi viết `BA.md` riêng cho từng slice trong các folder khác nhau dưới `docs/features/`.

### Nhận diện overview cần tách

Xem input là overview tổng quan nếu có ít nhất 1 dấu hiệu:
- Nhiều user surface khác nhau, ví dụ public page, detail page, admin workflow, AI engine, analytics.
- Nhiều actor khác nhau, ví dụ candidate, admin/curator, interviewer, AI system.
- Nhiều outcome độc lập có thể release riêng.
- Tài liệu mô tả cả domain model, workflow, search/filter, scoring, analytics, curation, localization, hoặc integration trong cùng một file.

### Feature slicing rule

Mỗi feature slice nên:
- Có một primary actor rõ ràng.
- Tạo một business outcome cụ thể, đo được.
- Có happy path riêng và acceptance criteria riêng.
- Có thể được Dev/Review độc lập mà không cần đọc toàn bộ epic để hiểu story.
- Ghi rõ `Depends on` và `Blocks` thay vì gom dependency vào cùng một BA.md.

Không tách feature theo implementation layer như database/API/UI. Tách theo hành vi nghiệp vụ hoặc outcome người dùng nhìn thấy.

Ví dụ tách đúng:
- Candidate browse/search question bank.
- Candidate view question detail and start practice.
- AI engine selects interview probes from curated bank.
- Admin curates and publishes probes.
- Analytics tracks probe quality and practice outcome.

Ví dụ tách sai:
- Create tables for question bank.
- Build question bank APIs.
- Build question bank UI components.

### Quy trình khi chạy BA từ overview

1. Đọc overview và scan `docs/features/` để tránh trùng scope.
2. Lập feature breakdown ngắn: tên feature, actor, outcome, depends on, blocks.
3. Nếu overview đủ rõ và người dùng đã yêu cầu "chạy luồng BA" hoặc tương đương, tiếp tục tạo các folder feature và `BA.md` theo breakdown.
4. Nếu còn thiếu ranh giới nghiệp vụ quan trọng, hỏi tối đa 3 câu trước khi tạo nhiều `BA.md`.
5. Đánh số nhiều folder mới liên tiếp từ số lớn nhất hiện có + 1.

Mỗi `BA.md` được viết như một story độc lập, nhưng phần `Epic Context` phải nói rõ nó nằm ở đâu trong overview/epic tổng.

---

## 3. Epic Context — BẮT BUỘC

BA.md phải định vị feature trong epic của nó:
- Feature này giải quyết bước nào trong epic?
- Feature nào phải xong trước? Feature nào bị block nếu feature này chưa có?

Không viết BA.md mà không biết feature nằm ở đâu trong luồng lớn hơn.

---

## 4. Business Flow Analysis — TRỌNG TÂM

Đây là phần quan trọng nhất. BA phân tích luồng nghiệp vụ, không mô tả implementation.
BA phải làm rõ **WHY** và **WHAT** trước khi đi vào flow: vấn đề người dùng gặp là gì, feature này tạo ra outcome nào, và outcome đó unlock bước nào trong epic.

**Luồng chính (Happy Path):**
- Step-by-step từ góc nhìn user
- State thay đổi thế nào sau mỗi bước — dùng ngôn ngữ nghiệp vụ ("phiên chuyển sang trạng thái ACTIVE"), không dùng ngôn ngữ kỹ thuật ("update DB column")
- Kết quả cuối cùng user nhận được

**Production interaction expectation:**
- Với mỗi hành động người dùng nhập/sửa dữ liệu, BA phải mô tả kỳ vọng thao tác ở mức sản phẩm: người dùng chọn từ danh sách, điền form theo section, upload file, duyệt bảng, kéo thả, xác nhận modal, v.v.
- Không chấp nhận mô tả mơ hồ kiểu "admin nhập payload" nếu đây là production workflow.
- JSON/raw payload editor chỉ được xem là luồng production nếu người dùng yêu cầu rõ hoặc actor là technical operator nội bộ; nếu không, mặc định phải là UI có cấu trúc phù hợp với người dùng thật.

**Luồng ngoại lệ (Edge Cases):**
- Điều kiện boundary: không có data, data rỗng, timeout
- Business rule vi phạm: sai quyền, sai trạng thái, sai thứ tự
- Fallback behavior: hệ thống xử lý thế nào khi fail — từ góc nhìn user nhìn thấy gì

**Business Rules:**
- Điều kiện để action được phép (role, trạng thái hiện tại, quota)
- Validation từ góc nhìn nghiệp vụ — không phải DTO rule
- Constraints cứng (không thể vi phạm) vs mềm (có thể override)

---

## 5. Acceptance Criteria — BẮT BUỘC

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

## 6. Dependency Detection

Kiểm tra trước khi viết SCOPE:

- [ ] Feature cần data/entity từ feature nào chưa done? → Ghi vào `Depends on`
- [ ] Feature này thay đổi behavior của feature đang có? → Ghi rõ vào `SCOPE > Out`
- [ ] Feature này block feature nào phía sau trong epic? → Ghi vào `Blocks`

---

## 7. Risk Flag

Flag **HIGH** nếu có ít nhất 1 trong:
- Luồng AI với output không deterministic ảnh hưởng trực tiếp đến trải nghiệm candidate
- Real-time interaction (user thấy response ngay lập tức, không có loading)
- State machine phức tạp với nhiều transitions có thể conflict
- Concurrent action (nhiều user tác động lên cùng 1 resource)
- External dependency với SLA thấp hoặc quota giới hạn

Khi HIGH: thêm section `## Risk` — mô tả impact từ góc nhìn user nếu fail và mitigation 1 dòng.

---

## 8. BA Handoff Quality Gate

Trước khi báo BA.md done, tự kiểm tra:

- [ ] WHAT mô tả feature từ góc nhìn user, không phải từ góc nhìn API/database.
- [ ] WHY nói rõ vấn đề, giá trị, và feature unlock bước nào trong epic.
- [ ] SCOPE có In/Out/Depends on/Blocks rõ ràng.
- [ ] Business Flow có happy path, edge cases, business rules.
- [ ] Các bước nhập/sửa dữ liệu có expectation production rõ ràng; không để Dev tự suy ra bằng JSON/raw payload editor.
- [ ] Acceptance Criteria đo được business outcome.
- [ ] Nếu input là overview/plan dài, đã tách thành các feature slice độc lập thay vì viết một BA.md quá rộng.
- [ ] Không có file estimate, endpoint, DTO, migration, component, hoặc implementation instruction.
- [ ] Cổng kiểm tra ngôn ngữ artifact đã đạt: phần giải thích, luồng nghiệp vụ và acceptance criteria dùng tiếng Việt rõ ràng; tiếng Anh chỉ còn ở tên tool/command/route/API/status/field/code cần đối chiếu.
- [ ] Nếu còn thiếu nghiệp vụ quan trọng, đã hỏi clarify thay vì tự đoán.

---

## 9. BA.md Output Format

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

> BA.md không có File Estimate. Delivery splitting và architectural decisions là việc của SA khi cần; implementation detail là việc của Dev.
> BA.md không chỉ định file, module, endpoint, DTO, migration, state store, component, hoặc thư viện cần sửa. Nếu cần ràng buộc kỹ thuật, để SA xử lý ở mức architecture boundary/contract trong HOW.md.
