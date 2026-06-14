# SD Session — Phase 2: Non-Functional Requirements Flow

## Tổng quan

Phase 2 là giai đoạn xác định các yêu cầu phi chức năng (NFR) và trade-off của hệ thống. Candidate không chỉ liệt kê NFR mà phải đưa ra reasoning gắn với đặc thù bài toán — đây là điểm khác biệt cốt lõi so với Phase 1.

---

## Cơ chế xử lý mỗi lượt câu hỏi

Giống Phase 1 — evaluate → respond → scan followup → quyết định:

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
     ├─ followup list rỗng → next question type
     │
     ├─ tốt → không cần followup → next question type
     │
     ├─ thiếu / yếu → xác định red flags từ response
     │    ├─ red flag found AND count ≤ limit
     │    │    └─ hỏi followup (context = response gốc + response này)
     │    └─ count > limit HOẶC không còn red flag
     │         └─ fill + flag + next question type
     │
     └─ không liên quan → KHÔNG scan red flags
          ├─ irrelevant_count <= 1 → hỏi lại câu hỏi chính
          └─ irrelevant_count > 1  → fill + flag + next question type
```

**Fill event:**
Fill xảy ra khi `count > limit` hoặc không còn red flag nào để hỏi mà item vẫn chưa được candidate đề cập. Interviewer cung cấp reasoning còn thiếu rồi tiếp tục câu hỏi tiếp theo.

Khi fill, hệ thống ghi lại:
```
fill_event:
  phase: 2
  question_key: "availability"       # NFR dimension đang xử lý
  item_key: "justify_high_availability"
  followup_count_at_fill: 1
