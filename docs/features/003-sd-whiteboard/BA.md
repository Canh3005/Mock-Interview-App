## WHAT

Khi ứng viên hoàn thành phase Clarification trong phỏng vấn System Design, canvas (bảng vẽ kiến trúc) được unlock. Ứng viên kéo-thả các node chuẩn (Load Balancer, Database, Cache, Message Queue, v.v.) để vẽ kiến trúc, nối các node bằng edge có label mô tả data flow. Diagram tự động export thành JSON metadata mỗi khi thay đổi — AI Interviewer dùng JSON này để đánh giá realtime, không dùng image/screenshot.

---

## WHY

System Design là vòng thi đòi hỏi ứng viên vẽ sơ đồ kiến trúc để giải thích cách xây dựng hệ thống. Bảng vẽ chuẩn (với node library cố định) đảm bảo:

1. **JSON extraction chính xác 100%** — Không dùng Vision AI để "đọc" ảnh diagram (tốn token, hallucination cao). Mỗi thay đổi diagram → JSON structure → dễ dàng eval realtime
2. **Phase-gate logic** — Canvas chỉ unlock sau Clarification → ứng viên không thể skip vào vẽ diagram trước khi hỏi đủ yêu cầu
3. **Evaluation trực tiếp** — Epic 3 (AI Interviewer) sử dụng JSON để so sánh với reference architecture (từ problem bank), tính component coverage realtime
4. **Auto-save + recovery** — Diagram lưu mỗi 30s, ứng viên không mất công nếu reload hoặc đứt kết nối

---

## Epic Context

**Nằm trong:** Phase 3 — System Design Mock Interview Round

**Vị trí trong epic:**
- **Phụ thuộc vào:** Epic 0 (SD Problem Bank phải có reference architecture dạng JSON) + Epic 1 (SDSession entity phải tồn tại)
- **Cung cấp cho:** Epic 3 (AI Interviewer dùng ArchitectureJSON để đánh giá realtime)
- **Được đánh giá bởi:** Epic 4 (Evaluation Engine dùng finalArchitectureJSON từ canvas)

**Luồng lớn hơn:**
- Candidate → Clarification phase (text chat, canvas locked)
- → Canvas unlock → High-level Architecture phase (vẽ diagram, chat song song)
- → Deep Dive phase (AI hỏi về component trong diagram)
- → Edge Cases phase (curveball scenarios)
- → Kết thúc → Debrief (so sánh diagram ứng viên với reference architecture)

**Vì sao tách epic:** Canvas là UI-only component, không phụ thuộc vào AI Interviewer logic. Có thể triển khai song song với Epic 3 sau khi Epic 0+1 done. Giá trị riêng: cung cấp structured ArchitectureJSON contract cho các epic phía sau.

---

## SCOPE

**In:**
- **Node Library chuẩn** (drag & drop): 
  - Client, Load Balancer, API Gateway, Web Server/Microservice, Cache (Redis), Message Queue (Kafka/SQS), Database (SQL/NoSQL), Object Storage (S3), CDN, Worker, External Service
  - Mỗi node có icon nhận diện (từ lucide-react), label editable, color-coded by type
- **Edge (connection) có label:** Nối giữa 2 node bằng line có label (HTTP, gRPC, Pub/Sub, Read, Write, Async, Sync, v.v.)
- **Canvas locked/unlock logic:**
  - Lúc load SDSession: canvas bị lock (disable drag-drop, edge creation, node deletion)
  - Khi `phase === 'HIGH_LEVEL_ARCHITECTURE'`: canvas unlock, ứng viên có thể vẽ
  - Phía backend: PATCH endpoint để update `phase` (từ Epic 3)
