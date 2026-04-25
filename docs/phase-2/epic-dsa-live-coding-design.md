# Thiết kế Vòng DSA & Live Coding — WHAT & WHY

> **Tài liệu thảo luận sản phẩm** — Chưa phải Epic triển khai kỹ thuật.
> Mục tiêu: Xác định rõ những gì cần xây dựng (WHAT) và lý do (WHY) để tạo trải nghiệm sát với phỏng vấn Live Coding thực tế nhất có thể.
>
> **Scope hiện tại: Practice Mode.** Combat Mode sẽ mở rộng về sau (camera, eye tracking, expression analysis, anti-cheat protocol) — thiết kế Practice Mode phải đảm bảo extensible cho hướng đó mà không cần refactor lớn.

---

## Bối cảnh: Phỏng vấn Live Coding thực tế trông như thế nào?

Trước khi định nghĩa WHAT, cần đồng thuận về "thật" là gì:

- Phỏng vấn 1:1 — một interviewer, một ứng viên.
- Không phải contest — không phải ai submit nhanh nhất thắng. Đây là **quá trình tư duy được chấm điểm**.
- Ứng viên được kỳ vọng **nói ra suy nghĩ** (think aloud) thay vì im lặng code.
- Kết thúc có **debrief** — interviewer nói thẳng điểm mạnh/yếu, không chỉ pass/fail.

---

## Phần 0: Bắt đầu phiên phỏng vấn

### WHAT 0.1 — Chọn cấu hình phiên trước khi vào

Từ màn hình chọn route, ứng viên chọn **Live Coding Session** và cấu hình qua modal:

- **Số lượng problem**: Dropdown chọn 1 / 2 / 3 bài cho phiên đó.
- **Độ khó**: EASY / MEDIUM / HARD — hệ thống random chọn bài từ ngân hàng đề theo độ khó được cá nhân hóa theo CV.

Sau khi xác nhận, hệ thống tạo session với danh sách problem cố định cho toàn phiên.

**WHY:** Phỏng vấn thật thường có 1–2 bài trong 45–60 phút. Cho ứng viên kiểm soát số lượng bài giúp họ tự điều chỉnh độ khó của phiên luyện tập theo mục tiêu của mình. Random selection tránh việc ứng viên cherry-pick bài dễ.

---

### WHAT 0.2 — Luồng chuyển tiếp giữa các round trong một phiên phỏng vấn

Khi ứng viên bắt đầu một phiên phỏng vấn có **nhiều round** (ví dụ: Behavioral + Live Coding), hệ thống điều phối toàn bộ luồng tự động — ứng viên không cần quay lại màn hình chọn.

#### Thứ tự round và điều kiện chuyển tiếp

```
[Behavioral Round]  ──kết thúc──►  [Live Coding Round]  ──kết thúc──►  [Bảng điểm tổng hợp]
```

- **Khi Behavioral kết thúc** (ứng viên nhấn kết thúc hoặc hết thời gian): Nếu cấu hình phiên có Live Coding Round → hệ thống tự động chuyển sang màn hình Live Coding mà không cần ứng viên điều hướng thủ công. Không hiển thị điểm Behavioral ở thời điểm này.
- **Khi Live Coding kết thúc** (đã Submit problem cuối cùng hoặc hết giờ toàn session): Hệ thống chuyển sang **Bảng điểm tổng hợp** hiển thị kết quả của tất cả round trong phiên.

#### Màn hình chuyển tiếp (transition screen)

Giữa hai round có một màn hình chuyển tiếp ngắn (~3 giây, hoặc ứng viên nhấn "Tiếp tục") với nội dung:
- Tên round tiếp theo.
- Gợi nhắc ngắn về format (vd. "Tiếp theo: Live Coding — bạn sẽ giải [N] bài DSA").
- Không hiển thị điểm round trước — tránh distract tâm lý.

#### Bảng điểm tổng hợp (combined scoring)

Bảng điểm tổng hợp hiển thị **sau khi toàn bộ phiên phỏng vấn kết thúc**, gồm:
- Điểm và Grade Band từng round riêng lẻ.
- Điểm tổng phiên = trung bình có trọng số (Behavioral và Live Coding có trọng số bằng nhau theo mặc định, có thể cấu hình).
- Debrief tổng hợp: nhận xét xuyên suốt hai round nếu AI nhận ra pattern (vd. "Approach Box của bạn trong DSA round thiếu edge case, tương tự điểm yếu về structured thinking trong Behavioral round").

**WHY:** Ứng viên không nên phải điều hướng thủ công giữa các round — sự gián đoạn phá vỡ trạng thái tập trung giống phỏng vấn thật. Ẩn điểm round trước khi chuyển tiếp tránh hiệu ứng tâm lý (điểm thấp gây hoảng loạn, điểm cao gây chủ quan). Bảng điểm tổng hợp chỉ có nghĩa sau khi tất cả round hoàn thành — hiển thị sớm là thông tin thiếu context.

---

## Phần 1: Trước khi vào phòng thi

### WHAT 1.1 — Bộ đề DSA phân loại theo độ khó + tag thuật toán

Mỗi bài trong ngân hàng đề có:

