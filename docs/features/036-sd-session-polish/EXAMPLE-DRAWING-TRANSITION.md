# Ví dụ flow — Drawing Phase Transition

**Bài toán:** URL Shortener | tiếp theo Stage 1

---

## Case 1 — Graph đủ (happy path)

**Candidate ấn Done.** Canvas: `Client → API Gateway → AppServer → PostgreSQL` (4 nodes)

**BE chạy graph check:**
```ts
SDDrawingTransitionCriteria = { emptyThreshold: 0, sparseThreshold: 3, requiredNodeTypes: ['client', 'database'] }

nodeCount = 4               // ≥ sparseThreshold → "Đủ"
requiredNodeTypes present   // 'client' ✓, 'database' (PostgreSQL) ✓
```

**Snapshot lưu:**
```ts
SDGraphSnapshot = {
  stage: 'DESIGN_DRAWING',
  graph: { nodes: [client, api_gateway, app_server, postgres], edges: [c→api, api→app, app→db] },
  metrics: {
    componentCoverage: 0.6,       // thiếu cache, queue
    topologyCoverage: 0.7,
    dataFlowCompleteness: 0.5,    // write path không rõ
    requirementAlignment: 0.8,
    architectureSimplicity: 1.0
  }
}
```

**Decision:** `TRANSITION_STAGE` — Walkthrough planner dùng `WALKTHROUGH_OPEN`

**Candidate nhận:** *"Good. Walk me through your design."*

---

## Case 2 — Graph sparse (edge case)

**Candidate ấn Done.** Canvas chỉ có: `Client → AppServer` (2 nodes, không có database)

**BE chạy graph check:**
```ts
nodeCount = 2                // < sparseThreshold = 3 → "Sparse"
requiredNodeTypes missing    // 'database' không có ✗
```

**Decision:** `TRANSITION_STAGE` (sparse — không block, nhưng ghi lại coverage thấp)

**Snapshot lưu:**
```ts
SDGraphSnapshot = {
  metrics: {
    componentCoverage: 0.2,       // thiếu api_gateway, cache, database
    topologyCoverage: 0.3,
    dataFlowCompleteness: 0.1,
    requirementAlignment: 0.3,
    architectureSimplicity: 1.0
  }
}
```

**Walkthrough Planner nhận graph sparse** → chọn `WALKTHROUGH_OPEN_GAP` thay vì `WALKTHROUGH_OPEN`

**Candidate nhận:** *"Let's start with the data storage side — where does the URL mapping live in your design?"*

> Planner target vào critical gap (`database` missing) thay vì ask end-to-end.

---

## Case 3 — Canvas trống (edge case)

**Candidate ấn Done.** Canvas: 0 nodes.

**BE chạy graph check:**
```ts
nodeCount = 0   // = emptyThreshold → nudge, không transition
```

**Decision:** Nudge nhẹ một lần. Không lưu snapshot, không transition.

**Candidate nhận:** *"Looks like the canvas is empty — go ahead and sketch your design first."*

Candidate vẽ thêm sau đó ấn Done lần 2 → BE re-check, rơi vào Case 1 hoặc Case 2.

> Không có vòng lặp "nudge mãi" — chỉ nudge một lần duy nhất. Lần Done tiếp theo luôn transition dù canvas vẫn sparse.
