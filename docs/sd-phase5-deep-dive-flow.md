# SD Session — Phase 5: Deep Dive / Scale Flow

## Tổng quan

Phase 5 là giai đoạn interviewer đưa ra **scenario thách thức** để kiểm tra candidate có thể adapt design dưới áp lực scale hoặc edge case không. Candidate không thiết kế lại từ đầu mà **mở rộng design hiện có** để xử lý scenario được đưa ra.

**Điểm khác biệt với Phase 4:** Phase 4 là candidate chủ động build, Phase 5 là interviewer đưa ra scenario → candidate phản ứng và adapt.

---

## Cơ chế xử lý mỗi lượt câu hỏi

Canvas Phase 5 kế thừa trạng thái từ Phase 4. Candidate có thể thêm/sửa component trên canvas bất kỳ lúc nào trong Phase 5.

**Canvas carry-over rule:** Khi scan `expected_solutions`, hệ thống kiểm tra canvas *hiện tại* (bao gồm cả những gì candidate vừa thêm trong Phase 5) trước khi quyết định có red flag không. Nếu candidate thêm CDN ở Phase 5 response → `cdn` không còn là red flag dù Phase 4 đã flag thiếu.

```
[C] response = (canvas update nếu cần) + text giải thích
     │
     ▼
1. CHECK CANVAS STATE — những node nào đã có trên canvas hiện tại?
     │
     ▼
2. EVALUATE → tốt / thiếu / yếu / không liên quan
     │
     ▼
3. RESPOND → trả lời theo mức đánh giá
     │
     ▼
4. SCAN FOLLOWUP
     │
     ├─ tốt → không cần followup → next question
     │
     ├─ thiếu / yếu → xác định red flags từ response + canvas state
     │    ├─ solution đã có trên canvas → bỏ qua red flag đó
     │    ├─ solution optional + chưa có → probe nhẹ (không tính vào limit)
     │    ├─ solution required + chưa có AND count ≤ limit → hỏi followup
     │    └─ count > limit HOẶC không còn red flag required
     │         └─ fill (required only) + flag + next question
     │
     └─ không liên quan → KHÔNG scan red flags
          ├─ irrelevant_count <= 1 → hỏi lại câu hỏi chính
          └─ irrelevant_count > 1  → fill + flag + next question
```

**Fill event:**
Fill xảy ra khi `count > limit` và solution vẫn chưa được candidate đề cập. Chỉ `required` solutions mới bị fill. Canvas có thể được cập nhật nếu solution liên quan đến component mới.

Khi fill, hệ thống ghi lại:
```
fill_event:
  phase: 5
  question_key: "viral_video"
  item_key: "cdn_hotspot"
  followup_count_at_fill: 2
  canvas_node: "cdn"               # node được thêm nếu chưa có trên canvas
  canvas_updated: true/false
```

Solutions `optional: false` (required) — nếu thiếu sau followup → fill + flag.
Solutions không có `optional` field cũng được coi là required theo mặc định.

**Extra node handling:**
Phase 5 khác Phase 4: candidate được **khuyến khích** thêm nodes mới vào canvas khi đề xuất giải pháp scaling — đây là hành vi mong đợi, không phải "thừa".

Extra node được coi là vấn đề khi candidate thêm node mà **không liên quan đến câu hỏi đang được hỏi**, hoặc thêm nhưng không giải thích được. Cơ chế probe giống Phase 4:

> *"Bạn có thể giải thích [node] này giải quyết vấn đề gì trong context này không?"*

```
extra_node_event:
  phase: 5
  question_key: "database_scale"
  node_key: "ml_recommendation_engine"
  in_known_extra_nodes: false
  candidate_justified: false
  evaluation: "misunderstanding"
```

---

## Loại câu hỏi

Phase 5 chỉ có **1 loại câu hỏi**: Bottleneck / Edge Case Loop — interviewer chọn câu hỏi từ danh sách pre-define, không có opening hay closing riêng.

---

### Bottleneck / Edge Case Loop (N câu)

Có hai loại câu hỏi được xen kẽ trong loop này tùy vào bài toán:

**2a. Bottleneck question:**
> *"Bạn sẽ scale [component cụ thể] như thế nào?"*

**2b. Edge case question:**
> *"[Scenario cụ thể] — hệ thống của bạn xử lý thế nào?"*

Ví dụ:
- "Database là bottleneck — bạn sẽ scale nó như thế nào?"
- "Một video viral được 10 triệu người xem cùng lúc — hệ thống xử lý thế nào?"
- "Hệ thống cần hoạt động trên nhiều region — bạn sẽ thay đổi gì?"

Mục đích: kiểm tra candidate biết các scaling pattern chuẩn (sharding, CDN, load balancing, read replicas, caching strategy) và có thể áp dụng vào bài toán cụ thể.

**Followup list: có** — red flag khi candidate đề xuất giải pháp mà không giải thích trade-off hoặc bỏ sót giải pháp quan trọng.

| Mức đánh giá | Rubric | Response của Interviewer | Followup |
|---|---|---|---|
| **Tốt** | Đề xuất giải pháp phù hợp + giải thích trade-off + cập nhật canvas nếu cần | "Tốt, giải pháp hợp lý." | — → câu tiếp |
| **Thiếu** | Đề xuất đúng hướng nhưng thiếu trade-off hoặc thiếu giải pháp bổ sung | "Bạn đã có hướng đúng nhưng vẫn còn thiếu." | Hỏi theo red flag |
| **Yếu** | Đề xuất sai hoặc không biết xử lý | "Hãy nghĩ về cách các hệ thống lớn thường xử lý [vấn đề này]." | Hỏi theo red flag |
| **Không liên quan** | Nói về chủ đề khác | "Hãy focus vào [component/scenario] nhé." | Hỏi lại câu hỏi chính, không scan red flag |

