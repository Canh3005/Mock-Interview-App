# SD Session — Phase 1: Requirements Clarification Flow

## Tổng quan

Phase 1 là giai đoạn làm rõ yêu cầu chức năng (Functional Requirements) trước khi bắt đầu thiết kế. Interviewer drive toàn bộ flow, candidate phản ứng và làm rõ từng phần được chỉ định.

---

## Cơ chế xử lý mỗi lượt câu hỏi

Sau khi đánh giá response của candidate, interviewer thực hiện theo thứ tự:

```
[C] response
     │
     ▼
1. EVALUATE → tốt / thiếu / yếu / không liên quan
     │
     ▼
2. RESPOND → trả lời theo mức đánh giá
     │
     ▼
3. SCAN FOLLOWUP
     │
     ├─ followup list rỗng (không có red flag nào được định nghĩa)
     │    └─ → next question type
     │
     ├─ tốt → không cần followup
     │    └─ → next question type
     │
     ├─ thiếu / yếu → xác định red flags từ response
     │    │
     │    ├─ red flag found AND count ≤ limit
     │    │    └─ → hỏi followup question của red flag đó
     │    │         candidate trả lời (context = response gốc + response này)
     │    │         → re-evaluate với full context
     │    │
     │    └─ count > limit HOẶC không còn red flag nào
     │         └─ fill + flag + next question type
     │
     └─ không liên quan → KHÔNG scan red flags
          │
          ├─ irrelevant_count <= 1 → hỏi lại câu hỏi chính (repeat)
          └─ irrelevant_count > 1  → fill + flag + next question type
```

**Lưu ý context khi re-evaluate followup:**
Candidate response khi trả lời followup phải được evaluate **gộp chung với response gốc**, không tách riêng. Tránh trường hợp đánh giá chỉ dựa trên câu trả lời followup mà bỏ sót thông tin đã nói ở lượt trước.

**Fill event:**
Fill xảy ra khi `count > limit` hoặc không còn red flag nào để hỏi mà item vẫn chưa được candidate đề cập. Interviewer cung cấp thông tin còn thiếu rồi tiếp tục.

Khi fill, hệ thống ghi lại `fill_event`:
```
fill_event:
  phase: 1
  question_key: "upload_video"       # câu hỏi đang xử lý
  item_key: "video_duration"         # item cụ thể phải fill
  followup_count_at_fill: 2          # đã hỏi bao nhiêu lần trước khi fill
```

Fill event là tín hiệu đánh giá mạnh nhất: candidate **không tự đến được** dù đã được gợi ý đủ số lần cho phép.

---

## Các loại câu hỏi

Phase 1 gồm **3 loại câu hỏi** theo thứ tự cố định:

---

### 1. Opening (1 câu)

> *"Hôm nay chúng ta sẽ cùng nhau thiết kế [tên hệ thống]. Trước khi thiết kế, bạn đã sẵn sàng đi vào làm rõ các yêu cầu của hệ thống chưa?"*

Mục đích: kickoff phase. Sau khi candidate xác nhận sẵn sàng, **interviewer** cung cấp overview hệ thống (fact) trước khi bắt đầu Feature Loop.

**Followup list: rỗng** — sau respond luôn chuyển sang Feature Loop.

| Mức đánh giá | Rubric | Response của Interviewer | Followup |
|---|---|---|---|
| **Tốt** | Sẵn sàng, hiểu cần làm gì | "[Tên hệ thống] là [mô tả ngắn]. Hệ thống có các tính năng chính: [feature 1], [feature 2], [feature 3], ... Chúng ta sẽ cùng làm rõ từng tính năng nhé." | — |
| **Thiếu** | Sẵn sàng nhưng chưa rõ cần làm gì | "[Tên hệ thống] là [mô tả ngắn]. Hệ thống có các tính năng chính: [feature 1], [feature 2], [feature 3], ... Chúng ta sẽ cùng làm rõ từng tính năng nhé." | — |
| **Yếu** | Không hiểu cần làm gì | "Không sao. [Tên hệ thống] là [mô tả ngắn]. Hệ thống có các tính năng chính: [feature 1], [feature 2], [feature 3], ... Chúng ta sẽ cùng làm rõ từng tính năng nhé." | — |
| **Không liên quan** | Nói về chủ đề khác | "Hãy focus vào việc làm rõ yêu cầu hệ thống nhé." | Hỏi lại câu hỏi chính, không scan red flag |