- **`difficulty`**: `EASY` / `MEDIUM` / `HARD` — thời gian chuẩn tương ứng 20/35/50 phút.
- **`tags`**: Một hoặc nhiều tag thuật toán — e.g. `["two-pointer", "array"]`, `["BFS", "graph"]`, `["dp", "memoization"]`. Tag là nguồn dữ liệu để AI tham chiếu khi sinh Actionable Suggestion trong debrief.
- **`language`**: Ngôn ngữ lập trình xác định tại problem — problem có template cho ngôn ngữ nào thì session dùng ngôn ngữ đó. Không có language selector trong session.
- **`codeTemplate`**: Starter code theo ngôn ngữ — function signature, input parsing sẵn.
- **`optimalTimeComplexity`** / **`optimalSpaceComplexity`**: Chuẩn tối ưu để Scoring Engine đối chiếu — do người tạo đề nhập và validate.
- **Test case visible**: Input nhỏ (`n ≤ 100`) — ứng viên thấy cả **input lẫn expected output**, dùng để verify logic cơ bản.
- **Test case hidden**: Input lớn (`n = 10⁵` trở lên) — ứng viên chỉ thấy **pass/fail**, không thấy input hay expected output. Brute force sẽ TLE tự nhiên.
- **`timeLimitMs`**: Set chặt theo approach tối ưu — brute force O(n²) sẽ không pass hidden test case.

**WHY:** Language được bind vào problem thay vì để user chọn vì mỗi bài có template và test case được thiết kế cho một ngôn ngữ cụ thể — cho phép chọn ngôn ngữ tự do sẽ phá vỡ time limit (Python vs Go có độ trễ khác nhau hoàn toàn). Hidden test case + TLE tự nhiên là cơ chế đã được kiểm chứng ở quy mô lớn, không cần thêm metadata "tầng".

---

### WHAT 1.2 — Think Aloud trước khi code

Khi bài được load ra, ứng viên **không được code ngay**. Có một bước bắt buộc:

1. Đọc đề (read-only, 2 phút — gợi ý, không hard-stop).
2. Ghi ra approach trong một **Approach Box** (text area riêng, không phải comment trong code):
   - Họ định dùng thuật toán gì?
   - Độ phức tạp ước tính là bao nhiêu?
   - Edge case nào họ đã nhận ra?
3. Sau khi submit Approach Box, mới mở khóa Code Editor.

Approach Box **không bị lock** sau khi submit — ứng viên có thể quay lại chỉnh sửa trong suốt quá trình code nếu họ pivot approach. AI sẽ đọc nội dung Approach Box **tại thời điểm session kết thúc** để đối chiếu với code.

**Timer bắt đầu khi Code Editor mở** — thời gian đọc đề và viết Approach Box không tính vào `timeUsedMs`.

**WHY:** Đây là điểm phân biệt rõ nhất ứng viên giỏi và ứng viên "code may". Trong phỏng vấn thật, interviewer sẽ hỏi "bạn có plan gì không?" trước khi cho code. Approach Box trở thành **nguồn dữ liệu chấm điểm độc lập** — AI đối chiếu những gì ứng viên nói với những gì họ thực sự code. Không lock sau submit vì pivot approach giữa chừng là hành vi tốt, cần được ghi nhận chứ không bị phạt.

---

## Phần 2: Trong khi code

### WHAT 2.1 — IDE đủ thật, không quá tiện lợi

Code Editor (Monaco) có:
- Syntax highlighting.
- Indentation tự động.
- Nút **"Run"** — chạy toàn bộ visible test case (hiển thị input + actual output + expected output) và hidden test case (chỉ báo pass/fail). Mỗi lần Run chạy cả hai loại.
- Nút **"Submit"** — chạy lại toàn bộ visible + hidden, ghi nhận kết quả chính thức, kết thúc lượt tính điểm cho problem đó. **Chỉ được Submit 1 lần.**

Code Editor **không có**:
- Autocomplete / Intellisense.
- Inline error gợi ý thuật toán.

**Giới hạn Run: tối đa 20 lần** mỗi problem. Số lần Run thực tế được ghi nhận và đưa vào Scoring Engine. Sau khi hết 20 lần Run mà chưa Submit, nút Run bị disable — ứng viên phải Submit hoặc hết giờ.

**WHY:** Autocomplete mạnh giúp ứng viên vượt qua bài mà không thực sự hiểu — không phải mục tiêu. Visible test case hiển thị expected output để ứng viên biết đang sai ở đâu, đây là feedback tối thiểu cần thiết. Hidden test case chỉ báo pass/fail để simulate áp lực "không biết input lớn là gì". Giới hạn Run phản ánh thực tế phỏng vấn — ứng viên không thể brute-force thử từng edge case mà phải suy nghĩ trước khi chạy.

---

### WHAT 2.2 — Timer có trọng lượng

- **Practice Mode**: Timer đếm lên — ứng viên thấy mình mất bao lâu. Có hiển thị mốc chuẩn theo độ khó (vd. "Chuẩn: 35 phút") như reference, không hard-stop.
- **Combat Mode** *(mở rộng về sau)*: Timer đếm ngược — thời hạn rõ ràng, cảnh báo visual khi còn 5 phút, còn 1 phút. Khi hết giờ tự động Submit với code hiện tại.

