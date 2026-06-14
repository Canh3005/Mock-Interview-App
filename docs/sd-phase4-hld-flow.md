# SD Session — Phase 4: High-Level Design (HLD) Flow

## Tổng quan

Phase 4 là giai đoạn thiết kế kiến trúc hệ thống. Candidate vẽ diagram trên canvas **đồng thời** giải thích từng component. Interviewer đi theo từng feature, probe vào các lựa chọn thiết kế, không probe toàn bộ một lúc.

**Điểm khác biệt cốt lõi với Phase 1–3:** Mỗi response của candidate gồm **2 phần**: canvas change (thêm/sửa component trên diagram) + text giải thích. Evaluation dựa trên cả hai.

---

## Cơ chế xử lý mỗi lượt câu hỏi

```
[C] response = canvas change + text explanation
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
     │    │    └─ hỏi followup (context = canvas hiện tại + full conversation)
     │    └─ count > limit HOẶC không còn red flag
     │         └─ fill (add component lên canvas) + flag + next question type
     │
     └─ không liên quan → KHÔNG scan red flags
          ├─ irrelevant_count <= 1 → hỏi lại câu hỏi chính
          └─ irrelevant_count > 1  → fill + flag + next question type
```

**Fill event:**
Fill xảy ra khi `count > limit` hoặc không còn red flag `optional: false` nào để hỏi mà item vẫn chưa có. Interviewer thêm component vào canvas **và thông báo cho candidate** trước khi tiếp tục — khác với Phase 1–3 chỉ nói.

Items `optional: true` không bao giờ bị fill — nếu candidate không thêm thì ghi nhận là "không có" và bỏ qua.

Khi fill, hệ thống ghi lại:
```
fill_event:
  phase: 4
  question_key: "upload_video"
  item_key: "object_storage"
  optional: false
  followup_count_at_fill: 2
  canvas_updated: true             # component đã được thêm lên canvas
```

Fill event là tín hiệu đánh giá mạnh nhất: candidate **không tự đến được** dù đã được gợi ý đủ số lần.

**Node type matching:**
Canvas node được định danh bằng `type` (enum từ `NODE_TYPES`), không phải label. Candidate có thể đặt tên node là "S3", "Google Cloud Storage", hay "Blob Store" — tất cả đều match `ObjectStorage`. Evaluation engine so `type` của node trên canvas với `expected_type` trong checklist.

Nếu candidate dùng sai type (ví dụ `DatabaseNoSQL` thay vì `DatabaseSQL` cho metadata) → không phải "thiếu" mà trigger `wrong_type_probe` riêng.

**Extra node handling:**
Khi candidate vẽ một node **không có trong `reference_graph.optimized`**, interviewer probe ngay:

> *"Bạn có thể giải thích role của [node] trong design này không?"*

Đánh giá explanation:
- **Giải thích được, hợp lý** → `extra_node_justified: true` — tín hiệu tích cực (advanced thinking)
- **Không giải thích được** → `extra_node_justified: false` — flag `unjustified_complexity`
- **Giải thích sai hoặc không liên quan** → flag `design_misunderstanding`

Node có trong `known_extra_nodes` của data model là những node valid nhưng không bắt buộc (ví dụ message queue, transcoding service). Node ngoài danh sách đó mà candidate không giải thích được → `design_misunderstanding` nặng hơn.

Khi gặp extra node, hệ thống ghi lại:
```
extra_node_event:
  phase: 4
  question_key: "upload_video"
  node_key: "message_queue"
  in_known_extra_nodes: true
  candidate_justified: true
  evaluation: "valid_advanced"    # valid_advanced / unjustified / misunderstanding
```

---

## Loại câu hỏi

Phase 4 chỉ có **1 loại câu hỏi**: Feature Design Loop.

---

### Feature Design Loop (N câu — 1 per feature)

> *"Hãy thiết kế [tên feature] nhé."*

Mục đích: candidate thiết kế từng feature end-to-end, vẽ lên canvas và giải thích. Pattern chuẩn: **naive solution trước → optimize sau**.

**Followup list: có** — red flag xuất hiện khi candidate thiếu component quan trọng, thiếu justification, hoặc không connect với NFR đã xác định.

