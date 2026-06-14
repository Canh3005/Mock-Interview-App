# SD Session — Phase 3: Scale Estimation Flow

## Tổng quan

Phase 3 là giai đoạn ước tính quy mô hệ thống bằng back-of-the-envelope calculation. Candidate không chỉ tính số mà phải **dùng số để justify architecture decision** — đây là điểm cốt lõi phân biệt phase này với Phase 1–2.

---

## Cơ chế xử lý mỗi lượt câu hỏi

Giống Phase 1, 2 — evaluate → respond → scan followup → quyết định:

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
Fill xảy ra khi `count > limit` hoặc không còn red flag nào để hỏi mà item vẫn chưa được candidate đề cập. Interviewer cung cấp assumption hoặc architecture connection còn thiếu rồi tiếp tục.

Khi fill, hệ thống ghi lại:
```
fill_event:
  phase: 3
  question_key: "storage_estimation"
  item_key: "connect_to_architecture"
  followup_count_at_fill: 2
```

Fill event là tín hiệu đánh giá mạnh nhất: candidate **không tự đến được** dù đã được gợi ý đủ số lần.

**Điểm khác biệt với Phase 1–2:** "Tốt" ở Phase 3 yêu cầu candidate **tính có assumptions rõ ràng + kết nối kết quả với architecture decision**. Tính đúng số nhưng không dùng để justify → "Thiếu".

---

## Các loại câu hỏi

Phase 3 gồm **3 loại câu hỏi** theo thứ tự cố định:

---

### 1. Opening (1 câu)

> *"Chúng ta đã có requirements. Bây giờ hãy cùng ước tính quy mô của hệ thống nhé."*

Mục đích: kickoff phase. Sau khi candidate xác nhận sẵn sàng, **interviewer** cung cấp con số users làm điểm xuất phát, candidate dùng đó để derive các thông số còn lại trong Scale Dimension Loop.

**Followup list: rỗng** — sau respond luôn chuyển sang Scale Dimension Loop.

| Mức đánh giá | Rubric | Response của Interviewer | Followup |
|---|---|---|---|
| **Tốt** | Hiểu cần làm gì + chủ động hỏi scale number | "Tốt. Hệ thống cần hỗ trợ [X DAU/MAU]. Từ đó, hãy cùng ước tính các thông số khác nhé." | — |
| **Thiếu** | Sẵn sàng nhưng không hỏi số, tự đoán | "Được rồi. Để có cơ sở tính toán: hệ thống cần hỗ trợ [X DAU/MAU]. Chúng ta sẽ bắt đầu từ đó." | — |
| **Yếu** | Không hiểu scale estimation là gì | "Scale estimation là ước tính sơ bộ dựa trên số users — bao nhiêu data, bao nhiêu requests. Hệ thống này cần hỗ trợ [X DAU/MAU], hãy bắt đầu từ đó." | — |
| **Không liên quan** | Nói về chủ đề khác | "Hãy focus vào việc ước tính quy mô hệ thống nhé." | Hỏi lại câu hỏi chính, không scan red flag |

> **Lưu ý:** Interviewer là người cung cấp con số DAU/MAU — đây là fact pre-define per problem. Candidate không tự bịa số mà derive các thông số khác (storage, throughput, ratio) từ số này.

---

### 2. Scale Dimension Loop (N câu — 1 per dimension)

> *"Bạn ước tính [scale dimension] của hệ thống như thế nào?"*

Mục đích: candidate tính từng dimension, nêu assumptions và kết nối với architecture.

**Followup list: có** — red flag xuất hiện khi candidate tính thiếu assumptions, thiếu work shown, hoặc không kết nối số với design.

| Mức đánh giá | Rubric | Response | Followup |
|---|---|---|---|
| **Tốt** | Nêu assumptions → tính → kết luận architecture implication | "Tốt, con số đó cho thấy rõ hướng thiết kế." | — → dimension tiếp hoặc Closing |
| **Thiếu** | Tính đúng nhưng thiếu assumptions hoặc không kết nối với architecture | "Bạn đã tính được nhưng vẫn còn thiếu." | Hỏi theo red flag |
| **Yếu** | Tính sai, assumption vô lý, hoặc không tính được | "Con số đó có vẻ chưa hợp lý — hãy thử lại với assumption khác." | Hỏi theo red flag |
| **Không liên quan** | Nói về chủ đề khác | "Hãy focus vào việc ước tính [dimension] nhé." | Hỏi lại câu hỏi chính, không scan red flag |