Thời gian chuẩn theo độ khó:
- Easy: 20 phút
- Medium: 30 phút
- Hard: 40 phút

Điểm số được lưu vào hồ sơ ứng viên sau mỗi session (kể cả Practice Mode).

**WHY:** Trong phỏng vấn thật, thời gian là chiều đánh giá ngầm. Practice Mode không hard-stop nhưng vẫn lưu điểm — ứng viên tự chịu trách nhiệm về time efficiency của mình. Lưu điểm cả Practice Mode để tracking tiến độ theo thời gian có ý nghĩa.

---

### WHAT 2.3 — Chuyển tiếp giữa các problem trong cùng một Live Coding Session

Khi session có 2 hoặc 3 problem, luồng chuyển tiếp hoạt động như sau:

#### Sau khi Submit problem (chưa phải problem cuối)

1. Kết quả Submit (pass/fail từng test case) hiển thị ngay trong panel kết quả — ứng viên thấy được kết quả bài vừa làm.
2. Sau 3 giây (hoặc ứng viên nhấn "Bài tiếp theo"), hệ thống **tự động load problem tiếp theo** trong session.
3. Problem mới bắt đầu ở trạng thái sạch: Approach Box trống, Code Editor hiển thị `codeTemplate` của bài mới, timer reset về 0 (đếm lên từ đầu cho bài mới).
4. Số problem hiển thị trên header cập nhật: vd. "Bài 2 / 3".

> **Không có debrief giữa chừng.** Per-problem debrief chỉ hiển thị sau khi toàn bộ session kết thúc — ứng viên không được xem phân tích bài 1 trước khi vào bài 2, vì trong phỏng vấn thật interviewer cũng không làm vậy.

#### Sau khi Submit problem cuối cùng

Sau khi Submit problem cuối (hoặc hết giờ toàn session):
- Nếu phiên phỏng vấn **chỉ có Live Coding** (1 round): Chuyển thẳng đến Debrief Report + Bảng điểm của session.
- Nếu phiên phỏng vấn **có nhiều round** (vd. Behavioral trước đó): Chuyển đến Bảng điểm tổng hợp toàn phiên (xem WHAT 0.2).

#### Trạng thái session xuyên suốt nhiều problem

Hệ thống duy trì một **session object** bao gồm:

| Field | Mô tả |
|-------|-------|
| `problems[]` | Danh sách problem cố định từ lúc session tạo |
| `currentProblemIndex` | Index problem đang làm (0-based) |
| `problemResults[]` | Kết quả Submit từng problem — tích lũy dần |
| `sessionStartedAt` | Thời điểm session bắt đầu (toàn bộ) |
| `totalTimeMs` | Tổng thời gian đã dùng trên tất cả problem |

Timer toàn session (`totalTimeMs`) chạy liên tục từ đầu đến cuối — không reset giữa các bài. Timer per-problem (`timeUsedMs`) đo riêng cho từng bài (dùng trong Scoring Engine). Cả hai đều hiển thị trên header.

**WHY:** Chuyển tiếp tự động giữ nhịp phỏng vấn — ứng viên không bị phân tâm bởi UI navigation. Không có debrief giữa chừng là quyết định có chủ đích: debrief sau mỗi bài tạo feedback loop ngắn khiến ứng viên adjust chiến thuật dựa trên điểm số thay vì tư duy thuần túy. Tổng thời gian toàn session được ghi nhận vì trong phỏng vấn thật, time management xuyên suốt nhiều bài là một chiều đánh giá.

---

## Phần 3: Sau khi kết thúc

### WHAT 3.1 — Debrief như Interviewer thật

Sau khi **toàn bộ session kết thúc** (đã Submit tất cả problem hoặc hết giờ), hệ thống sinh ra **Debrief Report**.

Debrief hoạt động ở **hai cấp độ**:

#### Cấp problem (per-problem debrief)

Mỗi problem có debrief riêng gồm 4 phần:

1. **Approach Verdict**: So sánh Approach Box (tại thời điểm kết thúc) với code thực tế — thuật toán có khớp không? Complexity ước tính có đúng không? Edge case có được handle không?
2. **Complexity Analysis**: Time và space complexity của code submit so với `optimalTimeComplexity` / `optimalSpaceComplexity`.
3. **Performance Summary**: Kết quả test case (visible pass/fail + hidden pass/fail), số lần Run đã dùng / 20, số hint đã mở / 3, thời gian giải.
4. **Actionable Suggestion**: 1–2 câu gợi ý cụ thể dựa trên điểm yếu rõ nhất, tham chiếu `problem.tags`.

#### Cấp session (session-level summary)

Khi session có nhiều problem, sau tất cả per-problem debrief là một **Session Summary**:

- Điểm từng problem và điểm trung bình toàn phiên.
- Problem nào làm tốt nhất / yếu nhất.
- Pattern nhận ra qua nhiều bài (nếu có) — vd. "Bạn consistently không nhận ra khi cần dùng sliding window."

