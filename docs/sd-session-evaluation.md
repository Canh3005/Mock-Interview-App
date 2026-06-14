# SD Session — Evaluation Flow

## Tổng quan

Evaluation được thiết kế 3 tầng: thu thập dữ liệu từng lượt (turn) → tổng hợp theo phase → map ra skill gap toàn session. Mục tiêu cuối là cho candidate biết **cụ thể họ thiếu gì, ở đâu, và cần luyện tập gì**.

---

## Tầng 1 — Turn Metrics

Mỗi lượt câu hỏi, hệ thống ghi lại một `turn_record`:

```yaml
turn_record:
  phase: 4
  question_key: "upload_video"
  initial_evaluation: "thiếu"       # đánh giá lần đầu trước bất kỳ followup nào
  followup_rounds: 2                 # số vòng followup đã thực hiện
  resolved_items:                    # items candidate tự resolve (không cần fill)
    - item_key: "video_table"
      rounds_needed: 0               # 0 = tự resolve không cần followup
    - item_key: "db_type_justification"
      rounds_needed: 1               # resolve sau 1 vòng followup
  fill_events:                       # items phải fill — tín hiệu yếu nhất
    - item_key: "object_storage"
      followup_count_at_fill: 2
  optional_items_added:              # items optional candidate chủ động thêm (điểm cộng)
    - item_key: "cdn"
  extra_node_events:                 # nodes candidate vẽ ngoài reference_graph
    - node_key: "message_queue"
      in_known_extra_nodes: true     # có trong known_extra_nodes của data model
      candidate_justified: true      # candidate giải thích được
      evaluation: "valid_advanced"   # valid_advanced / unjustified / misunderstanding
    - node_key: "blockchain_storage"
      in_known_extra_nodes: false
      candidate_justified: false
      evaluation: "misunderstanding"
```

### Ba mức độ của một item

| Mức | Ý nghĩa | Signal |
|---|---|---|
| **Tự resolve** (`rounds_needed: 0`) | Candidate biết và nói ngay | Mạnh — kiến thức vững |
| **Resolve sau gợi ý** (`rounds_needed: ≥1`) | Biết nhưng cần nhắc | Trung bình — biết nhưng chưa reflex |
| **Fill event** | Không đến được dù đã được gợi ý | Yếu — gap kiến thức thực sự |

---

## Tầng 2 — Phase Summary

### Dimensions per phase

Mỗi phase được đánh giá theo 2–3 dimension riêng, phản ánh kỹ năng đặc thù của phase đó:

| Phase | Dimension | Đo lường |
|---|---|---|
| Phase 1 | `completeness` | Clarify đủ constraints không |
| Phase 1 | `synthesis` | Closing summary đầy đủ và chính xác không |
| Phase 2 | `nfr_coverage` | Đủ NFR dimensions không |
| Phase 2 | `reasoning_quality` | Mỗi NFR có justify không |
| Phase 2 | `tradeoff_awareness` | Có đề cập trade-off không |
| Phase 3 | `calculation_approach` | Show assumptions + bước tính không |
| Phase 3 | `architecture_connection` | Kết nối số với design decision không |
| Phase 4 | `component_correctness` | Required nodes có trên canvas không |
| Phase 4 | `design_reasoning` | Justify từng lựa chọn không |
| Phase 4 | `cross_feature_coherence` | Kết nối các feature với nhau không |
| Phase 5 | `bottleneck_identification` | Xác định đúng bottleneck không |
| Phase 5 | `solution_knowledge` | Biết scaling pattern phù hợp không |
| Phase 5 | `tradeoff_articulation` | Giải thích trade-off của giải pháp không |

### Công thức tính dimension score

```
dimension_items = [items thuộc dimension này, optional: false]

self_resolved   = count(items với rounds_needed == 0)
prompted        = count(items với rounds_needed >= 1, không fill)
filled          = count(fill_events)
total           = self_resolved + prompted + filled

score_label:
  tốt           → self_resolved / total >= 0.75 AND filled == 0
  đạt           → (self_resolved + prompted) / total >= 0.5 AND filled <= 1
  cần cải thiện → (self_resolved + prompted) / total < 0.5 OR filled >= 2
  yếu           → filled / total > 0.5
```