**Red flag và followup question:**

Mỗi dimension có expected elements — candidate cần thể hiện đủ để không bị flag.

Ví dụ với bài toán TikTok:

```
scale_dimensions: [
  {
    key: "user_count",
    question: "Bạn ước tính số lượng người dùng của hệ thống như thế nào?",
    expected_elements: [
      {
        key: "ask_or_state_dau_mau",
        red_flag: "không hỏi hoặc không nêu DAU/MAU — tự nhảy vào tính",
        followup_question: "Bạn đang tính dựa trên bao nhiêu người dùng mỗi ngày?"
      },
      {
        key: "distinguish_upload_vs_view_users",
        red_flag: "không phân biệt tỉ lệ người upload vs người xem",
        followup_question: "Trong số đó, bao nhiêu phần trăm là người upload video — tất cả đều upload hay chỉ một phần?"
      }
    ]
  },
  {
    key: "storage_estimation",
    question: "Bạn ước tính dung lượng lưu trữ cần thiết như thế nào?",
    expected_elements: [
      {
        key: "show_calculation_steps",
        red_flag: "đưa ra con số mà không show bước tính",
        followup_question: "Bạn tính ra con số đó dựa trên assumptions nào?"
      },
      {
        key: "connect_storage_to_architecture",
        red_flag: "tính được storage nhưng không kết nối với quyết định dùng object store hay DB",
        followup_question: "Con số storage đó ảnh hưởng thế nào đến cách bạn sẽ lưu trữ data?"
      }
    ]
  },
  {
    key: "read_write_ratio",
    question: "Bạn nghĩ tỉ lệ read/write của hệ thống này như thế nào?",
    expected_elements: [
      {
        key: "identify_ratio",
        red_flag: "không xác định hệ thống read-heavy hay write-heavy",
        followup_question: "Hệ thống này có nhiều người xem video hay nhiều người upload hơn?"
      },
      {
        key: "use_ratio_to_justify_design",
        red_flag: "xác định được ratio nhưng không dùng để justify read replicas hay cache",
        followup_question: "Tỉ lệ read/write đó ảnh hưởng thế nào đến kiến trúc bạn sẽ chọn?"
      }
    ]
  }
]
```

**Limits per dimension:**
- `thiếu_count` ≤ 2: tiếp tục followup
- `yếu_count` ≤ 1: tiếp tục followup
- `irrelevant_count` ≤ 1: hỏi lại câu chính
- Vượt limit → fill + flag + chuyển dimension tiếp theo

*(Các counter reset khi sang dimension mới)*

---

### 3. Closing (1 câu)

> *"Dựa vào các con số vừa ước tính, điều đó cho bạn thấy gì về hướng thiết kế của hệ thống?"*

Mục đích: candidate tổng hợp scale numbers → rút ra architecture implications làm cầu nối sang Phase 4.

**Đây là câu hỏi bridge** — output của closing là danh sách implication mà candidate sẽ dùng để thiết kế ở Phase 4.

**Followup list: có** — red flag là implication bị bỏ sót.

| Mức đánh giá | Rubric | Response | Followup |
|---|---|---|---|
| **Tốt** | Kết nối đủ scale numbers → architecture implications rõ ràng | "Tốt, các nhận định đó sẽ là nền tảng cho thiết kế." | — → Phase 4 |
| **Thiếu** | Nêu được một số implication nhưng bỏ sót | "Bạn đã rút ra được một số kết luận, nhưng còn thiếu." | "Con số [X] cho thấy điều gì về [aspect]?" |
| **Yếu** | Không rút ra được implication hoặc kết luận sai | "Hãy nhìn lại các con số — chúng nói lên điều gì về hệ thống?" | "Với [N] triệu users đọc data mỗi ngày, bạn cần chuẩn bị gì?" |
| **Không liên quan** | Nói sang chủ đề khác | "Hãy focus vào việc rút ra kết luận từ các con số vừa tính." | Hỏi lại câu hỏi chính, không scan red flag |

---

## Flow tổng thể Phase 3

```
[I] Opening
     │
     ▼ evaluate → respond → scan followup (rỗng) → next
     │
     ▼
[I] Scale Dimension: User Count
     │
     ▼ evaluate → respond → scan red flags → followup nếu cần
     │
[I] Scale Dimension: Storage Estimation
[I] Scale Dimension: Read/Write Ratio
     │
     ▼
[I] Closing (bridge to Phase 4)
     │
     ▼ evaluate → respond → scan red flags → followup nếu cần
     │
     ▼
Phase 3 complete → Phase 4 (High-Level Design)
```