> **Lưu ý:** Response của Interviewer ở Tốt/Thiếu/Yếu đều giống nhau về nội dung (liệt kê fact hệ thống) — chỉ khác phần mở đầu. Đây là thông tin interviewer **cung cấp cho candidate**, không phải candidate tự liệt kê.

---

### 2. Feature Loop (N câu — 1 per feature)

> *"Bạn hãy làm rõ thêm về các yêu cầu của tính năng [tên feature] nhé."*

Mục đích: candidate clarify constraints của từng feature. Lặp lại cho toàn bộ danh sách feature theo thứ tự.

**Followup list: có** — được xác định bởi red flags (constraint nào candidate chưa đề cập).

| Mức đánh giá | Rubric | Response | Followup |
|---|---|---|---|
| **Tốt** | Xác định đủ constraints quan trọng của feature | "Rất tốt!" | — → Feature Loop tiếp hoặc Closing |
| **Thiếu** | Đúng hướng nhưng thiếu constraint quan trọng | "Bạn đã trả lời nhưng vẫn còn thiếu một số điểm." | Hỏi theo red flag được xác định |
| **Yếu** | Hời hợt hoặc sai hướng | "Hãy thử nghĩ lại về tính năng này." | Hỏi theo red flag được xác định |
| **Không liên quan** | Nói về chủ đề khác | "Hãy focus vào tính năng [feature] — bạn cần làm rõ điều gì?" | Hỏi lại câu hỏi chính, không scan red flag |

**Red flag và followup question:**

Red flag là constraint mà candidate **chưa đề cập** sau khi evaluate. Mỗi red flag có một followup question tương ứng được pre-define.

Ví dụ với feature `upload_video`:

```
expected_constraints: [
  {
    key: "video_duration",
    red_flag: "chưa làm rõ giới hạn thời gian video",
    followup_question: "Bạn nghĩ video upload lên có giới hạn thời gian không?"
  },
  {
    key: "video_metadata",
    red_flag: "chưa làm rõ video kèm metadata gì",
    followup_question: "Bạn nghĩ khi upload video thì có thể có metadata nào đi kèm?"
  }
]
```

Khi candidate trả lời thiếu, hệ thống scan expected_constraints → xác định constraint nào chưa được đề cập → lấy followup_question tương ứng.

**Limits per feature:**
- `thiếu_count` ≤ 2: tiếp tục followup
- `yếu_count` ≤ 1: tiếp tục followup
- `irrelevant_count` ≤ 1: redirect
- Vượt limit → fill + flag + chuyển feature tiếp theo

*(Các counter reset khi sang feature mới)*

---

### 3. Closing (1 câu)

> *"Hãy tổng kết lại các yêu cầu chức năng mà bạn vừa làm rõ nhé."*

Mục đích: kiểm tra synthesis — candidate recall và tổ chức lại toàn bộ những gì đã clarify.

**Followup list: có** — red flag là feature/constraint bị bỏ sót trong phần tổng kết.

| Mức đánh giá | Rubric | Response | Followup |
|---|---|---|---|
| **Tốt** | Tổng kết đủ và chính xác toàn bộ feature + constraint | "Tốt, chúng ta đã có đủ functional requirements." | — → Phase 2 |
| **Thiếu** | Bỏ sót một số feature hoặc constraint | "Bạn đã tổng kết nhưng còn thiếu một số điểm." | "Bạn có nhớ chúng ta còn đề cập đến [aspect] không?" |
| **Yếu** | Tổng kết quá sơ sài | "Hãy thử tổng kết chi tiết hơn nhé." | "Với mỗi tính năng, bạn đã làm rõ những ràng buộc gì?" |
| **Không liên quan** | Không tổng kết, nói sang chủ đề khác | "Hãy focus vào việc tổng kết các requirements." | Hỏi lại câu hỏi chính, không scan red flag |