Ví dụ Debrief output (1 problem):
```
[Problem 1 — Two Sum — EASY]
Approach: Two pointers — đúng hướng, được thực thi tốt.
Complexity: O(n) time, O(1) space — tối ưu.
Performance: Pass 2/2 visible, 5/5 hidden | Run 4/20 lần | Hint 0/3 | 14 phút
Gợi ý: Xử lý edge case mảng rỗng bị thiếu — cân nhắc thêm guard clause ở đầu hàm.
```

**WHY:** Điểm số không dạy được gì. Debrief ở cấp problem giúp ứng viên hiểu từng bài sai ở đâu. Debrief ở cấp session giúp nhận ra pattern yếu lặp lại — điều mà một lần luyện đơn lẻ không thể thấy được. Đây là lý do ứng viên quay lại dùng platform, vì họ cảm thấy tiến bộ sau mỗi session.

---

### Cơ chế tính điểm — Scoring Engine (WHAT 3.1 detail)

#### Inputs đầu vào (per problem)

| Input | Kiểu | Nguồn |
|-------|------|-------|
| `testResults.visible` | `{ passed, total }` | Kết quả Submit (re-run toàn bộ) |
| `testResults.hidden` | `{ passed, total }` | Kết quả Submit (re-run toàn bộ) |
| `submittedCode` | `string` | Code editor tại thời điểm Submit |
| `approachBox` | `string` | Text Approach Box tại thời điểm Submit |
| `timeUsedMs` | `number` | Từ lúc Code Editor mở đến Submit |
| `timeLimitMs` | `number` | Từ problem (EASY=20p, MED=35p, HARD=50p) |
| `runsUsed` | `0–20` | Số lần nhấn Run trước khi Submit |
| `hintsUsed` | `0–3` | Số hint ứng viên đã mở |
| `timedOut` | `boolean` | `true` nếu hết giờ tự động Submit |
| `problem.optimalTimeComplexity` | `string` | vd. `"O(n)"`, `"O(n log n)"` |
| `problem.optimalSpaceComplexity` | `string` | vd. `"O(1)"`, `"O(n)"` |
| `problem.tags` | `string[]` | Dùng để AI sinh Actionable Suggestion |

> **Submit re-runs toàn bộ**: Kết quả `testResults` luôn lấy từ lần Submit duy nhất, không phải từ Run trước đó. Nếu ứng viên chưa từng Run thì `testResults` vẫn có giá trị từ Submit.

---

#### Bảng điểm — Tổng 100 điểm

| # | Dimension | Max | Trọng lượng |
|---|-----------|-----|------------|
| 1 | **Correctness** | 45 | Test case passed (visible + hidden) |
| 2 | **Complexity** | 20 | So với optimal solution |
| 3 | **Think Aloud** | 15 | Approach Box vs code thực tế |
| 4 | **Time Efficiency** | 10 | Tốc độ giải vs time limit |
| 5 | **Run Efficiency** | 10 | Số lần Run thực tế / 20 |
| 6 | **Hint Penalty** | −15 | Trừ mỗi hint đã dùng |

**Final Score = max(0, tổng 5 dimensions dương − Hint Penalty)**

**Session Score = trung bình cộng Final Score của tất cả problem trong phiên.**

---

#### 1. Correctness — 45 điểm

```
visible_score = (visible.passed / visible.total) × 15
hidden_score  = (hidden.passed  / hidden.total)  × 30

correctness = visible_score + hidden_score
```

Hidden chiếm 30/45 vì brute force thường pass visible nhưng TLE ở hidden — đây là điểm phân biệt năng lực tối ưu hóa.

---

#### 2. Complexity — 20 điểm

AI phân tích `submittedCode` để suy ra `actualTimeComplexity` và `actualSpaceComplexity`, đối chiếu với `problem.optimal*`.

Thang complexity (time): `O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(n³) < exponential`

```
time_gap = |rank(actualTime) - rank(optimalTime)|

time_gap == 0  →  16 điểm
time_gap == 1  →  10 điểm
time_gap == 2  →   4 điểm
time_gap >= 3  →   0 điểm
```

Space complexity tính riêng:
```
space_gap = |rank(actualSpace) - rank(optimalSpace)|

space_gap == 0  →  4 điểm
space_gap >= 1  →  0 điểm
```

`complexity = time_score + space_score` (tổng tối đa 20)

---

#### 3. Think Aloud — 15 điểm

AI đọc `approachBox` (tại thời điểm Submit) + `submittedCode`, chấm 3 tiêu chí:

| Sub-criterion | Max | Câu hỏi AI trả lời |
|---------------|-----|---------------------|
| Algorithm match | 5 | Thuật toán mô tả trong Approach Box có khớp code thực tế không? |
| Complexity awareness | 5 | Complexity ứng viên ước tính có đúng với code họ viết không? |
| Edge case recognition | 5 | Edge case ứng viên nhắc đến có được handle trong code không? |

Thang mỗi tiêu chí: **5 (đúng) / 3 (một phần) / 0 (không)**.

> Nếu `approachBox` để trống → Think Aloud = 0 toàn bộ.

---

#### 4. Time Efficiency — 10 điểm