---

## Nguồn dữ liệu cần có per problem

```
Problem:
  name: "Design TikTok"

  opening:
    question: "Chúng ta đã có requirements. Bây giờ hãy cùng ước tính quy mô của hệ thống nhé."
    provided_number: "Hệ thống cần hỗ trợ 1 triệu DAU."
    expected_result: "Candidate xác nhận sẵn sàng, tốt nhất là chủ động hỏi scale number trước khi interviewer cung cấp"
    # followup: rỗng — interviewer cung cấp DAU/MAU number rồi chuyển sang Scale Dimension Loop

  scale_dimensions:
    - key: "user_breakdown"
      question: "Từ 1 triệu DAU, bạn derive ra những thông số nào để làm cơ sở tính toán?"
      expected_result: "Candidate phân biệt upload users (~10%) vs view users (~90%), tính ra ~100K uploads/ngày — dùng đó làm base cho storage và ratio"
      expected_elements:
        - key: "distinguish_upload_vs_view"
          red_flag: "không phân biệt tỉ lệ upload vs view users trong 1M DAU"
          followup_question: "Trong 1 triệu người dùng mỗi ngày, bao nhiêu phần trăm là người upload video?"
          fill_answer: "~10% upload (100K/ngày), ~90% chỉ xem — đây là read-heavy system"
    - key: "storage_estimation"
      question: "Bạn ước tính dung lượng lưu trữ cần thiết như thế nào?"
      expected_result: "Candidate show bước tính: 100K uploaders × avg 1 video × 50MB = 5TB/ngày → kết luận cần object storage, không thể dùng DB thông thường"
      expected_elements:
        - key: "show_calculation_steps"
          red_flag: "đưa ra con số mà không show bước tính"
          followup_question: "Bạn tính ra con số đó dựa trên assumptions nào?"
          fill_answer: "100K videos/ngày × 50MB/video = 5TB/ngày → ~1.8PB/năm"
        - key: "connect_to_architecture"
          red_flag: "tính được nhưng không kết nối với architecture"
          followup_question: "Con số storage đó ảnh hưởng thế nào đến cách lưu trữ?"
          fill_answer: "5TB/ngày → phải dùng object storage (S3/GCS), không thể dùng block storage thông thường"
    - key: "read_write_ratio"
      question: "Bạn nghĩ tỉ lệ read/write của hệ thống này như thế nào?"
      expected_result: "Candidate xác định read-heavy (~10:1 hoặc cao hơn) + kết luận cần read replicas và CDN để scale read path"
      expected_elements:
        - key: "identify_ratio"
          red_flag: "không xác định read-heavy hay write-heavy"
          followup_question: "Hệ thống này có nhiều người xem hay nhiều người upload hơn?"
          fill_answer: "90% view vs 10% upload → read-heavy, ratio có thể 100:1 hoặc cao hơn"
        - key: "use_ratio_to_justify"
          red_flag: "xác định ratio nhưng không dùng để justify design"
          followup_question: "Tỉ lệ đó ảnh hưởng thế nào đến kiến trúc bạn sẽ chọn?"
          fill_answer: "Read-heavy → cần read replicas cho DB, CDN cho video delivery, cache cho metadata"

  closing:
    question: "Dựa vào các con số vừa ước tính, điều đó cho bạn thấy gì về hướng thiết kế của hệ thống?"
    expected_result: "Candidate tổng kết đủ implications: storage lớn → object storage; read-heavy → CDN + cache + read replicas; upload-heavy write path → async processing (queue)"
    red_flags:
      - key: "missing_storage_implication"
        red_flag: "không rút ra implication về storage từ con số đã tính"
        followup_question: "Con số 5TB/ngày cho thấy điều gì về cách lưu trữ video?"
        fill_answer: "5TB/ngày → phải dùng object storage, không thể lưu trên server thông thường"
      - key: "missing_read_heavy_implication"
        red_flag: "không kết nối read-heavy ratio với architecture"
        followup_question: "Với 90% users chỉ xem video, hệ thống cần tối ưu gì?"
        fill_answer: "Read-heavy → CDN để serve video gần user, cache để giảm DB load, read replicas để scale query"
```
