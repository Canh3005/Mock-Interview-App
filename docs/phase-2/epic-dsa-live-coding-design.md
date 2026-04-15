# Thiết kế Vòng DSA & Live Coding — WHAT & WHY

> **Tài liệu thảo luận sản phẩm** — Chưa phải Epic triển khai kỹ thuật.
> Mục tiêu: Xác định rõ những gì cần xây dựng (WHAT) và lý do (WHY) để tạo trải nghiệm sát với phỏng vấn Live Coding thực tế nhất có thể, cho cả **Practice Mode** và **Combat Mode**.

---

## Bối cảnh: Phỏng vấn Live Coding thực tế trông như thế nào?

Trước khi định nghĩa WHAT, cần đồng thuận về "thật" là gì:

- Phỏng vấn 1:1 — một interviewer, một ứng viên.
- Interviewer quan sát ứng viên code **realtime**, đặt câu hỏi **bất kỳ lúc nào**.
- Không phải contest — không phải ai submit nhanh nhất thắng. Đây là **quá trình tư duy được chấm điểm**.
- Bài toán thường có nhiều tầng: brute force → optimize → edge case → scale.
- Ứng viên được kỳ vọng **nói ra suy nghĩ** (think aloud) thay vì im lặng code.
- Kết thúc có **debrief** — interviewer nói thẳng điểm mạnh/yếu, không chỉ pass/fail.

---

## Phần 1: Trước khi vào phòng thi

### WHAT 1.1 — Bộ đề DSA phân loại theo độ khó + tag thuật toán

Mỗi bài trong ngân hàng đề có:

- **`difficulty`**: `EASY` / `MEDIUM` / `HARD` — thời gian chuẩn tương ứng 20/35/50 phút.
- **`tags`**: Một hoặc nhiều tag thuật toán — e.g. `["two-pointer", "array"]`, `["BFS", "graph"]`, `["dp", "memoization"]`. Tag đóng vai trò phân loại chủ đề và là nguồn dữ liệu để AI tham chiếu khi sinh câu hỏi follow-up và debrief.
- **Test case nhỏ (visible)**: Input nhỏ (`n ≤ 100`) — ứng viên thấy được, dùng để verify logic cơ bản.
- **Test case lớn (hidden)**: Input lớn (`n = 10⁵` trở lên, `isHidden: true`) — ứng viên không thấy input, brute force sẽ TLE tự nhiên.
- **`timeLimitMs`** được set chặt theo approach tối ưu — brute force O(n²) sẽ không pass test case lớn.

Không có metadata tầng riêng biệt, không có "unlock" thủ công. Cơ chế **TLE tự nhiên** buộc ứng viên phải optimize, giống cách LeetCode, Codeforces vận hành.

**WHY:** Việc tách "tầng" thành metadata riêng tạo ra overhead lớn khi tạo đề mà không mang lại thêm thông tin so với một bộ test case được thiết kế đúng. Time limit + hidden test case lớn là cơ chế đã được kiểm chứng ở quy mô lớn. Tags thay thế `expected_approach` vì mỗi bài đã được gắn tag thuật toán — không cần trường riêng.

---

### WHAT 1.2 — Think Aloud trước khi code

Khi bài được load ra, ứng viên **không được code ngay**. Có một bước bắt buộc:

1. Đọc đề (read-only, 2 phút).
2. Ghi ra approach trong một **Approach Box** (text area riêng, không phải comment trong code):
   - Họ định dùng thuật toán gì?
   - Độ phức tạp ước tính là bao nhiêu?
   - Edge case nào họ đã nhận ra?
3. Sau khi submit Approach Box, mới mở khóa Code Editor.

**WHY:** Đây là điểm phân biệt rõ nhất ứng viên giỏi và ứng viên "code may". Trong phỏng vấn thật, interviewer sẽ hỏi "bạn có plan gì không?" trước khi cho code. Nếu ứng viên ngồi im 15 phút rồi ra một đáp án, interviewer không biết gì về tư duy — và đó là tín hiệu xấu.

Ngoài ra, Approach Box trở thành một **nguồn dữ liệu chấm điểm độc lập** — AI có thể đối chiếu những gì ứng viên nói với những gì họ thực sự code, phát hiện sự không nhất quán.

---

## Phần 2: Trong khi code

### WHAT 2.1 — IDE đủ thật, không quá tiện lợi

Code Editor (Monaco) có:
- Syntax highlighting.
- Indentation tự động.
- Nút "Run" với các test case được cung cấp sẵn (không phải tự viết).