**Red flag và followup question:**

Ví dụ với bài toán TikTok:

```
deep_dive_questions: [
  {
    type: "scale",
    key: "database_scale",
    question: "Database là bottleneck khi traffic tăng 10x — bạn sẽ xử lý thế nào?",
    expected_solutions: [
      {
        key: "read_replicas",
        red_flag: "không đề cập read replicas cho read-heavy system",
        followup_question: "Hệ thống này read-heavy — bạn có thể tách read và write không?"
      },
      {
        key: "sharding_strategy",
        red_flag: "đề cập sharding nhưng không nêu strategy cụ thể",
        followup_question: "Bạn sẽ shard theo tiêu chí nào — user ID, region, hay cách khác?"
      }
    ]
  },
  {
    type: "edge_case",
    key: "viral_video",
    question: "Một video viral được 10 triệu người xem cùng lúc — hệ thống của bạn xử lý thế nào?",
    expected_solutions: [
      {
        key: "cdn_hotspot",
        red_flag: "không đề cập CDN để xử lý hotspot",
        followup_question: "Nếu tất cả requests đều đến object storage trực tiếp, điều gì xảy ra?"
      },
      {
        key: "cache_ttl_strategy",
        red_flag: "không đề cập strategy cache cho hot content",
        followup_question: "Video viral cần được cache như thế nào khác so với video thông thường?"
      }
    ]
  },
  {
    type: "scale",
    key: "multi_region",
    question: "Hệ thống cần phục vụ users ở nhiều region trên thế giới — bạn sẽ thay đổi gì?",
    expected_solutions: [
      {
        key: "geo_distribution",
        red_flag: "không đề cập data replication giữa regions",
        followup_question: "User ở Việt Nam access video từ server ở US — latency sẽ như thế nào?"
      }
    ]
  }
]
```

**Limits per question:**
- `thiếu_count` ≤ 2
- `yếu_count` ≤ 1
- `irrelevant_count` ≤ 1
- Vượt limit → fill + flag + next question

*(Counter reset khi sang câu hỏi mới)*

---

## Flow tổng thể Phase 5

```
[I] Bottleneck/Edge Case: Question 1
     │
     ▼ evaluate → respond → scan red flags → followup nếu cần
     │
[I] Bottleneck/Edge Case: Question 2
[I] Bottleneck/Edge Case: Question N
     │
     ▼
Phase 5 complete → Session feedback
```

---

## Nguồn dữ liệu cần có per problem

```
Problem:
  name: "Design TikTok"

  deep_dive_questions:
    - type: "scale"
      key: "database_scale"
      question: "Database là bottleneck khi traffic tăng 10x — bạn sẽ xử lý thế nào?"
      expected_result: "Candidate đề xuất read replicas để scale read path + sharding strategy cụ thể (theo user_id hoặc video_id) với trade-off rõ ràng"
      expected_solutions:
        - key: "read_replicas"
          red_flag: "không đề cập read replicas"
          followup_question: "Bạn có thể tách read và write không?"
          fill_answer: "Read replicas: write → primary; read → replicas. Giảm tải primary, scale read độc lập"
        - key: "sharding"
          red_flag: "đề cập sharding nhưng không nêu strategy cụ thể"
          followup_question: "Bạn sẽ shard theo tiêu chí nào?"
          fill_answer: "Shard theo user_id: user và video cùng shard → giảm cross-shard query khi load feed"
    - type: "edge_case"
      key: "viral_video"
      question: "Một video viral được 10 triệu người xem cùng lúc — hệ thống xử lý thế nào?"
      expected_result: "Candidate đề xuất CDN để absorb hot content requests + cache strategy riêng cho hot content (longer TTL hoặc pre-warm)"
      expected_solutions:
        - key: "cdn_hotspot"
          canvas_node: "cdn"     # kiểm tra canvas: nếu CDN đã có → candidate chỉ cần giải thích cơ chế, không cần vẽ lại
          red_flag: "không đề cập CDN cho hotspot"
          followup_question: "Nếu tất cả requests đến object storage trực tiếp, điều gì xảy ra?"
          fill_answer: "CDN cache video gần user → 10M requests hit CDN edge, không đến origin storage"
        - key: "cache_ttl_strategy"
          red_flag: "không đề cập strategy cache cho hot content"
          followup_question: "Video viral cần được cache như thế nào khác so với video thông thường?"
          fill_answer: "Hot content: longer TTL, pre-warm CDN nodes. Thông thường: standard TTL, evict khi ít view"
    - type: "scale"
      key: "multi_region"
      question: "Hệ thống cần phục vụ users ở nhiều region — bạn sẽ thay đổi gì?"
      expected_result: "Candidate đề xuất CDN global + data replication strategy + giải thích trade-off consistency khi geo-distributed"
      expected_solutions:
        - key: "cdn_global"
          canvas_node: "cdn"     # nếu CDN đã có → đánh giá candidate có giải thích thêm về geo context không
          red_flag: "không đề cập CDN hoặc edge nodes để giảm latency theo region"
          followup_question: "User ở Việt Nam access video từ server ở US — latency sẽ như thế nào?"
          fill_answer: "CDN với edge nodes toàn cầu → user lấy từ node gần nhất, không phải origin"
        - key: "data_replication"
          red_flag: "không đề cập replication metadata giữa regions"
          followup_question: "Nếu một region down, users ở region khác vẫn xem được không?"
          fill_answer: "Replicate data sang region gần user; video → CDN toàn cầu; metadata → eventual consistency giữa regions"
```