```

Fill event là tín hiệu đánh giá mạnh nhất: candidate **không tự đến được** dù đã được gợi ý đủ số lần.

**Điểm khác biệt với Phase 1:** "Tốt" ở Phase 2 yêu cầu candidate **nêu NFR + reasoning/trade-off**. Chỉ nêu tên NFR mà không có reasoning → tự động là "Thiếu".

---

## Các loại câu hỏi

Phase 2 gồm **3 loại câu hỏi** theo thứ tự cố định:

---

### 1. Opening (1 câu)

> *"Chúng ta đã có functional requirements. Bây giờ hãy cùng xác định các yêu cầu phi chức năng của hệ thống nhé."*

Mục đích: kickoff phase. Sau khi candidate xác nhận sẵn sàng, **interviewer** cung cấp danh sách các NFR dimension cần xem xét trước khi bắt đầu NFR Loop.

**Followup list: rỗng** — sau respond luôn chuyển sang NFR Loop.

| Mức đánh giá | Rubric | Response của Interviewer | Followup |
|---|---|---|---|
| **Tốt** | Sẵn sàng, hiểu cần làm gì | "Tốt. Với hệ thống này, chúng ta sẽ xem xét các yêu cầu sau: [availability], [latency], [consistency], [durability]. Hãy cùng đi vào từng yêu cầu nhé." | — |
| **Thiếu** | Sẵn sàng nhưng chưa rõ cần làm gì | "Được rồi. Với hệ thống này, chúng ta sẽ xem xét các yêu cầu sau: [availability], [latency], [consistency], [durability]. Hãy cùng đi vào từng yêu cầu nhé." | — |
| **Yếu** | Không hiểu NFR là gì | "Không sao. NFR là các yêu cầu về chất lượng hệ thống. Với hệ thống này, chúng ta sẽ xem xét: [availability], [latency], [consistency], [durability]. Hãy cùng đi vào từng yêu cầu nhé." | — |
| **Không liên quan** | Nói về chủ đề khác | "Hãy focus vào yêu cầu phi chức năng của hệ thống nhé." | Hỏi lại câu hỏi chính, không scan red flag |

> **Lưu ý:** Interviewer là người liệt kê các NFR dimension — không phải candidate. Danh sách dimension được pre-define per problem.

---

### 2. NFR Loop (N câu — 1 per NFR dimension)

> *"Bạn nghĩ về [NFR dimension] của hệ thống này như thế nào?"*

Mục đích: candidate xác định từng NFR dimension + đưa ra reasoning gắn với đặc thù bài toán.

**Followup list: có** — red flag xuất hiện khi candidate nêu NFR nhưng thiếu reasoning, hoặc reasoning không gắn với bài toán.

| Mức đánh giá | Rubric | Response | Followup |
|---|---|---|---|
| **Tốt** | Nêu NFR + reasoning rõ ràng gắn với use case + trade-off nếu có | "Tốt, phân tích hợp lý." | — → NFR Loop tiếp hoặc Closing |
| **Thiếu** | Nêu NFR nhưng thiếu reasoning hoặc trade-off | "Bạn đã xác định được [NFR] nhưng vẫn còn thiếu phần lý giải." | Hỏi theo red flag |
| **Yếu** | Nêu sai NFR hoặc reasoning không liên quan đến bài toán | "Hãy suy nghĩ lại — đặc điểm nào của hệ thống này ảnh hưởng đến [NFR]?" | Hỏi theo red flag |
| **Không liên quan** | Nói về chủ đề khác | "Hãy focus vào [NFR dimension] — bạn nghĩ hệ thống này cần đáp ứng mức nào?" | Hỏi lại câu hỏi chính, không scan red flag |

**Red flag và followup question:**

Mỗi NFR dimension có expected_reasoning — reasoning candidate cần thể hiện. Nếu thiếu → red flag.

Ví dụ với bài toán TikTok:

```
nfr_dimensions: [
  {
    key: "availability",
    question: "Bạn nghĩ về availability của hệ thống này như thế nào?",
    expected_reasoning: [
      {
        key: "justify_high_availability",
        red_flag: "nêu high availability nhưng không giải thích tại sao",
        followup_question: "Tại sao hệ thống video sharing cần high availability — điều gì xảy ra nếu hệ thống down?"
      }
    ]
  },
  {
    key: "consistency",
    question: "Bạn nghĩ về consistency của hệ thống này như thế nào?",
    expected_reasoning: [
      {
        key: "availability_vs_consistency_tradeoff",
        red_flag: "chưa đề cập trade-off giữa availability và consistency",
        followup_question: "Trong CAP theorem, bạn sẽ ưu tiên availability hay consistency — và tại sao với hệ thống này?"
      },
      {
        key: "eventual_consistency_justification",
        red_flag: "chọn eventual consistency nhưng không giải thích use case nào chấp nhận được",
        followup_question: "Delay bao lâu là chấp nhận được với người dùng — upload video xong bao lâu thì người khác thấy được?"
      }
    ]
  },
  {
    key: "latency",
    question: "Bạn nghĩ về latency của hệ thống này như thế nào?",
    expected_reasoning: [
      {
        key: "read_vs_write_latency",
        red_flag: "nói về latency chung chung mà không phân biệt read vs write",
        followup_question: "Latency khi xem video và latency khi upload video có yêu cầu khác nhau không?"
      }
    ]
  }
]
```

**Limits per NFR dimension:**
- `thiếu_count` ≤ 2: tiếp tục followup
- `yếu_count` ≤ 1: tiếp tục followup
- `irrelevant_count` ≤ 1: hỏi lại câu chính
- Vượt limit → fill + flag + chuyển dimension tiếp theo

*(Các counter reset khi sang NFR dimension mới)*

---

### 3. Closing (1 câu)

> *"Hãy tổng kết lại các yêu cầu phi chức năng và trade-off quan trọng của hệ thống nhé."*

Mục đích: candidate tổng hợp toàn bộ NFR + trade-off thành một bức tranh nhất quán.

**Followup list: có** — red flag là NFR dimension hoặc trade-off bị bỏ sót trong tổng kết.

| Mức đánh giá | Rubric | Response | Followup |
|---|---|---|---|
| **Tốt** | Tổng kết đủ NFR dimensions + trade-off chính với reasoning nhất quán | "Tốt, chúng ta đã có đủ NFR để tiếp tục." | — → Phase 3 |
| **Thiếu** | Bỏ sót một số dimension hoặc thiếu trade-off | "Bạn đã tổng kết được phần lớn nhưng vẫn còn thiếu." | "Bạn có nhớ chúng ta còn nói đến [dimension] không?" |
| **Yếu** | Tổng kết quá sơ sài, không có reasoning | "Hãy thử tổng kết chi tiết hơn — với mỗi NFR, reasoning của bạn là gì?" | "Với [dimension], tại sao hệ thống này cần đáp ứng mức đó?" |
| **Không liên quan** | Nói sang chủ đề khác | "Hãy focus vào việc tổng kết NFR và trade-off." | Hỏi lại câu hỏi chính, không scan red flag |

---

## Flow tổng thể Phase 2

```
[I] Opening
     │
     ▼ evaluate → respond → scan followup (rỗng) → next
     │
     ▼
[I] NFR Loop: Availability
     │
     ▼ evaluate → respond → scan red flags → followup nếu cần
     │
[I] NFR Loop: Latency
[I] NFR Loop: Consistency
[I] NFR Loop: Durability/Reliability
     │
     ▼