Code Editor **không có**:
- Autocomplete / Intellisense.
- Inline error gợi ý thuật toán (vd không có "Có thể dùng HashMap").
- Expected output ghi sẵn trong UI.

**WHY:** Mục tiêu không phải là giúp ứng viên code dễ hơn — mà là đánh giá đúng năng lực. Autocomplete mạnh sẽ giúp ứng viên vượt qua bài mà không thực sự hiểu. Trong phỏng vấn thật, môi trường (CoderPad, Google Doc, hay thậm chí whiteboard) không có những tiện ích này.

Test case được cung cấp sẵn vì viết test case là một kỹ năng riêng — không phải mục tiêu của vòng DSA này. Việc tự viết test case trong một session timed sẽ làm loãng trọng tâm đánh giá.

---

### WHAT 2.2 — Timer có trọng lượng

- **Practice Mode**: Timer đếm lên — ứng viên thấy mình mất bao lâu, không có áp lực.
- **Combat Mode**: Timer đếm ngược — thời hạn rõ ràng, có cảnh báo visual khi còn 5 phút, còn 1 phút.

Thời gian trung bình chuẩn theo độ khó:
- Easy: 20 phút
- Medium: 35 phút
- Hard: 50 phút

**WHY:** Trong phỏng vấn thật, thời gian là một chiều đánh giá ngầm. Interviewer không nói thẳng "bạn chậm quá" nhưng luôn theo dõi. Combat Mode cần áp lực thật để mô phỏng đúng cảm giác này. Practice Mode ngược lại — mục tiêu là học, không cần áp lực thời gian.

---

### WHAT 2.3 — AI Interviewer: hỏi đúng lúc, không hỏi liên tục

AI Interviewer không chủ động ngắt realtime theo từng keystroke. Thay vào đó, AI được trigger theo **2 sự kiện cụ thể**:

**Sự kiện A — Ứng viên bấm "Run" và nhận kết quả TLE trên test case lớn:**
AI tự động gửi một câu hỏi follow-up, ví dụ:
> *"Solution của bạn pass được test case nhỏ nhưng TLE ở input lớn. Bạn ước tính complexity hiện tại là bao nhiêu? Có hướng nào để tối ưu không?"*

AI tham chiếu `tags` của bài để gợi ý đúng hướng mà không tiết lộ thẳng đáp án.

**Sự kiện B — Ứng viên im lặng > 5 phút (không gõ phím, không tương tác):**
AI gửi một câu gợi ý nhẹ, không tiết lộ đáp án:
> *"Bạn đang bị stuck ở đâu? Thử mô tả cho tôi bạn đang nghĩ gì."*

AI **không** ngắt vào giữa khi ứng viên đang gõ code bình thường.

**WHY:** AI ngắt realtime theo từng keystroke là không thực tế về mặt kỹ thuật (latency, UX) và gây phiền nhiễu. Tuy nhiên, không có AI nào hết thì thiếu đi yếu tố "interviewer quan sát" — mất đi cảm giác 1:1. Hai trigger trên là những thời điểm interviewer thật sự sẽ nói chuyện trong một phỏng vấn thật: sau khi ứng viên có giải pháp đầu tiên, hoặc khi thấy ứng viên bị stuck.

---

### WHAT 2.4 — Luồng tiến độ tự nhiên qua TLE

Bài toán hiển thị đầy đủ từ đầu. Tiến độ được xác định bởi kết quả chạy:

1. Ứng viên đọc đề → code → bấm "Run".
2. **Pass tất cả test case (kể cả lớn)** → hoàn thành bài, AI sinh debrief.
3. **Pass test case nhỏ nhưng TLE test case lớn** → AI hỏi follow-up về optimization (WHAT 2.3), ứng viên tiếp tục tối ưu.

Không có cơ chế "unlock" thủ công. Không có tầng 3 riêng. Việc pass hay không pass test case lớn là tín hiệu duy nhất phân biệt brute force với optimal solution.

**WHY:** Cơ chế unlock nhiều tầng thêm complexity UI và logic backend mà không cần thiết. TLE là tín hiệu rõ ràng và quen thuộc với mọi ứng viên — không cần giải thích thêm. Debrief sau khi kết thúc sẽ phân tích complexity và so sánh với optimal, thay thế vai trò "tầng 3".

---

## Phần 3: Sau khi kết thúc

### WHAT 3.1 — Debrief như Interviewer thật