### Phase score

Phase score = dimension score thấp nhất trong phase đó (bottleneck dimension drives overall phase).

```yaml
phase_summary:
  phase: 4
  score: "đạt"
  dimensions:
    component_correctness:
      score: "cần cải thiện"
      self_resolved: 1
      prompted: 1
      filled: 1           # object_storage bị fill
      total: 3
    design_reasoning:
      score: "đạt"
      self_resolved: 2
      prompted: 1
      filled: 0
      total: 3
    cross_feature_coherence:
      score: "tốt"
      self_resolved: 1
      prompted: 0
      filled: 0
      total: 1
  fill_events:
    - question_key: "upload_video"
      item_key: "object_storage"
  optional_added:
    - question_key: "upload_video"
      item_key: "cdn"
```

---

## Tầng 3 — Skill Gap Map

### Skill tag taxonomy

Mỗi item trong `evaluation_checklist` / `expected_constraints` / `expected_reasoning` / `expected_solutions` mang một `skill_tag`. Các tag có thể có:

| Skill tag | Mô tả | Phases liên quan |
|---|---|---|
| `fr_clarification` | Làm rõ functional requirements đủ và đúng | Phase 1 |
| `synthesis` | Tổng kết và kết nối các điểm đã clarify | Phase 1 |
| `nfr_reasoning` | Nêu NFR kèm justify, không chỉ đặt tên | Phase 2 |
| `tradeoff_awareness` | Nhận ra và giải thích trade-off | Phase 2, 5 |
| `scale_estimation` | Back-of-envelope với assumptions rõ | Phase 3 |
| `architecture_connection` | Kết nối con số / NFR với design decision | Phase 3, 4 |
| `storage_design` | Chọn đúng loại storage cho từng use case | Phase 4 |
| `db_selection` | Justify SQL vs NoSQL theo đặc điểm data | Phase 4 |
| `caching_strategy` | Cache layer, pre-build vs on-demand, invalidation | Phase 4, 5 |
| `read_write_optimization` | Read replicas, read-heavy insight | Phase 4, 5 |
| `naive_first_thinking` | Trình bày naive solution trước khi optimize | Phase 4 |
| `cross_component_coherence` | Kết nối các component/feature với nhau | Phase 4 |
| `bottleneck_identification` | Xác định điểm nghẽn khi scale | Phase 5 |
| `scaling_patterns` | CDN, sharding, LB, auto-scaling | Phase 5 |

### Aggregation — map fill_events sang skill gaps

```
skill_gap_map = {}

for each fill_event in session:
  skill_tag = lookup item_key → skill_tag (từ data model)
  skill_gap_map[skill_tag].evidence.append({
    phase, question_key, item_key, followup_count_at_fill
  })

for each prompted_item (rounds_needed >= 2) in session:
  skill_tag = lookup item_key → skill_tag
  skill_gap_map[skill_tag].prompted_evidence.append(...)
```

Severity:
- `nghiêm trọng`: có ít nhất 1 fill_event với tag này
- `cần chú ý`: không có fill nhưng rounds_needed >= 2 ở nhiều câu
- `nhẹ`: rounds_needed == 1, chỉ xuất hiện 1 lần

**Extra node events** được aggregate riêng — không map vào skill_gap mà vào hai bucket:

```
advanced_signals:                    # extra nodes được justified tốt → điểm cộng
  - node_key: "message_queue"
    question_key: "upload_video"
    context: "candidate chủ động thiết kế async transcoding pipeline"

design_issues:                       # unjustified hoặc misunderstanding
  - node_key: "blockchain_storage"
    question_key: "upload_video"
    evaluation: "misunderstanding"
    skill_tag: "storage_design"      # map sang skill_tag để aggregate vào gap
```

`misunderstanding` events được merge vào `skill_gap_map` với severity `nghiêm trọng` (nặng hơn fill event vì candidate chủ động chọn sai, không phải chỉ thiếu).