---

## Flow tổng thể Phase 1

```
[I] Opening
     │
     ▼ evaluate → respond → scan followup (rỗng) → next
     │
     ▼
[I] Feature Loop: Feature 1
     │
     ▼ evaluate → respond → scan red flags → followup nếu cần
     │
[I] Feature Loop: Feature 2 ... Feature N
     │
     ▼
[I] Closing
     │
     ▼ evaluate → respond → scan red flags → followup nếu cần
     │
     ▼
Phase 1 complete → Phase 2 (Non-Functional Requirements)
```

---

## Nguồn dữ liệu cần có per problem

```
Problem:
  name: "Design TikTok"

  opening:
    question: "Hôm nay chúng ta sẽ cùng nhau thiết kế TikTok. Trước khi thiết kế, bạn đã sẵn sàng đi vào làm rõ các yêu cầu chưa?"
    system_facts: "TikTok là ứng dụng chia sẻ video ngắn. Các tính năng chính: upload video, xem feed, follow người dùng, tương tác video (like, comment, favorite)."
    expected_result: "Candidate xác nhận sẵn sàng"
    # followup: rỗng — interviewer cung cấp system_facts rồi chuyển thẳng sang Feature Loop

  features:
    - name: "upload_video"
      question: "Bạn hãy làm rõ thêm về các yêu cầu của tính năng upload video nhé."
      expected_result: "Candidate hỏi/làm rõ: giới hạn thời gian video (30s–1 phút), loại metadata đi kèm (caption/text), format được hỗ trợ"
      expected_constraints:
        - key: "video_duration"
          red_flag: "chưa làm rõ giới hạn thời gian video"
          followup_question: "Bạn nghĩ video upload lên có giới hạn thời gian không?"
          fill_answer: "Video tối đa 1 phút"
        - key: "video_metadata"
          red_flag: "chưa làm rõ video kèm metadata gì"
          followup_question: "Bạn nghĩ khi upload video thì có thể có metadata nào đi kèm?"
          fill_answer: "Video có thể kèm caption/text"
    - name: "view_feed"
      question: "Bạn hãy làm rõ thêm về các yêu cầu của tính năng xem feed nhé."
      expected_result: "Candidate hỏi/làm rõ: feed lấy từ đâu (followed users hay recommendations), số lượng video preload, thứ tự hiển thị"
      expected_constraints:
        - key: "feed_source"
          red_flag: "chưa làm rõ feed lấy từ nguồn nào"
          followup_question: "Feed video được lấy từ đâu — chỉ người dùng đang follow hay còn nguồn nào khác?"
          fill_answer: "Feed từ followed users, có thể thêm trending/recommendation"

  closing:
    question: "Hãy tổng kết lại các yêu cầu chức năng mà bạn vừa làm rõ nhé."
    expected_result: "Candidate tổng kết đủ: upload_video (max 1 phút, có caption), view_feed (followed users + optional trending), follow_users, video_interactions (like, comment, favorite) — mỗi feature kèm constraint chính"
    red_flags:
      - key: "missing_feature_constraints"
        red_flag: "tổng kết feature nhưng không nhắc constraint đã làm rõ"
        followup_question: "Với tính năng [feature], bạn đã làm rõ những ràng buộc gì?"
        fill_answer: "[feature]: [constraint đã xác định trong Feature Loop]"
      - key: "missing_feature"
        red_flag: "bỏ sót feature quan trọng trong tổng kết"
        followup_question: "Bạn có nhớ chúng ta còn đề cập đến tính năng nào khác không?"
        fill_answer: "Các tính năng đã xác định: [danh sách đầy đủ]"
```