| Mức đánh giá | Rubric | Response của Interviewer | Followup |
|---|---|---|---|
| **Tốt** | Vẽ đúng component + explain role + justify choice + connect với NFR | "Tốt, thiết kế rõ ràng." | — → Feature tiếp hoặc Phase 5 |
| **Thiếu** | Vẽ được nhưng thiếu justification hoặc missing component quan trọng | "Bạn đã có hướng đúng nhưng vẫn còn thiếu." | Hỏi theo red flag |
| **Yếu** | Vẽ sai, component không phù hợp, hoặc không giải thích được | "Hãy thử nghĩ lại — [component] này giải quyết vấn đề gì?" | Hỏi theo red flag |
| **Không liên quan** | Nói về chủ đề khác hoặc thiết kế feature không được yêu cầu | "Hãy focus vào [feature] — bạn cần những component nào?" | Hỏi lại câu hỏi chính, không scan red flag |

**Red flag và followup question:**

Ví dụ với feature `upload_video` của TikTok:

```
feature_design: [
  {
    feature: "upload_video",
    question: "Hãy thiết kế tính năng upload video nhé.",
    expected_components: [
      {
        key: "storage_choice",
        red_flag: "không đề cập đến object storage cho video file",
        followup_question: "Video file sẽ được lưu ở đâu — bạn sẽ dùng loại storage nào?"
      },
      {
        key: "db_choice_justified",
        red_flag: "chọn database mà không giải thích tại sao SQL hay NoSQL",
        followup_question: "Tại sao bạn chọn [SQL/NoSQL] cho metadata — data này có đặc điểm gì?"
      },
      {
        key: "naive_before_optimized",
        red_flag: "bắt đầu thẳng vào optimized solution mà không nêu naive solution trước",
        followup_question: "Nếu chỉ có 100 users, design đơn giản nhất sẽ trông như thế nào?"
      },
      {
        key: "connect_nfr",
        red_flag: "thiết kế component mà không connect với NFR đã xác định ở Phase 2",
        followup_question: "Component này giúp đáp ứng yêu cầu [NFR] như thế nào?"
      }
    ]
  },
  {
    feature: "view_feed",
    question: "Hãy thiết kế tính năng xem feed nhé.",
    expected_components: [
      {
        key: "cache_for_read",
        red_flag: "không đề cập đến caching cho read-heavy path",
        followup_question: "Với hàng triệu requests đọc mỗi ngày, bạn sẽ tối ưu read path như thế nào?"
      },
      {
        key: "cdn_for_media",
        red_flag: "không đề cập đến CDN cho media delivery",
        followup_question: "Người dùng ở nhiều vùng địa lý khác nhau — video được phân phối đến họ như thế nào?"
      }
    ]
  }
]
```

**Limits per feature:**
- `thiếu_count` ≤ 2
- `yếu_count` ≤ 1
- `irrelevant_count` ≤ 1
- Vượt limit → fill (add component lên canvas) + flag + next feature

*(Counter reset khi sang feature mới)*

---

## Flow tổng thể Phase 4

```
[I] Feature Design: Feature 1 (upload_video — write path)
     │
     ▼ evaluate → respond → scan red flags → followup nếu cần
     │
[I] Feature Design: Feature 2 (view_feed — read path)
[I] Feature Design: Feature 3 (user_activity)
[I] Feature Design: Feature N ...
     │
     ▼
Phase 4 complete → Phase 5 (Deep Dive / Scale)
```

---

## Nguồn dữ liệu cần có per problem