```
ratio = timeUsedMs / timeLimitMs

timedOut == true   →   0 điểm
ratio <= 0.50      →  10 điểm
ratio <= 0.70      →   7 điểm
ratio <= 0.90      →   4 điểm
ratio <= 1.00      →   1 điểm
```

---

#### 5. Run Efficiency — 10 điểm

```
runsUsed == 0       →   5 điểm  (submit không test — unusual, không thưởng tối đa)
runsUsed <= 3       →  10 điểm
runsUsed <= 7       →   7 điểm
runsUsed <= 12      →   4 điểm
runsUsed <= 20      →   1 điểm
```

> 0 runs không được full 10 điểm vì không test trước khi Submit là hành vi rủi ro, không phải dấu hiệu năng lực cao.

---

#### 6. Hint Penalty

```
hint_penalty = hintsUsed × 5     // 1 hint = -5, 2 = -10, 3 = -15
```

---

#### Grade Bands (per problem)

| Score | Label | Ý nghĩa |
|-------|-------|---------|
| 90–100 | **Exceptional** | Giải đúng, tối ưu, không hint, approach rõ ràng, ít Run |
| 75–89 | **Strong** | Giải đúng, gần optimal, tư duy tốt |
| 60–74 | **Good** | Giải được nhưng chưa optimal hoặc cần 1–2 hint |
| 45–59 | **Developing** | Pass một phần, tư duy chưa rõ |
| < 45 | **Needs Work** | Không pass hoặc không có approach |

---

#### Nhận xét sinh ra theo từng dimension

```
[Approach Verdict]
AI đối chiếu approach box với code → xác nhận match / phát hiện pivot / cảnh báo không nhất quán.

[Complexity]
"Complexity của bạn: O(n²) — optimal là O(n log n). Bạn chưa tận dụng sorting."
hoặc: "O(n) time, O(1) space — tối ưu hoàn toàn."

[Performance Summary]
"Pass 2/2 visible, 3/5 hidden — hidden case TLE ở n=10⁵ do nested loop."
"Run 12/20 lần — nhiều lần debug thử sai."
"Đã dùng 1/3 hint — trừ 5 điểm."
"Thời gian: 28/35 phút."

[Actionable Suggestion]
AI sinh 1–2 câu cụ thể dựa trên điểm yếu rõ nhất, tham chiếu problem.tags.
```

---

#### Data flow tóm tắt

```
Submit result ─────────────────────────────► Correctness    (45)
problem.optimal + AI(submittedCode) ───────► Complexity     (20)
approachBox + AI(submittedCode) ───────────► Think Aloud    (15)
timeUsedMs / timeLimitMs ──────────────────► Time           (10)
runsUsed / 20 ─────────────────────────────► Run Efficiency (10)
hintsUsed ─────────────────────────────────► Hint Penalty  (−15)
                                                    │
                                             ───────▼──────────────
                                             Problem Score (0–100)
                                             Grade Band + Debrief Text
                                                    │
                              ┌─────────────────────┘
                  (repeat per problem)
                              │
                         ─────▼──────────────
                         Session Score = avg(all problem scores)
                         Session Summary (pattern, strongest/weakest)
```

---

### WHAT 3.2 — Solution Walkthrough sau khi submit

Sau khi xem Debrief, ứng viên có thể mở **Solution Walkthrough** cho từng problem:

- Hiển thị solution mẫu (tìm solution_code trong template).

**Practice Mode**: Mở ngay sau khi Submit.
**Combat Mode** *(mở rộng về sau)*: Khóa đến sau khi kết quả được công bố — tránh leak đề trong phiên thi chung.

**WHY:** Học từ solution sau khi tự giải là cách học hiệu quả nhất (spaced repetition + context). Nếu ứng viên chưa giải được, xem solution có ít giá trị hơn — nhưng vẫn cung cấp vì học còn hơn không.

---

---

## HOW — Kế hoạch Triển khai Kỹ thuật

> Audit ngày 2026-04-23. Mỗi task được đánh giá dựa trên codebase hiện tại.
> Legend: ✅ Đã xong | ⚠️ Cần bổ sung nhỏ | 🔨 Cần xây mới

---

### Trạng thái tổng quan (snapshot)