[I] Closing
     │
     ▼ evaluate → respond → scan red flags → followup nếu cần
     │
     ▼
Phase 2 complete → Phase 3 (Scale Estimation)
```

---

## Nguồn dữ liệu cần có per problem

```
Problem:
  name: "Design TikTok"

  opening:
    question: "Chúng ta đã có functional requirements. Bây giờ hãy cùng xác định các yêu cầu phi chức năng của hệ thống nhé."
    system_nfr_list: "Với hệ thống này, chúng ta sẽ xem xét: availability, latency, consistency, durability."
    expected_result: "Candidate xác nhận sẵn sàng, hiểu sẽ cần xác định NFR"
    # followup: rỗng — interviewer cung cấp system_nfr_list rồi chuyển sang NFR Loop

  nfr_dimensions:
    - key: "availability"
      question: "Bạn nghĩ về availability của hệ thống này như thế nào?"
      expected_result: "Candidate nêu cần high availability (≥99.9%) + giải thích tại sao: hệ thống video serving mà down thì user không xem được, ảnh hưởng trực tiếp đến UX"
      expected_reasoning:
        - key: "justify_high_availability"
          red_flag: "nêu high availability nhưng không giải thích tại sao"
          followup_question: "Tại sao hệ thống video sharing cần high availability?"
          fill_answer: "Hệ thống video serving — nếu down thì user không xem được video, ảnh hưởng trực tiếp UX và doanh thu"
    - key: "consistency"
      question: "Bạn nghĩ về consistency của hệ thống này như thế nào?"
      expected_result: "Candidate chọn eventual consistency + giải thích trade-off: video on-demand delay 10-15 phút là acceptable, ưu tiên availability theo CAP theorem"
      expected_reasoning:
        - key: "availability_vs_consistency_tradeoff"
          red_flag: "chưa đề cập trade-off availability vs consistency"
          followup_question: "Bạn sẽ ưu tiên availability hay consistency — tại sao?"
          fill_answer: "Ưu tiên availability. Theo CAP theorem, chọn AP — delay 10-15 phút cho video on-demand là acceptable"
        - key: "eventual_consistency_justification"
          red_flag: "chọn eventual consistency nhưng không justify use case"
          followup_question: "Delay bao lâu là acceptable với người dùng của hệ thống này?"
          fill_answer: "Video on-demand: delay 10-20 phút acceptable. Khác với live stream phải real-time"
    - key: "latency"
      question: "Bạn nghĩ về latency của hệ thống này như thế nào?"
      expected_result: "Candidate phân biệt read latency (thấp — xem video phải mượt, không buffer) vs write latency (cao hơn được — upload có thể mất vài giây)"
      expected_reasoning:
        - key: "read_vs_write_latency"
          red_flag: "nói latency chung chung, không phân biệt read vs write"
          followup_question: "Latency khi xem video và khi upload có yêu cầu khác nhau không?"
          fill_answer: "Read (xem video): cần rất thấp, không buffer. Write (upload): vài giây là acceptable"
    - key: "durability"
      question: "Bạn nghĩ về độ bền dữ liệu của hệ thống này như thế nào?"
      expected_result: "Candidate nêu cần high durability cho video đã upload + giải thích: mất video của creator là mất content vĩnh viễn, ảnh hưởng trust"
      expected_reasoning:
        - key: "data_loss_impact"
          red_flag: "chưa đề cập hậu quả của việc mất dữ liệu"
          followup_question: "Điều gì xảy ra nếu một video đã upload bị mất?"
          fill_answer: "Mất video của creator là mất content vĩnh viễn, ảnh hưởng nghiêm trọng đến trust của platform"

  closing:
    question: "Hãy tổng kết lại các yêu cầu phi chức năng và trade-off quan trọng của hệ thống nhé."
    expected_result: "Candidate tổng kết đủ: availability cao + lý do, eventual consistency + trade-off với availability, read latency thấp vs write latency cao hơn, durability cao + lý do"
    red_flags:
      - key: "missing_tradeoff"
        red_flag: "tổng kết NFR nhưng không nhắc trade-off"
        followup_question: "Với các yêu cầu này, có trade-off nào quan trọng mà bạn muốn nhắc lại không?"
        fill_answer: "Trade-off chính: availability vs consistency — chọn AP trong CAP theorem"
      - key: "missing_nfr_dimension"
        red_flag: "bỏ sót dimension quan trọng trong tổng kết"
        followup_question: "Bạn có nhớ chúng ta còn đề cập đến yêu cầu nào khác không?"
        fill_answer: "Các NFR đã xác định: [danh sách đầy đủ]"
```
