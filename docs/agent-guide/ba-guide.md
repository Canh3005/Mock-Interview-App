# BA Guide

## 0. Ngôn ngữ artifact

Mọi `BA.md` trong `docs/features/` mặc định phải dùng tiếng Việt rõ ràng, dễ đọc. Chỉ giữ tiếng Anh cho tên tool, command, route, API contract, status kỹ thuật, exception gốc, field/code identifier, hoặc thuật ngữ cần đối chiếu trực tiếp.

## 1. Trước khi viết BA.md

Scan `docs/features/` để biết features đã có — tránh overlap hoặc duplicate scope.

Đọc `docs/agent-audits/INDEX.md` nếu tồn tại. Nếu có audit record áp dụng cho BA, product scope, user flow, acceptance criteria, hoặc domain hiện tại thì mở record đó trước khi viết BA.md. Không đọc toàn bộ audit records theo mặc định.

BA chịu trách nhiệm làm rõ **need, value, stakeholder, context, business rules, và outcome**. BA không thiết kế solution kỹ thuật và không viết handoff implementation.

**Đánh số folder:** Folder mới có dạng `docs/features/<NNN>-<feature-name>/` trong đó `NNN` là số thứ tự 3 chữ số. Lấy số lớn nhất hiện có rồi cộng 1. Nếu chưa có folder nào → bắt đầu từ `001`.

### Cổng làm rõ trước khi viết BA.md

Nếu yêu cầu của người dùng còn mơ hồ, quá rộng, có nhiều cách hiểu, hoặc thiếu ranh giới nghiệp vụ quan trọng, BA phải dừng ở bước làm rõ thay vì tự suy đoán rồi viết `BA.md`.

BA cần làm theo thứ tự:
1. Tóm tắt lại ý tưởng hiện tại theo cách hiểu của mình trong 2-4 câu.
2. Chỉ ra điểm còn mơ hồ hoặc có thể hiểu theo nhiều hướng, ví dụ người dùng chính, kết quả cuối, phạm vi, phụ thuộc, dữ liệu đầu vào, trạng thái sau cùng.
3. Hỏi tối đa **3 câu làm rõ** quan trọng nhất. Ưu tiên:
   - Ai là người dùng chính, ví dụ ứng viên, người phỏng vấn, quản trị viên?
   - Luồng kết thúc như thế nào, gồm kết quả, trạng thái, hoặc bước tiếp theo?
   - Tính năng này thuộc epic nào và phụ thuộc vào phần nào đã có?
4. Nếu đã có đủ cơ sở, đề xuất một phiên bản tính năng đã chỉnh lại để người dùng xác nhận trước khi tạo hoặc cập nhật `BA.md`.

Chỉ được viết `BA.md` khi tối thiểu đã rõ:
- Người dùng chính và người liên quan.
- Vấn đề cần giải quyết và giá trị nghiệp vụ.
- Kết quả cuối người dùng hoặc hệ thống nhận được.
- Phạm vi làm và không làm.
- Vị trí trong epic, phần phụ thuộc, và phần bị chặn nếu chưa làm.

Nếu sau tối đa 3 câu hỏi vẫn thiếu thông tin quyết định phạm vi, BA phải ghi rõ phần đang thiếu và chờ người dùng xác nhận. Không được lấp khoảng trống bằng quyết định kỹ thuật hoặc giả định âm thầm.

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

## 5. UI Boundary — BẮT BUỘC KHI FEATURE CÓ UI/UX

Nếu feature có bất kỳ phần nào người dùng nhìn thấy hoặc thao tác qua UI, BA.md phải có mục `## UI Boundary`. Áp dụng cả với:
- Luồng nhập/sửa dữ liệu.
- Màn kết quả chỉ đọc như scorecard, feedback, báo cáo, debrief, analytics summary.
- Trạng thái loading/error/empty/success mà người dùng nhìn thấy.

Mục này mô tả ranh giới trải nghiệm sản phẩm, không mô tả component, file, state store, API hay thư viện.