---

## Feedback Format

Feedback được hiển thị cho candidate sau khi session kết thúc, gồm 4 phần:

### 1. Tổng kết nhanh

```
Kết quả: [Tốt / Đạt / Cần cải thiện / Yếu]

Phase 1 — FR Clarification:   [score]
Phase 2 — NFR:                 [score]
Phase 3 — Scale Estimation:    [score]
Phase 4 — HLD:                 [score]
Phase 5 — Deep Dive:           [score]
```

### 2. Chi tiết theo phase

Với mỗi phase, hiển thị:
- Score từng dimension
- **Fill events** (được highlight rõ — đây là điểm yếu chính)
- Items resolve sau gợi ý (biết nhưng chưa tự phát)
- Optional items đã thêm được (điểm cộng)

Ví dụ:
```
Phase 4 — HLD: CẦN CẢI THIỆN

  Component Correctness: cần cải thiện
  ⚠ Phải fill: object_storage (upload_video)
     → Bạn chưa đề cập nơi lưu video binary dù đã được gợi ý 2 lần
  ✓ Tự resolve: video_table, db_type_justification
  ✓ Resolve sau gợi ý: read_replica (view_feed)

  Design Reasoning: đạt
  ✓ Tự resolve: db_type_justification, read_heavy_insight
  ~ Resolve sau gợi ý (1 lần): url_stored_not_binary

  Cross-feature Coherence: tốt
  ✓ Tự kết nối user_activity → pre_cache_service

  Điểm cộng: Chủ động thêm CDN vào design (optional)
  ★ Advanced: Tự thêm message_queue cho async transcoding — giải thích hợp lý
  ✗ Lưu ý: blockchain_storage không phù hợp với bài toán này — kiểm tra lại hiểu biết về storage design
```

### 3. Skill gap map

Liệt kê các gap được nhóm theo skill tag, severity cao nhất lên đầu:

```
ĐIỂM YẾU CẦN LƯU Ý:

⚠ storage_design [nghiêm trọng]
  Bằng chứng: Phase 4 upload_video — fill: object_storage
  Luyện tập: Khi nào dùng object storage vs relational DB vs file system?
             Tại sao không lưu video binary vào DB?

~ nfr_reasoning [cần chú ý]
  Bằng chứng: Phase 2 availability — resolve sau 1 gợi ý
              Phase 4 db_type_justification — resolve sau 1 gợi ý
  Luyện tập: Với mỗi NFR, luôn kèm câu "tại sao hệ thống này cần mức đó"

ĐIỂM MẠNH:
✓ caching_strategy — Thiết kế pre_cache_service + read_replica đúng và tự giải thích
✓ cross_component_coherence — Tự kết nối user_activity với feed pipeline
```

### 4. Gợi ý luyện tập

Với mỗi skill gap `nghiêm trọng` và `cần chú ý`, đưa ra 1–2 câu hỏi practice cụ thể:

```
Gợi ý luyện tập:

storage_design:
  Q: "Thiết kế hệ thống lưu trữ ảnh cho Instagram. Video/ảnh sẽ đi đâu?"
  Q: "Tại sao không lưu binary file vào PostgreSQL? Khi nào thì có thể?"

nfr_reasoning:
  Q: "Với một hệ thống e-commerce, justify mức availability bạn chọn."
  Q: "Hệ thống này cần strong consistency hay eventual consistency — lý do?"
```

---

## Nguồn dữ liệu cần có per problem

Để tính skill gap, mỗi item trong data model của từng phase cần có thêm `skill_tag`:

```yaml
# Ví dụ trong feature_design Phase 4
evaluation_checklist:
  required_nodes:
    - key: "object_storage"
      optional: false
      skill_tag: "storage_design"      # ← dùng để map vào skill gap
      red_flag: "..."
      followup_question: "..."
      fill_answer: "..."

  required_explanations:
    - key: "db_type_justification"
      optional: false
      skill_tag: "db_selection"
      ...
```

Mỗi item chỉ có **1 skill_tag** để tránh dilution khi aggregate.