- **JSON Metadata Extraction tự động:** Mỗi 2 giây (debounced), canvas export `ArchitectureJSON = { nodes: [{id, type, label, position}], edges: [{from, to, label}] }` → store vào SDSession.architectureJSON
- **Auto-save:** Gửi ArchitectureJSON tới backend mỗi 30 giây (throttled), lưu vào DB
- **Diagram rendering readonly:** Sau khi session kết thúc, load diagram từ DB để hiển thị ở phase Debrief (read-only, không edit)
- **Walkthrough input — 2 mode song song:**
  - **Voice:** Ứng viên giữ phím (hoặc click nút) → ghi âm → transcript (dùng Web Speech API + `useVoiceInput` hook từ behavioral round)
  - **Text:** Chat box input tương tự Epic 1/3, gửi realtime vào transcript history
- **Canvas state recovery:** Nếu reload page trong khi vẽ → load last saved ArchitectureJSON từ DB, restore diagram ngay (không mất công)

**Out:**
- Freehand drawing tool (chỉ dùng node library chuẩn)
- Vision AI để "đọc" hoặc parse diagram từ image
- Real-time collaboration (không support multiple users vẽ cùng 1 canvas)
- Diagram export PDF/PNG (chỉ export JSON)
- Custom node/shape creation (cố định 11 loại node)

**Depends on:**
- `001-sd-problem-bank` — SDProblem entity phải có reference architecture dạng JSON (để debrief compare sau)
- `002-sd-personalization-setup` — SDSession entity phải tồn tại; `phase` field được update từ Epic 3

**Blocks:**
- Epic 3 (AI Interviewer không thể đánh giá realtime nếu không có ArchitectureJSON)
- Epic 4 (Evaluation Engine cần finalArchitectureJSON để tính điểm)

---

## Business Flow

### Happy Path

**Setup Canvas (Ứng viên vào phòng SD, phase=CLARIFICATION)**
1. FE load SDSession từ `/sd-sessions/:sdSessionId` → `phase === 'CLARIFICATION'` → canvas render nhưng **disabled** (visual: mờ, message "Canvas sẽ unlock sau Clarification phase")
2. Ứng viên chat clarify yêu cầu với AI Interviewer (Epic 3)
3. AI xác nhận clarification OK → Backend PATCH `/sd-sessions/:id { phase: 'HIGH_LEVEL_ARCHITECTURE' }`
4. FE nhận update → canvas **unlock**, ứng viên có thể bắt đầu vẽ

**Vẽ Diagram (Phase HIGH_LEVEL_ARCHITECTURE)**
1. Ứng viên drag node từ library vào canvas → node xuất hiện với default position + label
2. Ứng viên rename node (click label để edit)
3. Ứng viên nối 2 node bằng edge → dialog "Chọn loại kết nối" (HTTP, gRPC, Pub/Sub, Read, Write, Async, Sync) → edge hiển thị với label
4. Ứng viên có thể xóa node hoặc edge (right-click → delete)
5. Mỗi thay đổi (add node, move node, add edge, relabel) → debounce 2s → export ArchitectureJSON
6. Mỗi 30s → gửi ArchitectureJSON tới `/sd-sessions/:id` để auto-save (throttled)
7. AI Interviewer Engine (Epic 3) nhận JSON diff realtime → theo dõi `componentCoverage` và `phase` để quyết định khi nào inject curveball

**Walkthrough Song Song**
1. Ứng viên có thể click "🎤 Ghi âm" hoặc nhập text vào chat box khi đang vẽ
2. Voice/Text transcript được gắn timestamp → lưu vào `transcriptHistory`
3. Cả voice lẫn text đều vào transcript (không toggle, luôn có cả 2 option)

**Phase Transition (DEEP_DIVE, EDGE_CASES)**
1. Khi AI chuyển sang phase DEEP_DIVE/EDGE_CASES, backend PATCH `phase` update
2. Canvas vẫn **unlock** để ứng viên có thể vẽ thêm nếu cần (không lock lại)
3. ArchitectureJSON vẫn được ghi lại mỗi thay đổi

**Kết Thúc Session**
1. Khi session end (hết giờ hoặc ứng viên click "Kết thúc"), backend lưu final `architectureJSON` + `transcriptHistory`
2. FE chuyển sang Debrief phase → load final diagram (read-only) để so sánh với reference architecture

### Edge Cases & Business Rules