```
Problem:
  name: "Design TikTok"

  feature_design:

    # ─────────────────────────────────────────────
    # FEATURE 1: upload_video
    # ─────────────────────────────────────────────
    - feature: "upload_video"
      question: "Hãy thiết kế tính năng upload video nhé."

      reference_graph:
        naive:
          nodes:
            - id: "client"         type: "Client"
            - id: "api_server"     type: "WebServer"     acceptable_types: ["WebServer", "APIGateway"]
            - id: "video_table"    type: "DatabaseSQL"   acceptable_types: ["DatabaseSQL"]
            - id: "object_storage" type: "ObjectStorage" acceptable_types: ["ObjectStorage"]
          edges:
            - from: "client"         to: "api_server"     label: "POST /uploadVideo {video, user_id, metadata}"
            - from: "api_server"     to: "object_storage" label: "upload video binary → get URL"
            - from: "api_server"     to: "video_table"    label: "INSERT {user_id, video_link (url), meta (text)}"
            - from: "api_server"     to: "client"         label: "200 OK"
        optimized:
          nodes: [naive nodes +]
            - id: "cdn"            type: "CDN"           acceptable_types: ["CDN"]
            - id: "load_balancer"  type: "LoadBalancer"  acceptable_types: ["LoadBalancer"]
          edges:
            - from: "client"         to: "cdn"            label: "request"
            - from: "cdn"            to: "load_balancer"  label: "route"
            - from: "load_balancer"  to: "api_server"     label: "forward"

      reference_walkthrough:
        - step: 1
          text: "Client gửi POST /uploadVideo kèm video binary + metadata (caption, user_id)"
        - step: 2
          text: "API server upload video binary lên object storage (S3/BLOB) → nhận về URL"
        - step: 3
          text: "API server INSERT vào video_table: {user_id, uuid, video_link (URL), meta (text)}"
        - step: 4
          text: "API trả 200 OK về client"
        - step: 5
          text: "(optimized) CDN + LB đứng trước API để handle scale và high availability"

      evaluation_checklist:
        required_nodes:
          - key: "object_storage"
            optional: false
            expected_type: "ObjectStorage"
            wrong_type_probe: "Bạn đang dùng [type] để lưu video binary — binary data có thể lưu vào đó không, và sẽ scale thế nào khi có hàng triệu videos?"
            check: "candidate dùng object storage (S3/GCS/BLOB) cho video binary — không lưu thẳng vào DB"
            red_flag: "không đề cập object storage — lưu video vào DB hoặc local disk"
            followup_question: "Video binary file có thể lưu vào relational database được không — tại sao?"
            fill_answer: "Video binary phải lưu vào object storage: binary data quá lớn cho DB row, object storage scale đến PB, chi phí thấp hơn nhiều, CDN integration dễ dàng"
          - key: "video_table"
            optional: false
            expected_type: "DatabaseSQL"
            wrong_type_probe: "Bạn đang dùng DatabaseNoSQL cho video metadata — data này có structured schema và cần JOIN với bảng users. Bạn muốn giải thích vì sao chọn NoSQL không?"
            check: "candidate có bảng riêng cho video metadata với schema hợp lý"
            red_flag: "không tách biệt metadata và binary, hoặc không nêu schema của video table"
            followup_question: "Video table sẽ lưu những field nào?"
            fill_answer: "video_table: user_id (uuid), video_id (uuid), video_link (url → object storage), meta (text/caption)"
          - key: "cdn"
            optional: true       # candidate có thể thêm CDN ở Phase 4 hoặc để đến Phase 5 — cả hai đều hợp lệ
            expected_type: "CDN"
            check: "candidate thêm CDN vào design"
            red_flag: "chưa có CDN trên canvas"
            followup_question: "Video sẽ được phân phối đến users ở nhiều vùng địa lý như thế nào?"
            # fill_answer: không fill — sẽ được xử lý ở Phase 5 nếu thiếu
          - key: "load_balancer"
            optional: true       # tương tự CDN — scale component, không bắt buộc ở HLD phase
            expected_type: "LoadBalancer"
            check: "candidate thêm load balancer trước API server"
            red_flag: "chưa có load balancer"
            followup_question: "Nếu API server bị quá tải hoặc cần deploy không downtime, bạn xử lý thế nào?"
            # fill_answer: không fill
        required_explanations:
          - key: "db_type_justification"
            optional: false
            check: "candidate giải thích tại sao dùng relational DB cho video metadata"
            red_flag: "chọn relational DB nhưng không explain tại sao không dùng NoSQL"
            followup_question: "Tại sao bạn chọn relational database — NoSQL có phù hợp không?"
            fill_answer: "Relational DB phù hợp vì: data có structure rõ ràng, cần JOIN (user → video), query cụ thể và hiệu quả hơn NoSQL với data có schema cố định"
          - key: "naive_before_optimized"
            optional: false
            check: "candidate trình bày naive flow (client → api → db + storage) trước khi thêm CDN/LB"
            red_flag: "nhảy thẳng vào CDN + LB mà không nêu naive flow trước"
            followup_question: "Nếu chỉ có 100 users, flow đơn giản nhất trông như thế nào?"
            fill_answer: "Naive: client → API server → object_storage + video_table. Sau đó thêm CDN + LB khi scale"
          - key: "url_stored_not_binary"
            optional: false
            check: "candidate hiểu rằng DB chỉ lưu URL/link đến object storage, không lưu binary"
            red_flag: "không rõ DB lưu gì — binary hay URL"
            followup_question: "Bảng video_table lưu bản thân video hay lưu gì về video?"
            fill_answer: "DB chỉ lưu video_link (URL trỏ đến object storage). Binary thực sự nằm ở object storage"

      known_extra_nodes:
        # Nodes hợp lệ khi candidate tự thêm nhưng không có trong reference_graph
        - key: "message_queue"
          type: "MessageQueue"
          valid_context: "Async transcoding pipeline — candidate muốn tách upload khỏi video processing"
          probe_question: "Bạn thêm queue vào đây để làm gì?"
        - key: "transcoding_service"
          type: "Worker"
          valid_context: "Video processing service — convert sang nhiều format/resolution trước khi lưu"
          probe_question: "Service này xử lý video như thế nào trước khi lưu vào object storage?"
        - key: "notification_service"
          type: "Worker"
          valid_context: "Notify followers sau khi upload xong"
          probe_question: "Bạn dùng notification service này để làm gì trong upload flow?"

    # ─────────────────────────────────────────────
    # FEATURE 2: view_feed
    # ─────────────────────────────────────────────
    - feature: "view_feed"
      question: "Hãy thiết kế tính năng xem feed nhé."

      reference_graph:
        naive:
          nodes:
            - id: "client"               type: "Client"
            - id: "api_server"           type: "WebServer"     acceptable_types: ["WebServer", "APIGateway"]
            - id: "video_table_primary"  type: "DatabaseSQL"   acceptable_types: ["DatabaseSQL"]
            - id: "object_storage"       type: "ObjectStorage" acceptable_types: ["ObjectStorage"]
          edges:
            - from: "client"              to: "api_server"          label: "GET /viewFeed {user_id}"
            - from: "api_server"          to: "video_table_primary" label: "query video list for user"
            - from: "api_server"          to: "client"              label: "return video URLs"
            - from: "client"              to: "object_storage"      label: "fetch video binaries"
        optimized:
          nodes: [naive nodes +]
            - id: "redis_cache"           type: "Cache"         acceptable_types: ["Cache"]
            - id: "pre_cache_service"     type: "Worker"        acceptable_types: ["Worker"]
            - id: "video_table_readonly"  type: "DatabaseSQL"   acceptable_types: ["DatabaseSQL"]
          edges:
            - from: "video_table_primary" to: "video_table_readonly" label: "replication (read replica)"
            - from: "video_table_readonly" to: "pre_cache_service"   label: "pull following list + video metadata"
            - from: "pre_cache_service"   to: "redis_cache"          label: "build + populate feed per user_id"
            - from: "api_server"          to: "redis_cache"          label: "lookup feed for user_id (replaces direct DB query)"
            - from: "redis_cache"         to: "client"               label: "return pre-built list of video URLs"

      reference_walkthrough:
        - step: 1
          text: "Client gửi GET /viewFeed với user_id"
        - step: 2
          text: "API server lookup Redis cache theo user_id → nhận danh sách ~10 video URL được pre-build sẵn"
        - step: 3
          text: "Client dùng các URL đó để fetch video binary trực tiếp từ object storage"
        - step: 4
          text: "pre_cache_service chạy trong background: đọc từ read-only DB replica (following list + video metadata của những người user đang follow) → biên soạn playlist → ghi vào Redis cache theo user_id"
        - step: 5
          text: "Read replica tách riêng khỏi primary write DB để tránh read load đè lên write path"

      evaluation_checklist:
        required_nodes:
          - key: "redis_cache"
            optional: false
            expected_type: "Cache"
            wrong_type_probe: "Bạn đang dùng [type] làm cache layer — latency của nó so với in-memory cache như Redis thế nào khi read ở scale hàng triệu requests?"
            check: "candidate có cache layer (Redis hoặc tương đương) lưu pre-built feed per user"
            red_flag: "không có cache — GET /viewFeed query thẳng vào DB mỗi lần"
            followup_question: "Nếu 1 triệu user cùng lúc gọi viewFeed, mỗi lần đều query DB thì điều gì xảy ra?"
            fill_answer: "DB sẽ quá tải. Giải pháp: Redis cache lưu pre-built feed per user_id → read từ memory, không hit DB"
          - key: "pre_cache_service"
            optional: false
            expected_type: "Worker"
            wrong_type_probe: "Bạn đang dùng [type] cho background processing — loại component này thường dùng để serve HTTP requests chứ không phải chạy background job. Bạn có muốn điều chỉnh không?"
            check: "candidate có service chạy background để build cache trước — không build tại thời điểm request"
            red_flag: "cache được build on-demand (khi user request) thay vì pre-built trước"
            followup_question: "Cache được build lúc nào — khi user mở app hay trước đó?"
            fill_answer: "pre_cache_service chạy background theo schedule hoặc trigger → build cache trước khi user request → latency gần như 0"
          - key: "read_replica"
            optional: false
            expected_type: "DatabaseSQL"
            wrong_type_probe: "Bạn đang dùng [type] làm read replica — replica thường cùng engine với primary. Bạn có muốn giải thích lý do chọn khác engine không?"
            check: "candidate tách read-only replica khỏi primary write DB"
            red_flag: "pre_cache_service đọc thẳng từ primary write DB"
            followup_question: "pre_cache_service đọc data từ đâu — cùng DB với write không?"
            fill_answer: "pre_cache_service đọc từ read-only replica để không tạo read load lên primary write DB"
        required_explanations:
          - key: "read_heavy_insight"
            optional: false
            check: "candidate nhận ra hệ thống read-heavy và dùng đó để justify cache + read replica"
            red_flag: "có cache nhưng không giải thích tại sao — không link với read-heavy characteristic"
            followup_question: "Tại sao view_feed lại cần cache trong khi upload_video không cần?"
            fill_answer: "View >> Upload ratio (~90% vs 10%). Read-heavy → cache là critical, không phải optional"
          - key: "cache_update_strategy"
            optional: true       # tốt nếu candidate nhắc đến, nhưng không bắt buộc ở HLD phase
            check: "candidate đề cập khi nào cache được refresh/invalidate"
            red_flag: "có cache nhưng không nói cache được update khi nào hoặc TTL bao lâu"
            followup_question: "Nếu user upload video mới, cache của người follow họ được update như thế nào?"
            # fill_answer: không fill — đây là design decision, không có đáp án duy nhất đúng

    # ─────────────────────────────────────────────
    # FEATURE 3: user_activity
    # ─────────────────────────────────────────────
    - feature: "user_activity"
      question: "Hãy thiết kế tính năng user activity (follow, like, comment) nhé."

      reference_graph:
        naive:
          nodes:
            - id: "client"               type: "Client"
            - id: "api_server"           type: "WebServer"    acceptable_types: ["WebServer", "APIGateway"]
            - id: "user_activity_table"  type: "DatabaseSQL"  acceptable_types: ["DatabaseSQL"]
          edges:
            - from: "client"              to: "api_server"           label: "POST /userActivity {action, actor_id, target_id}"
            - from: "api_server"          to: "user_activity_table"  label: "INSERT activity record"
        optimized:
          nodes: [naive nodes + pre_cache_service (type: Worker — reused from view_feed)]
          edges:
            - from: "user_activity_table" to: "pre_cache_service"    label: "activity data feeds recommendation algorithm"

      reference_schema:
        users_table:
          - "user_id: uuid (PK)"
          - "following: FK → users(user_id)  # list of user_ids this user follows"
          - "likes: FK → videos(video_id)    # list of video_ids this user liked"
        user_activity_table:
          - "user_id: uuid (FK → users)"
          - "action: enum (follow / like / comment)"
          - "target_user_id: uuid nullable (FK → users)  # for follow"
          - "target_video_id: uuid nullable (FK → videos) # for like/comment"

      reference_walkthrough:
        - step: 1
          text: "Client gửi POST /userActivity: {action: 'follow'/'like'/'comment', actor_id, target_id}"
        - step: 2
          text: "API server INSERT vào user_activity_table: ghi lại ai làm gì với ai/video nào"
        - step: 3
          text: "Data trong user_activity_table được pre_cache_service đọc để build personalized feed (following list → fetch video của những người đó)"

      evaluation_checklist:
        required_nodes:
          - key: "user_activity_table"
            optional: false
            expected_type: "DatabaseSQL"
            wrong_type_probe: "Bạn đang dùng DatabaseNoSQL cho activity data — data này có FK relationships (following → users, likes → videos). Bạn muốn giải thích cách model relationship đó trong NoSQL không?"
            check: "candidate có bảng riêng cho activity (follow/like) — không trộn vào video_table"
            red_flag: "không có bảng riêng cho user activity"
            followup_question: "Dữ liệu follow và like sẽ được lưu ở đâu?"
            fill_answer: "user_activity_table riêng biệt với foreign keys: following → users, likes → videos"
          - key: "foreign_key_structure"
            optional: false
            check: "candidate nêu foreign key relationships: following FK → users, likes FK → videos"
            red_flag: "có bảng nhưng không rõ schema hoặc relationship với bảng khác"
            followup_question: "Bảng activity cần liên kết với những bảng nào và như thế nào?"
            fill_answer: "following: FK → users (many-to-many); likes: FK → videos (many-to-many)"
        required_explanations:
          - key: "feeds_precache"
            optional: false
            check: "candidate connect user_activity data với pre_cache_service (activity là input để build feed)"
            red_flag: "thiết kế user_activity như endpoint độc lập, không liên kết với view_feed design"
            followup_question: "Data từ user_activity được dùng ở đâu trong hệ thống?"
            fill_answer: "pre_cache_service đọc following list từ user_activity để biết user X cần thấy video của ai → build cache"

```