BA phải làm rõ:
- User nhìn thấy kết quả ở đâu trong flow: cùng màn hiện tại, modal, detail page, list row, report page, debrief page, v.v.
- Các trạng thái UI chính: chưa có dữ liệu, đang xử lý, thành công, thất bại, không đủ quyền, dữ liệu rỗng hoặc dữ liệu không đủ để kết luận.
- Nội dung nào phải hiển thị để user hoàn thành mục tiêu nghiệp vụ.
- Nội dung nào không được hiển thị vì thuộc rubric nội bộ, dữ liệu nhạy cảm, implementation detail, hoặc scope feature khác.
- Action tiếp theo mà user có thể làm: retry, sửa lại, gửi lại, quay về danh sách, mở chi tiết, bắt đầu bước tiếp theo.

Ví dụ tốt:
- "Feedback hiển thị trong trang question detail ngay dưới câu trả lời đã gửi; user thấy trạng thái đang xử lý, feedback sẵn sàng hoặc xử lý thất bại."
- "Candidate thấy signal coverage đã diễn giải, evidence quote và gợi ý cải thiện; không thấy raw rubric/scoring hints nội bộ."

Ví dụ xấu:
- "UI hiển thị response từ API."
- "Dùng component ScoreCard để render data."
- "Frontend gọi endpoint X rồi set state Y."

Nếu feature không có UI/UX hoặc user-visible output, có thể bỏ mục này.

---

## 6. Acceptance Criteria — BẮT BUỘC

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

## 7. Dependency Detection

Kiểm tra trước khi viết SCOPE:

- [ ] Feature cần data/entity từ feature nào chưa done? → Ghi vào `Depends on`
- [ ] Feature này thay đổi behavior của feature đang có? → Ghi rõ vào `SCOPE > Out`
- [ ] Feature này block feature nào phía sau trong epic? → Ghi vào `Blocks`

---

## 8. Risk Flag

Flag **HIGH** nếu có ít nhất 1 trong:
- Luồng AI với output không deterministic ảnh hưởng trực tiếp đến trải nghiệm candidate
- Real-time interaction (user thấy response ngay lập tức, không có loading)
- State machine phức tạp với nhiều transitions có thể conflict
- Concurrent action (nhiều user tác động lên cùng 1 resource)
- External dependency với SLA thấp hoặc quota giới hạn

Khi HIGH: thêm section `## Risk` — mô tả impact từ góc nhìn user nếu fail và mitigation 1 dòng.

---

## 9. BA Handoff Quality Gate

Trước khi báo BA.md done, tự kiểm tra:

- [ ] WHAT mô tả feature từ góc nhìn user, không phải từ góc nhìn API/database.
- [ ] WHY nói rõ vấn đề, giá trị, và feature unlock bước nào trong epic.
- [ ] SCOPE có In/Out/Depends on/Blocks rõ ràng.
- [ ] Business Flow có happy path, edge cases, business rules.
- [ ] Các bước nhập/sửa dữ liệu có expectation production rõ ràng; không để Dev tự suy ra bằng JSON/raw payload editor.
- [ ] Nếu feature có UI/UX hoặc user-visible output, có `## UI Boundary` mô tả user thấy gì, thấy ở đâu, các trạng thái chính, nội dung không được expose, và action tiếp theo.
- [ ] Acceptance Criteria đo được business outcome.
- [ ] Nếu input là overview/plan dài, đã tách thành các feature slice độc lập thay vì viết một BA.md quá rộng.
- [ ] Không có file estimate, endpoint, DTO, migration, component, hoặc implementation instruction.
- [ ] Nếu yêu cầu mơ hồ hoặc còn thiếu nghiệp vụ quan trọng, đã chạy cổng làm rõ: tóm tắt cách hiểu, nêu điểm chưa rõ, hỏi tối đa 3 câu, và chỉ viết BA.md sau khi phạm vi đã đủ rõ.

---

## 10. BA.md Output Format

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

## UI Boundary
[Chỉ thêm khi feature có UI/UX hoặc user-visible output: user thấy gì, ở đâu, trạng thái chính, không expose gì, action tiếp theo]

## Acceptance Criteria
- Given ... When ... Then ...
- Given ... When ... Then ...

## Risk (chỉ khi HIGH)
- [mô tả impact từ góc nhìn user nếu fail]
  Mitigation: [1 dòng]
```

> BA.md không có File Estimate. Delivery splitting và architectural decisions là việc của SA khi cần; implementation detail là việc của Dev.
> BA.md không chỉ định file, module, endpoint, DTO, migration, state store, component, hoặc thư viện cần sửa. Nếu cần ràng buộc kỹ thuật, để SA xử lý ở mức architecture boundary/contract trong HOW.md.