| Feature | Status | Ghi chú |
|---------|--------|---------|
| Setup: chọn 2 round, DSA count 1–3 | ✅ Xong | `InterviewSetupFlow`, `DSAConfigPanel`, Redux slice |
| Setup: config truyền xuống API | ✅ Xong | `dsaSessionSaga` gửi `problemCount` khi `createSession` |
| Problem loading (server assigns N bài theo level) | ✅ Xong | `live-coding.service.ts:54–139` |
| Per-problem state tracking (phase, approachSubmittedAt…) | ✅ Xong | `dsaSessionSlice`, entity DB |
| Submit flow — lưu finalCode, trigger debrief job | ✅ Xong | `live-coding.service.ts:296–326` |
| Run history tracking (runHistory array) | ✅ Xong | Entity + slice |
| Tổng session timer (practice đếm lên, combat đếm ngược) | ✅ Xong | `SessionTimer.jsx` |
| Per-problem debrief display (verdict, complexity, suggestions) | ✅ Xong | `DSAScoringTab.jsx` |
| AI debrief generation (Groq Llama) | ✅ Xong | `live-coding-ai.service.ts` |
| Behavioral → DSA redirect (saga polling) | ✅ Xong | `behavioralSaga.js:172–178` |
| Combined scoring page skeleton | ✅ Xong | `ScoringPage.jsx` có tabs per round |
| **Approach Box UI (interview mode)** | 🔨 Xây mới | Solo mode không có — đúng thiết kế. Cần thêm cho interview mode |
| **Per-problem timer (timeUsedMs) (interview mode)** | 🔨 Xây mới | Solo không cần; interview mode cần để score Time Efficiency |
| **Auto-advance sang bài tiếp theo (interview mode)** | 🔨 Xây mới | Solo: user ở lại bài — đúng. Interview: cần auto-advance |
| **Round transition screen** | 🔨 Xây mới | Không có màn hình chuyển tiếp giữa 2 round |
| **Scoring formula (Correctness + Complexity + …)** | 🔨 Xây mới | Chỉ AI-generated verdict, không có formula |
| Hints count gửi lên server và tính điểm | ⚠️ Bổ sung | Client track hints, chưa gửi/lưu/score trong interview mode |
| Combined scoring auto-load đúng tab | ⚠️ Bổ sung | Cần truyền `initialTab` khi navigate vào |

---

### Pattern chung: Mode Flag

`DSASessionPage` hiện phục vụ hai mode hoàn toàn khác nhau:

| Mode | Mô tả | Tính năng |
|------|-------|-----------|
| `solo` | Luyện tập thuật toán độc lập | Đọc đề → Code → Run. Không scoring, không approach, không timer per-problem |
| `interview` | Vòng Live Coding trong phiên phỏng vấn | Approach Box → Code → Submit + đầy đủ scoring pipeline |

**Nguyên tắc bắt buộc:** Mọi tính năng trong các Task dưới đây **chỉ áp dụng cho `interview` mode**. Solo mode không được chạm vào — nó đang hoạt động đúng.

**Cách truyền flag:** `DSASessionPage` nhận prop `mode: 'solo' | 'interview'` (hoặc đọc từ Redux nếu đã có). Mọi nhánh interview-only được gate sau `mode === 'interview'`.

> Trước khi viết code bất kỳ task nào: xác nhận `DSASessionPage` đang nhận `mode` từ đâu (prop từ route, từ Redux `interviewSetupSlice`, hay field trong session object server trả về). Chọn nguồn đó làm single source of truth, không tạo thêm nguồn mới.

---

### Task 1 — Approach Box UI (interview mode only) 🔨

**Hiện trạng:** Solo mode không có Approach Box — đúng thiết kế, không phải bug. Trong interview mode, backend endpoint `PATCH /sessions/:id/approach` và saga `submitApproachSaga` đã có sẵn, nhưng chưa có UI để nhập text. Phase gate READ → APPROACH → CODE tồn tại trong slice, nhưng bước APPROACH hiện bị bỏ qua (dispatch `approachSubmitted` với text rỗng).

**Việc cần làm:**

1. **Tạo** `client/apps/web/src/components/dsa/ApproachBox.jsx`
   - Textarea cho approach text (placeholder: "Thuật toán bạn định dùng? Complexity ước tính?")
   - Nút "Submit Approach" — disabled khi textarea rỗng
   - Khi submit: dispatch `submitApproach({ sessionId, problemId, approachText })`
   - Không lock sau submit (per WHAT 1.2) — user có thể quay lại chỉnh
   - Component này **không được import** ở bất cứ đâu trong solo flow

2. **Sửa** `DSASessionPage.jsx` — trong phase `APPROACH`, chỉ render `<ApproachBox>` khi `mode === 'interview'`. Solo mode không có phase APPROACH, không chạm vào nhánh solo.

3. **Sửa** `dsaSessionSaga.js:submitApproachSaga` — đảm bảo `approachText` được gửi trong payload

4. **Sửa** `dsaSessionSlice.js:approachSubmitted` — nhận `approachText` string, lưu vào `sessionProblems[id].approachText`

5. **Sửa** `DSASessionPage.jsx:handleSubmit` (interview mode branch) — đọc `approachText` từ slice, đưa vào payload submit (field `approachBox`)

**File chạm:** `ApproachBox.jsx` (mới), `DSASessionPage.jsx` (chỉ nhánh interview), `dsaSessionSlice.js`, `dsaSessionSaga.js`

---

### Task 2 — Per-problem Timer `timeUsedMs` (interview mode only) 🔨

**Hiện trạng:** Solo mode không cần per-problem timer — đúng thiết kế. Trong interview mode, `SessionTimer.jsx` chỉ track tổng session. Không có tracking thời gian bắt đầu CODE phase cho từng bài. `timeUsedMs` không được gửi lên server khi submit.

**Việc cần làm:**

1. **Sửa** `dsaSessionSlice.js` — thêm field `codePhaseStartedAt: number | null` per problem trong `sessionProblems`. Set giá trị này khi `approachSubmitted` action được dispatch (tức là khi CODE phase bắt đầu).

2. **Sửa** `DSASessionPage.jsx:handleSubmit` — tính `timeUsedMs = Date.now() - sessionProblems[problemId].codePhaseStartedAt` và đưa vào payload gửi server.