| Trường hợp | Hành động | Kết quả từ góc nhìn user |
|-----------|-----------|-------------------------|
| Canvas reload trong khi vẽ | FE gọi GET `/sd-sessions/:id` → restore last saved ArchitectureJSON | Diagram được khôi phục ngay, không mất node nào |
| Network lag → auto-save fail | Client-side queue diagram changes, retry mỗi 5s | UX hiển thị "⚠️ Chưa lưu — đang thử lại…", diagram vẫn editable |
| Ứng viên không vẽ gì (blank canvas) sau 30 phút vẽ | Vẫn cho phép kết thúc session (không bắt phải vẽ) | Diagram rỗng được lưu, Evaluation Engine tính score thấp nhưng không error |
| Ứng viên vẽ > 100 nodes (edge case lạ) | Canvas vẫn cho phép (không cap), nhưng warning "Diagram rất phức tạp" | Diagram lưu được, Evaluation Engine xử lý được (JSON cấu trúc không đổi) |
| Voice transcript accuracy thấp (STT fail) | STT confidence < 70% → flag "Xin bạn xác nhận" dưới text → user có thể edit | Transcript được verify/correct trước khi lưu vào history |
| Ứng viên tắt canvas lock bằng devtools 🚫 | FE không validate lock status khi render, nhưng backend PATCH phase phải check (canvas chỉ unlock nếu `phase !== 'CLARIFICATION'`) | Nếu FE bị tamper → canvas editable sớm, nhưng Epic 3 không ghi vào history vì phase sai (safe) |

**Business Rules:**

- **Canvas chỉ unlock khi `phase !== 'CLARIFICATION'`** → không thể bỏ qua clarification phase bằng cách hack
- **Diagram rỗng được phép kết thúc session** → không yêu cầu tối thiểu số node (evaluation sẽ tính thấp)
- **Mỗi change → JSON export → auto-save mỗi 30s** → ứng viên không phải manual save
- **Transcript (voice + text) luôn được ghi** → không có skip/discard option

---

## Acceptance Criteria

```
**AC 1: Canvas Lock/Unlock theo Phase**
Given SDSession load với phase="CLARIFICATION"
When canvas render
Then canvas bị disable visually (mờ, không thể drag/drop), hiển thị message "Unlock sau Clarification"

Given backend PATCH /sd-sessions/:id { phase: "HIGH_LEVEL_ARCHITECTURE" }
When FE receive update
Then canvas unlock immediately, ứng viên có thể drag node + create edge

---

**AC 2: Node + Edge Operations**
Given canvas unlock
When ứng viên drag 1 node từ library vào canvas
Then node xuất hiện tại position được drag, có default label (vd. "Load Balancer 1")

Given node đã trên canvas
When ứng viên click label → edit → blur
Then node label được update, ArchitectureJSON export với label mới

Given 2 node trên canvas
When ứng viên drag từ node A tới node B → chọn edge label (HTTP/gRPC/...)
Then edge hiển thị kèm label, ArchitectureJSON có entry { from: A.id, to: B.id, label: "HTTP" }

Given node/edge trên canvas
When right-click → delete
Then node/edge xóa khỏi canvas, ArchitectureJSON update ngay (debounce 2s)

---

**AC 3: JSON Metadata Export**
Given ứng viên vẽ 1 client → 1 load balancer → 2 servers
When mỗi thay đổi (add/move/relabel), debounce 2s
Then ArchitectureJSON = 
{
  "nodes": [
    { "id": "client-1", "type": "Client", "label": "Web Browser", "position": {...} },
    { "id": "lb-1", "type": "LoadBalancer", "label": "LB", "position": {...} },
    { "id": "server-1", "type": "WebServer", "label": "API Server 1", "position": {...} },
    { "id": "server-2", "type": "WebServer", "label": "API Server 2", "position": {...} }
  ],
  "edges": [
    { "from": "client-1", "to": "lb-1", "label": "HTTP" },
    { "from": "lb-1", "to": "server-1", "label": "HTTP" },
    { "from": "lb-1", "to": "server-2", "label": "HTTP" }
  ]
}

---

**AC 4: Auto-save**
Given ArchitectureJSON đã export
When every 30 seconds (throttled)
Then gửi PATCH /sd-sessions/:id { architectureJSON: {...} } tới backend
     Server lưu vào DB, trả về 200

Given network lag → auto-save fail
When retry mỗi 5s
Then UI hiển thị "⚠️ Chưa lưu", diagram vẫn editable (không block)

---

**AC 5: Canvas Recovery**
Given ứng viên vẽ diagram, auto-save thành công, sau đó reload page
When FE mount canvas component, gọi GET /sd-sessions/:id
Then load last saved ArchitectureJSON → restore diagram ngay lập tức
     ứng viên thấy diagram đã vẽ trước khi reload (không mất dữ liệu)

---

**AC 6: Walkthrough Input (Voice + Text)**
Given canvas unlock, ứng viên đang vẽ
When click "🎤 Ghi âm" → speak → stop
Then voice transcript được convert thành text, gắn timestamp
     Lưu vào transcriptHistory (ngoài JSON diagram)

Given canvas unlock
When ứng viên nhập text vào chat box → send
Then text transcript gắn timestamp, lưu vào transcriptHistory
     Hiển thị realtime trong chat panel

Given voice transcript confidence < 70%
When STT return low confidence result
Then hiển thị "Xin bạn xác nhận: [text]" → user edit → confirm
     Confirmed text được lưu (không chứa lỗi STT)

---

**AC 7: Readonly Diagram (Debrief)**
Given session kết thúc
When ứng viên vào Debrief phase
Then canvas load final architectureJSON (read-only)
     Canvas disabled hoàn toàn (không drag, không edit)
     Hiển thị song song với reference architecture để compare
```

