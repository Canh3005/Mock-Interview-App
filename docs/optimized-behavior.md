# Optimized Interviewer Behavior — Tổng quan kỹ thuật nâng cao

## Mục tiêu

Nâng cấp hệ thống AI Interviewer từ "hỏi đáp theo script" thành "phỏng vấn viên chân thực" bằng 3 kỹ thuật chuyên sâu. Mỗi kỹ thuật giải quyết một khía cạnh mà interviewer thật có nhưng AI hiện tại đang thiếu.

---

## Hiện trạng hệ thống

| Thành phần | File chính | Vai trò |
|---|---|---|
| Prompt Builder | `server/src/behavioral/prompt-builder.service.ts` | Xây system prompt động theo level/stage |
| Question Orchestrator | `server/src/behavioral/question-orchestrator.service.ts` | Chọn competency anchor, track coverage |
| AI Facilitator | `server/src/behavioral/ai-facilitator.service.ts` | Stream response, check STAR/relevance |
| Behavioral Session | `server/src/behavioral/behavioral-session.service.ts` | Orchestrate toàn bộ interview flow |
| Competency Anchors | `server/src/behavioral/competency-anchors.constant.ts` | Define cấu trúc anchor per stage/level |

**Điểm mạnh hiện tại:** Persona per level, 6-stage structure, STAR evaluation, streaming SSE, competency coverage tracking.

**Điểm yếu cần cải thiện:**
1. Không có depth probing — AI hỏi rộng nhưng không đào sâu
2. Không có cross-stage memory — các stage hoạt động gần như độc lập
3. Câu hỏi có thể đoán trước — không có nguồn real-world interview data

---

## 3 Kỹ thuật nâng cao

### 1. Socratic Depth-First Probing

**Vấn đề:** Hiện tại AI advance anchor sau mỗi 2 user turns bất kể chất lượng câu trả lời. Interviewer thật sẽ drill-down cho đến khi chạm giới hạn kiến thức của candidate.

**Giải pháp:** Thêm `drill_depth` tracking per competency. AI sẽ tự đánh giá xem câu trả lời đã đủ sâu chưa trước khi chuyển anchor.

**Impact:** Cao — thay đổi trực tiếp cách AI tương tác, tạo cảm giác "bị challenge"

> Chi tiết: [`docs/optimized-behavior/01-socratic-depth-first-probing.md`](optimized-behavior/01-socratic-depth-first-probing.md)

---

### 2. Cross-Stage Memory & Contradiction Detection

**Vấn đề:** Stage summaries hiện tại chỉ dùng để "tóm tắt cho context window", không phải để tạo continuity. AI không phát hiện khi candidate tự mâu thuẫn giữa các stage.

**Giải pháp:** Enrich stage summaries với structured claims, sau đó inject contradiction hints vào system prompt của stage sau.

**Impact:** Trung bình-cao — tạo cảm giác interviewer "nhớ mọi thứ" và "đang thực sự nghe"

> Chi tiết: [`docs/optimized-behavior/02-cross-stage-memory-contradiction-detection.md`](optimized-behavior/02-cross-stage-memory-contradiction-detection.md)

---

### 3. RAG-Augmented Persona

**Vấn đề:** Tất cả câu hỏi đều sinh từ LLM dựa trên anchor description → dễ đoán, thiếu tính thực tế, thiếu "mùi" phỏng vấn thật.

**Giải pháp:** Xây vector database chứa real interview questions/transcripts, retrieve relevant questions khi cần, và cho LLM reformulate theo context candidate.

**Impact:** Cao nhưng effort lớn — cần data pipeline, vector DB, và curation

> Chi tiết: [`docs/optimized-behavior/03-rag-augmented-persona.md`](optimized-behavior/03-rag-augmented-persona.md)

---

## Ma trận so sánh

| Tiêu chí | Socratic Probing | Cross-Stage Memory | RAG Persona |
|---|---|---|---|
| **Độ khó implement** | Trung bình | Trung bình | Cao |
| **Effort ước lượng** | 2-3 ngày | 2-3 ngày | 1-2 tuần |
| **Files cần sửa** | 3-4 files | 2-3 files | 5+ files + infra |
| **Phụ thuộc infra mới** | Không | Không | Vector DB (pgvector/Pinecone) |
| **Cải thiện chân thực** | Rất cao | Cao | Rất cao |
| **Risk** | Thấp | Thấp | Trung bình (data quality) |

---

## Thứ tự triển khai khuyến nghị

```
Phase 1: Socratic Depth-First Probing
  → Ít dependency, impact cao nhất per effort
  → Thay đổi core interaction loop

Phase 2: Cross-Stage Memory & Contradiction Detection
  → Build on top of existing stage summaries
  → Không cần infra mới

Phase 3: RAG-Augmented Persona
  → Cần thu thập data trước
  → Deploy song song với Phase 1-2
```

---

## Cách sử dụng tài liệu này

Mỗi file trong `docs/optimized-behavior/` chứa:
- **Phân tích vấn đề** — tại sao cần kỹ thuật này
- **Thiết kế giải pháp** — kiến trúc, data flow, prompt changes
- **Implementation plan** — files cần tạo/sửa, code patterns
- **Đánh giá** — pros, cons, risks, metrics đo lường

Khi muốn thêm kỹ thuật mới, sử dụng skill `/add-technique` để tự động sinh cấu trúc tương tự.