3. **Sửa** `live-coding.service.ts:submitProblem()` — nhận và lưu `timeUsedMs` vào DB. Cần thêm field `timeUsedMs Int?` vào Prisma model `LiveCodingSessionProblem`.

4. **Sửa** `prisma/schema.prisma` — thêm `timeUsedMs Int?` vào `LiveCodingSessionProblem`.

5. **Hiển thị (interview mode only):** Trong `DSASessionPage.jsx` header, khi `mode === 'interview'`, hiện thị "⏱ Bài này: Xm Ys" song song với tổng timer — dùng `Date.now() - codePhaseStartedAt` tính realtime. Solo mode không render dòng này.

**File chạm:** `dsaSessionSlice.js`, `DSASessionPage.jsx`, `live-coding.service.ts`, `schema.prisma`

---

### Task 3 — Auto-advance giữa các Problem (interview mode only) 🔨

**Hiện trạng:** Solo mode: user ở lại problem sau submit — đúng thiết kế. Interview mode: cũng đang giữ nguyên hành vi đó, nhưng cần auto-advance sang problem tiếp theo.

**Việc cần làm:**

1. **Sửa** `dsaSessionSaga.js:submitProblemSaga` — sau khi submit thành công, kiểm tra `mode`:
   - Solo mode: không làm gì thêm, giữ nguyên hành vi hiện tại
   - Interview mode:
     - Tính `nextIndex = currentProblemIndex + 1`
     - Nếu `nextIndex < problems.length`: sau 3 giây dispatch `switchProblem(problems[nextIndex].id)` — dùng `delay(3000)` từ redux-saga
     - Nếu đã là problem cuối: dispatch `sessionAllProblemsSubmitted`

2. **Thêm** action `sessionAllProblemsSubmitted` vào `dsaSessionSlice.js` — set `status: 'SCORING'`

3. **Sửa** `DSASessionPage.jsx` — watch selector `status === 'SCORING'`, khi đúng:
   - Nếu là multi-round (có `nextRound` trong interview session): navigate to round transition screen
   - Nếu là DSA-only hoặc round cuối: navigate to scoring page (`/scoring/:interviewSessionId`)
   - logic này cần được tái sử dụng vì 1 interview session có nhiều session khác nhau

4. **Thêm** UI "Chuyển sang bài tiếp theo trong 3 giây…" — chỉ render khi `mode === 'interview'` và `pendingTransition: true`. Solo mode không có UI này.

**File chạm:** `dsaSessionSaga.js`, `dsaSessionSlice.js`, `DSASessionPage.jsx`

---

### Task 4 — Round Transition Screen 🔨

**Hiện trạng:** Khi `behavioralSaga.js` detect `nextRound === 'dsa'`, nó dispatch `startDSARound` ngay lập tức và saga tạo session, rồi navigate. Không có màn hình trung gian. User không biết mình sắp vào round 2.

**Việc cần làm:**

1. **Tạo** `client/apps/web/src/components/interview-setup/RoundTransitionScreen.jsx`
   - Props: `fromRound` ("behavioral"), `toRound` ("dsa"), `dsaConfig` (problemCount, language…), `onContinue` callback
   - Hiển thị: "Vòng 1 hoàn tất. Tiếp theo: Live Coding — [N] bài, ngôn ngữ [X]"
   - Nút "Bắt đầu vòng 2" để user chủ động vào, không auto-start
   - Không hiển thị điểm behavioral

2. **Thêm route** hoặc **Redux state** để control màn hình này:
   - Option đơn giản hơn: thêm `showRoundTransition: boolean` + `pendingNextRound: string` vào `interviewSetupSlice`. Khi `true`, `InterviewSetupFlow.jsx` render `RoundTransitionScreen` thay vì current step.
   - Khi user nhấn "Bắt đầu vòng 2": dispatch action clear `showRoundTransition`, saga tiếp tục `startDSARound`.

3. **Sửa** `behavioralSaga.js` — thay vì dispatch `startDSARound` ngay, dispatch `showRoundTransitionScreen({ nextRound: 'dsa' })` trước, chờ user confirm.

**File chạm:** `RoundTransitionScreen.jsx` (mới), `interviewSetupSlice.js`, `behavioralSaga.js`, `InterviewSetupFlow.jsx`

---

### Task 5 — Scoring Formula (Correctness + Complexity + Think Aloud + Time + Run + Hint) 🔨

**Hiện trạng:** `live-coding-ai.service.ts` sinh debrief text (verdict, stuckPoints, suggestion) hoàn toàn dựa vào AI. Không có công thức điểm số nào. `DSAScoringTab.jsx` hiển thị debrief fields nhưng không có số điểm cụ thể (0–100).

**Việc cần làm:**