---

## Risk

**HIGH** — Có 2 rủi ro chính:

**1. Canvas Lock Bypass:**
- **Impact:** Ứng viên có thể vẽ diagram trước khi hoàn thành Clarification phase, làm sai lệch evaluation (AI không biết ứng viên skip yêu cầu scope)
- **Mitigation:** Backend check `phase` trước khi accept PATCH architectureJSON. Nếu phase=CLARIFICATION, từ chối update. FE-side lock chỉ là UX, backend-side lock là protection

**2. JSON Extraction Failure / Diagram Corruption:**
- **Impact:** Nếu ArchitectureJSON export sai (node ID trùng, edge invalid), Evaluation Engine không so sánh được với reference architecture → score sai
- **Mitigation:** FE validate ArchitectureJSON trước export (đảm bảo unique node IDs, edge from/to valid). Backend validation khi persist. Evaluation Engine có fallback rule: nếu JSON invalid → ask user reupload diagram

**3. Real-time Performance (Canvas lag khi vẽ nhiều node):**
- **Impact:** UX bị lag, ứng viên bực tức, abandon session
- **Mitigation:** Debounce 2s trước export JSON (không export mỗi pixel move). Virtual scroll nếu > 50 nodes. Monitor FE performance metrics

**4. Voice STT Accuracy (Tiếng Việt technical terms):**
- **Impact:** Transcript sai → Evaluation Engine tính Trade-off Articulation sai → score impact
- **Mitigation:** STT confidence threshold 70%, dưới đó → flag confirm. Text input luôn available (fallback)

---

## Notes cho Dev Phase

- **Node library:** 11 loại chuẩn (dùng lucide-react icons, không emoji). Tham khảo design từ Eraser.io / Cloudcraft
- **Canvas tech:** Khuyến khích dùng **React Flow** (react-flow-renderer) hoặc **Konva.js** — có sẵn đầy đủ drag-drop, position tracking, JSON export
- **API Contract cần từ Epic 0:** 
  - `SDProblem.referenceArchitecture` phải là JSON format `{ nodes, edges }`
  - `SDProblem.expectedComponents` để Evaluation Engine so sánh
- **API Contract cần từ Epic 1:**
  - `SDSession` có field `architectureJSON`, `transcriptHistory`, `phase`
  - Backend update `phase` từ Epic 3 via PATCH endpoint