Sau khi session kết thúc (submit hoặc hết giờ), hệ thống sinh ra một **Debrief Report** — không phải chỉ điểm số.

Debrief gồm 5 phần:

1. **Approach Verdict**: So sánh Approach Box ứng viên ghi ban đầu với code thực tế — họ có đi theo plan không? Có pivot không?
2. **Complexity Analysis**: Time và space complexity của code submit so với optimal solution.
3. **Điểm stuck**: Hệ thống nhận biết khoảng thời gian nào ứng viên bị stuck (idle > 5 phút) và note lại.
4. **Follow-up Performance**: Trả lời câu hỏi follow-up của AI (tầng 2, tầng 3) như thế nào.
5. **Actionable Suggestion**: 1-2 câu gợi ý cụ thể — không phải lời động viên chung chung.

Ví dụ Debrief output:
```
Approach của bạn: Two pointers — đúng hướng, được thực thi tốt.
Complexity: O(n) time, O(1) space — tối ưu.
Điểm stuck: Bạn mất ~8 phút ở bước xử lý edge case mảng rỗng.
Follow-up: Bạn chưa trả lời được câu hỏi về distributed dataset.
Gợi ý: Tìm hiểu về external merge sort và consistent hashing để handle distributed input.
```

**WHY:** Điểm số không dạy được gì. Trong phỏng vấn thật, feedback từ interviewer (dù informal) là thứ ứng viên nhớ và học từ. Debrief có chất lượng cao là lý do ứng viên quay lại dùng platform, vì họ cảm thấy tiến bộ sau mỗi session.

---

### WHAT 3.2 — Solution Walkthrough sau khi submit

Sau khi xem Debrief, ứng viên có thể mở **Solution Walkthrough**:

- Hiển thị solution mẫu (tầng 1 + tầng 2) với **inline comment giải thích từng bước**.
- Diff view giữa code ứng viên submit và solution mẫu.
- Video/text explanation ngắn về "tại sao approach này là optimal".

**Practice Mode**: Mở ngay sau khi submit.  
**Combat Mode**: Khóa đến sau khi kết quả được công bố (tránh leak đề).

**WHY:** Học từ solution sau khi tự giải là cách học hiệu quả nhất (spaced repetition + context). Nếu ứng viên chưa giải được, xem solution có ít giá trị hơn — nhưng vẫn cung cấp vì học còn hơn không.

---

## Bảng tóm tắt WHAT theo Mode

| # | WHAT | Practice Mode | Combat Mode |
|---|------|:---:|:---:|
| 1.1 | Đề có difficulty + tags + hidden test case lớn (TLE tự nhiên) | ✅ | ✅ |
| 1.2 | Think Aloud / Approach Box bắt buộc | ✅ | ✅ |
| 2.1 | IDE không autocomplete, test case có sẵn | ✅ | ✅ |
| 2.2 | Timer đếm lên (không áp lực) | ✅ | ❌ |
| 2.2 | Timer đếm ngược + cảnh báo sắp hết giờ | ❌ | ✅ |
| 2.3 | AI hỏi follow-up sau khi TLE test case lớn | ✅ | ✅ |
| 2.3 | AI gợi ý nhẹ khi ứng viên idle > 5 phút | ✅ | ✅ (không tiết lộ approach) |
| 2.4 | Tiến độ tự nhiên qua TLE, không unlock thủ công | ✅ | ✅ |
| 3.1 | Debrief Report chi tiết | ✅ | ✅ (sau khi kết quả công bố) |
| 3.2 | Solution Walkthrough + Diff view | ✅ (ngay) | ✅ (sau kết quả) |
| 2.3 | CoT Live Feedback (hint về chất lượng approach) | ✅ | ❌ |

---

## Những gì KHÔNG làm — và lý do

| Không làm | Lý do |
|-----------|-------|
| Hiển thị tiến độ đối thủ realtime | Platform hướng đến phỏng vấn 1:1, không phải contest. Tiến độ đối thủ tạo ra hành vi sai (rush thay vì think) |
| AI ngắt vào realtime theo từng keystroke | Kỹ thuật không khả thi (latency), UX gây khó chịu, không mô phỏng interviewer thật |
| Ứng viên tự viết test case | Viết test case là kỹ năng riêng, không phải mục tiêu của vòng DSA. Tạo ra cognitive load thừa trong session timed |
| Autocomplete / Intellisense trong IDE | Giảm tín hiệu đánh giá, không phản ánh năng lực thực sự |