1. **Tạo** `server/src/live-coding/live-coding-scoring.service.ts` — pure function, không có side effect, không gọi AI:

   ```typescript
   computeProblemScore(input: ScoringInput): ScoringResult
   ```

   Implement đúng theo công thức WHAT 3.1:
   - **Correctness** (45): visible 15pt + hidden 30pt
   - **Complexity** (20): time gap rank → 16/10/4/0, space gap → 4/0
   - **Think Aloud** (15): lấy từ AI debrief (approachVerdict → map sang điểm số)
   - **Time Efficiency** (10): `timeUsedMs / timeLimitMs` ratio
   - **Run Efficiency** (10): `runsUsed` theo thang đã định
   - **Hint Penalty** (−15 max): `hintsUsed × 5`

2. **Sửa** `live-coding.service.ts:processDebrief()` — sau khi AI trả debrief cho từng problem, gọi `liveCodingScoringService.computeProblemScore()` và lưu `numericScore` + `gradeBand` vào DB.

3. **Thêm** fields vào Prisma `LiveCodingSessionProblem`: `numericScore Int?`, `gradeBand String?`, `runsUsed Int?`, `hintsUsed Int?`.

4. **Sửa** `DSAScoringTab.jsx` — hiển thị `numericScore` và `gradeBand` badge cạnh tên problem.

5. **Sửa** submit flow — đảm bảo `runsUsed` (count từ `runHistory`) và `hintsUsed` (từ payload client) được lưu DB khi submit (hiện tại bị bỏ qua ở `live-coding.service.ts:296`).

**File chạm:** `live-coding-scoring.service.ts` (mới), `live-coding.service.ts`, `live-coding.module.ts`, `schema.prisma`, `DSAScoringTab.jsx`

---

### Task 6 — Hints gửi lên Server và tính điểm ⚠️

**Hiện trạng:** `dsaSessionSlice.js` track `unlockedHints[problemId]` (mảng index). Trong practice mode, `DSASessionPage.jsx:234` gửi `unlockedHints` trong payload submit. Trong interview mode không gửi. `live-coding.service.ts:submitProblem()` không đọc field này.

**Việc cần làm:**

1. **Sửa** `DSASessionPage.jsx:handleSubmit` — luôn tính `hintsUsed = unlockedHints[problemId]?.length ?? 0` và đưa vào payload (cả practice lẫn interview mode).

2. **Sửa** `live-coding.service.ts:submitProblem()` — đọc `hintsUsed` từ DTO, lưu vào `LiveCodingSessionProblem.hintsUsed`.

3. `live-coding-scoring.service.ts` (Task 5) tự động dùng `hintsUsed` đã lưu — không cần thêm gì.

**File chạm:** `DSASessionPage.jsx`, `live-coding.service.ts`

---

### Task 7 — Combined Scoring Auto-load đúng Tab ⚠️

**Hiện trạng:** `ScoringPage.jsx` fetch tất cả sessions và render tabs. Khi navigate từ DSA session xong, page mở tab đầu tiên (Behavioral) thay vì tab Live Coding.

**Việc cần làm:**

1. **Sửa** navigate call trong `DSASessionPage.jsx` (Task 3) — khi navigate to scoring, truyền `?tab=liveCoding` hoặc state `{ initialTab: 'liveCoding' }` vào React Router.

2. **Sửa** `ScoringPage.jsx` — đọc `initialTab` từ location state hoặc query param, set `activeTab` default value theo đó.

3. Khi là single-round DSA (không có behavioral round), ScoringPage bỏ qua tab Behavioral và chỉ render DSA tab.

**File chạm:** `DSASessionPage.jsx`, `ScoringPage.jsx`

---

### Thứ tự triển khai đề xuất

```
Task 1 (Approach Box)          ← prerequisite cho Task 5 (cần approachText để score Think Aloud)
Task 2 (Per-problem timer)     ← prerequisite cho Task 5 (cần timeUsedMs để score Time Efficiency)
Task 6 (Hints to server)       ← prerequisite cho Task 5 (cần hintsUsed)
Task 5 (Scoring formula)       ← sau khi 1+2+6 xong, mới có đủ data
Task 3 (Auto-advance problems) ← độc lập, có thể song song với 1+2
Task 4 (Round transition)      ← độc lập, có thể song song
Task 7 (Scoring tab auto-load) ← sau Task 3
```

Nếu làm tuần tự: **Task 3 → Task 4 → Task 1 → Task 2 → Task 6 → Task 5 → Task 7**
Nếu làm 2 track song song:
- Track A (UX flow): Task 3 → Task 4 → Task 7
- Track B (data correctness): Task 1 → Task 2 → Task 6 → Task 5

---

## Phụ lục: Extensibility cho Combat Mode

Thiết kế Practice Mode phải đảm bảo các điểm mở rộng sau không yêu cầu refactor lớn:

| Tính năng Combat Mode | Điểm mở rộng cần giữ trong Practice |
|-----------------------|-------------------------------------|
| Camera monitoring | Session object có `mode: "practice" \| "combat"` — tất cả anti-cheat logic gate sau flag này |
| Eye tracking + expression analysis | Scoring Engine nhận input optional, không break nếu thiếu |
| Approach Box locked sau submit | Practice: không lock. Combat: lock — cùng component, khác config |
| Score không hiển thị ngay | Practice: hiển thị ngay. Combat: deferred — Debrief component nhận prop `revealed` |
| Leaderboard | Session score đã được lưu — thêm leaderboard query trên dữ liệu đó |
