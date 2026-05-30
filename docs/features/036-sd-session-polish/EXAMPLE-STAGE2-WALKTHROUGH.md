# Ví dụ flow — Stage 2: Architecture Walkthrough

**Bài toán:** URL Shortener | tiếp theo Drawing Phase (graph: `Client → API Gateway → AppServer → PostgreSQL`)

---

## Cách Planner build `promptTemplate` (Option B)

Planner nhận `graph`, `flowPaths`, `tracker.progress`, `clarificationLeftover` — rồi chạy logic dưới đây để tạo `promptTemplate` tại runtime. String này KHÔNG lưu DB, chỉ tồn tại trong bộ nhớ cho đến khi Renderer dùng xong.

```ts
// WALKTHROUGH_OPEN — isFirstTurn=true, graph đủ ngưỡng
const nodeChain = buildNodeChain(graph.edges, graph.nodes);
// → "Client → API Gateway → App Server → PostgreSQL"
const pathList = flowPaths
  .filter(p => p.required)
  .map((p, i) => `(${i + 1}) ${p.name}`)
  .join(', ');
// → "(1) URL redirect, (2) URL creation"
promptTemplate = `Ask candidate to explain their design end-to-end. Graph: ${nodeChain}. Paths to cover: ${pathList}.`;

// WALKTHROUGH_OPEN_GAP — isFirstTurn=true, graph sparse
const gap = findCriticalGap(graphMetrics, requirementContract);
// gap = component type thấp nhất + requirement liên quan
promptTemplate = `Graph is missing ${gap.componentType}. Ask candidate about: ${gap.description}.`;

// FLOW_PROBE — path chưa covered
const path = flowPaths.find(p => p.id === targetPathId);
const nodeChain = path.expectedNodeSequence
  .map(id => graph.nodes.find(n => n.id === id)?.label ?? id)
  .join(' → ');
promptTemplate = `Path "${path.name}" has not been explained. Ask candidate to walk through: ${path.description}. Known nodes: ${nodeChain}.`;

// COMPONENT_PROBE — node chưa explained
const node = graph.nodes.find(n => n.id === targetNodeId);
promptTemplate = `Node "${node.label}" appears in the graph but was not explained. Ask the candidate what role it plays.`;

// EDGE_PROBE — edge chưa explained
const edge = graph.edges.find(e => e.id === targetEdgeId);
const src  = graph.nodes.find(n => n.id === edge.sourceId)?.label;
const tgt  = graph.nodes.find(n => n.id === edge.targetId)?.label;
promptTemplate = `The connection between "${src}" and "${tgt}" has not been explained. Ask about protocol, sync/async, data format.`;

// CONTRADICTION_CHALLENGE — contradictionDetected=true
const node = graph.nodes.find(n => n.id === targetNodeId);
// contradictionDetail đến từ assessor (LLM detect + mô tả mâu thuẫn cụ thể)
promptTemplate = `${assessment.contradictionDetail}. Ask candidate to reconcile this with their graph.`;
```

> `buildNodeChain` đọc edges theo thứ tự topological từ source (client/entry) đến sink (database/storage).  
> `findCriticalGap` so sánh `graphMetrics.componentCoverage` với `requirementContract` — ưu tiên gap liên quan đến requirement đã clarify.

---

**`flowPaths`:**
```ts
[
  { id: 'redirect',     name: 'URL redirect',  description: 'User clicks short URL → receives 302 redirect', expectedNodeSequence: ['client','api_gateway','app_server','postgres'], required: true, priority: 1 },
  { id: 'url_creation', name: 'URL creation',  description: 'User submits original URL → receives short URL', expectedNodeSequence: ['client','api_gateway','app_server','postgres'], required: true, priority: 2 }
]
```

---

## Turn 1 — `WALKTHROUGH_OPEN`

Planner: `isFirstTurn=true`, graph pass sparse threshold → `WALKTHROUGH_OPEN`

**Intent (Option B):**
```ts
// Construction: WALKTHROUGH_OPEN branch
// nodeChain = buildNodeChain(edges, nodes) → "Client → API Gateway → App Server → PostgreSQL"
// pathList  = flowPaths.filter(required).map(name) → "(1) URL redirect, (2) URL creation"
{
  type: 'WALKTHROUGH_OPEN',
  promptTemplate: 'Ask candidate to explain their design end-to-end. Graph: Client → API Gateway → App Server → PostgreSQL. Paths to cover: (1) URL redirect, (2) URL creation.',
  // forbiddenHints: unexplainedNodeIds.map(label) = ALL nodes (turn 1, chưa có gì explained)
  forbiddenHints: ['Client', 'API Gateway', 'App Server', 'PostgreSQL'],
  maxSentences: 2
}
```

**Candidate nhận:** *"Walk me through your design end-to-end."*

**Candidate:** *"When a user clicks a short URL, the App Server looks up the original URL in PostgreSQL and returns a 302 redirect."*

**Assessor output:**
```ts
{
  candidateIntent: 'architecture_walkthrough',
  signals: {
    // coveredPathIds: paths newly completable this turn (Tracker tính bằng cách merge cumulative state + per-turn explainedNodeIds, rồi check path.expectedNodeSequence)
    coveredPathIds: [],             // redirect path chưa complete — bỏ qua API Gateway và Client
    dataOwnershipMentioned: false,
    syncAsyncBoundaryMentioned: false,
    constraintLinked: false,
    scopeViolation: false,
    contradictionDetected: false
  },
  // scoreDelta values là illustrative — chưa có công thức rubric cụ thể; dùng để minh họa relative magnitude
  scoreDelta: {
    walkthroughCompleteness: 0.3,  // 2/4 nodes explained, path incomplete
    flowClarity: 0.4,
    graphVerbalAlignment: 0.6,
    communicationStructure: 0.5,
    requirementSynthesis: 0,       // false → 0 (synthesis dims: boolean → 0/1, chỉ ≠ 0 ở turn 1)
    scaleReasoning: 0,
    scopeControl: 1                // true → 1
  },
  redFlags: [],
  explainedNodeIds: ['app_server', 'postgres'],   // API Gateway và Client bị bỏ qua
  explainedEdgeIds: ['app→db'],
  synthesisFirstTurn: { requirementSynthesis: false, scaleReasoning: false, scopeControl: true }
}
```

**Tracker sau turn 1:**
```ts
{
  unexplainedNodeIds: ['client', 'api_gateway'],
  unexplainedEdgeIds: ['client→api', 'api→app'],
  coveredPathIds: [],              // redirect chưa complete (bỏ qua api_gateway trong expectedNodeSequence)
  criticalPathsCovered: false,
  contradictionChallengesUsed: 0
}
```

---

## Turn 2 — `COMPONENT_PROBE` (edge case: node bị skip)

Planner: `coveredPathIds` rỗng → rule 1 nhưng `redirect` path có `api_gateway` trong `unexplainedNodeIds` → exception: probe node đó trước để unlock path coverage. Trong `unexplainedNodeIds = ['client', 'api_gateway']`, planner ưu tiên entry-point infrastructure (`api_gateway`) trước source actor (`client`) → `COMPONENT_PROBE` với `targetNodeId: 'api_gateway'`.

**Intent (Option B):**
```ts
// Construction: COMPONENT_PROBE branch
// node = graph.nodes.find(n => n.id === 'api_gateway') → { label: 'API Gateway' }
// targetPathId thêm vào để renderer có context path → có thể đề cập "redirect flow" trong câu hỏi
// promptTemplate = `Node "${node.label}" appears in the graph but was not explained. Ask the candidate what role it plays in the redirect flow.`
// forbiddenHints: unexplainedNodeIds=['client', 'api_gateway'], loại trừ targetNodeId='api_gateway'
//   → graph.nodes.find('client').label = 'Client'
//   KHÔNG forbid 'routing'/'rate limiting' — đó là nội dung câu trả lời, không phải node label
{
  type: 'COMPONENT_PROBE',
  targetNodeId: 'api_gateway',
  targetPathId: 'redirect',
  promptTemplate: 'Node "API Gateway" appears in the graph but was not explained. Ask the candidate what role it plays in the redirect flow.',
  forbiddenHints: ['Client'],
  maxSentences: 2
}
```

**Candidate nhận:** *"You have an API Gateway in your diagram — what role does it play in the redirect flow?"*

**Candidate:** *"The API Gateway receives all incoming requests and routes them to the App Server. It also handles rate limiting."*

**Assessor output:**
```ts
{
  candidateIntent: 'architecture_walkthrough',
  signals: {
    // coveredPathIds = paths newly completable this turn — Tracker tính bằng cách merge cumulative explainedNodeIds với per-turn mới, rồi check từng path.expectedNodeSequence
    // Tracker cumulative sau turn 1: ['app_server','postgres']. Turn 2 thêm: ['api_gateway','app_server','client'] → cumulative: ['app_server','postgres','api_gateway','client'] = đủ redirect sequence
    coveredPathIds: ['redirect'],
    dataOwnershipMentioned: false,
    syncAsyncBoundaryMentioned: false,
    constraintLinked: false,
    scopeViolation: false,
    contradictionDetected: false
  },
  scoreDelta: {
    walkthroughCompleteness: 0.6,
    flowClarity: 0.7,
    graphVerbalAlignment: 0.8,
    communicationStructure: 0.7,
    requirementSynthesis: 0,   // synthesis dims = 0 từ turn 2 trở đi
    scaleReasoning: 0,
    scopeControl: 0
  },
  redFlags: [],
  // Assessor trả per-turn extracted nodes — những node candidate mention trong turn này
  // 'api_gateway': rõ ràng. 'app_server': "routes them to the App Server". 'client': implied bởi "all incoming requests" (inference policy: source của edge đã nhắc)
  explainedNodeIds: ['api_gateway', 'app_server', 'client'],
  explainedEdgeIds: ['client→api', 'api→app']
}
```

**Tracker sau turn 2:**
```ts
{
  unexplainedNodeIds: [],
  unexplainedEdgeIds: [],
  coveredPathIds: ['redirect'],
  criticalPathsCovered: false,    // 'url_creation' vẫn chưa covered
  contradictionChallengesUsed: 0
}
```

---

## Turn 3 — `FLOW_PROBE` (url_creation)

Planner: rule 1 — `url_creation` chưa covered, priority=2 → `FLOW_PROBE`

**Intent (Option B):**
```ts
// Construction: FLOW_PROBE branch
// path = flowPaths.find('url_creation') → { name: 'URL creation', description: '...', expectedNodeSequence: [...] }
// nodeChain = expectedNodeSequence.map(id → node.label).join(' → ')
//           = ['client','api_gateway','app_server','postgres'].map(...) → "Client → API Gateway → App Server → PostgreSQL"
// promptTemplate = `Path "${path.name}" has not been explained. Ask candidate to walk through: ${path.description}. Known nodes: ${nodeChain}.`
// forbiddenHints: unexplainedNodeIds=[] (tất cả đã explained sau turn 2), loại trừ nodes trong targetPath → []
{
  type: 'FLOW_PROBE',
  targetPathId: 'url_creation',
  promptTemplate: 'Path "URL creation" has not been explained. Ask candidate to walk through: User submits original URL → receives short URL. Known nodes: Client → API Gateway → App Server → PostgreSQL.',
  forbiddenHints: [],
  maxSentences: 2
}
```

**Candidate nhận:** *"Got it. Now walk me through what happens when a user creates a new short URL."*

**Candidate:** *"The user POSTs the original URL to the API Gateway. The App Server generates a unique short key, stores the mapping in PostgreSQL. But wait — I realize I haven't thought about how the App Server connects to the database for writes versus reads."*

**Assessor output:**
```ts
{
  candidateIntent: 'architecture_walkthrough',
  signals: {
    coveredPathIds: ['url_creation'],
    dataOwnershipMentioned: true,     // candidate nhận ra read vs write concern
    syncAsyncBoundaryMentioned: false,
    constraintLinked: false,
    scopeViolation: false,
    contradictionDetected: false
  },
  scoreDelta: {
    walkthroughCompleteness: 0.8,     // cả 2 required paths covered
    flowClarity: 0.7,
    graphVerbalAlignment: 0.9,        // candidate cover đủ tất cả nodes/edges
    communicationStructure: 0.6,
    requirementSynthesis: 0,
    scaleReasoning: 0,
    scopeControl: 0
  },
  redFlags: [],
  // Per-turn extracted nodes: candidate mention "user" → 'client', "API Gateway" → 'api_gateway', "App Server" → 'app_server', "PostgreSQL" → 'postgres'
  // Tracker sẽ dedupe với cumulative — Assessor cứ trả đủ những gì được mention trong turn này
  explainedNodeIds: ['client', 'api_gateway', 'app_server', 'postgres'],
  explainedEdgeIds: ['client→api', 'api→app', 'app→db']
}
```

**Tracker sau turn 3:**
```ts
{
  unexplainedNodeIds: [],
  unexplainedEdgeIds: [],
  coveredPathIds: ['redirect', 'url_creation'],
  criticalPathsCovered: true,
  contradictionChallengesUsed: 0
}
```

---

## Turn 4 — `CONTRADICTION_CHALLENGE` (edge case: mâu thuẫn với graph)

Planner check transition: `criticalPathsCovered=true`, `turnCount=3 >= minTurns=2` → đủ điều kiện. Nhưng trong turn 3, candidate nói *"App Server connects to the database for writes versus reads"* — graph chỉ có 1 edge `app→db`, không có edge riêng cho read/write. Assessor không đánh dấu contradictionDetected nhưng candidate tự nêu ra inconsistency → đây là opening để CONTRADICTION_CHALLENGE (optional, vì contradictionDetected=false nhưng `dataOwnershipMentioned=true` với partial inconsistency).

Thực tế: planner sẽ transition thẳng nếu không có contradictionDetected. Tuy nhiên giả sử turn 3 candidate nói:

**[Variant] Candidate turn 3:** *"...and the API Gateway directly queries PostgreSQL for lookups to reduce latency."*

**Assessor:** `contradictionDetected: true` — graph shows `api_gateway → app_server → postgres`, không có edge trực tiếp `api_gateway → postgres`.

**Planner:** chưa transition — `contradictionMustBeResolved=true` → `ASK_CHALLENGE`

**Intent:**
```ts
// Construction: CONTRADICTION_CHALLENGE branch
// assessment.contradictionDetail (từ assessor LLM) =
//   "Candidate said API Gateway queries PostgreSQL directly, but graph has no edge api_gateway→postgres; actual path is api_gateway→app_server→postgres"
// node = graph.nodes.find('api_gateway') → { label: 'API Gateway' }
// promptTemplate = `${assessment.contradictionDetail}. Ask candidate to reconcile this with their graph.`
// forbiddenHints: unexplainedNodeIds=[] → []
// targetEdgeId: không dùng — CONTRADICTION_CHALLENGE không reference edge trong graph
//   vì edge bị challenge (api_gateway→postgres) không tồn tại trong graph.
//   Toàn bộ context mâu thuẫn nằm trong assessment.contradictionDetail
{
  type: 'CONTRADICTION_CHALLENGE',
  targetNodeId: 'api_gateway',
  promptTemplate: 'Candidate said API Gateway queries PostgreSQL directly, but graph has no edge api_gateway→postgres; actual path is api_gateway→app_server→postgres. Ask candidate to reconcile this with their graph.',
  forbiddenHints: [],
  maxSentences: 2
}
```

**Candidate nhận turn 4:** *"Your diagram shows requests going through the App Server before reaching PostgreSQL, but you mentioned the API Gateway querying PostgreSQL directly — can you clarify?"*

> `contradictionChallengesUsed: 0 → 1` — tăng ngay khi challenge được **sent** (không chờ candidate resolve), vì đây là budget số lần challenge đã dùng.

**Candidate:** *"You're right, I misspoke. The API Gateway routes to the App Server, and the App Server handles the database queries."*

**Assessor output:**
```ts
{
  candidateIntent: 'direct_answer',
  signals: {
    coveredPathIds: [],
    dataOwnershipMentioned: false,
    syncAsyncBoundaryMentioned: false,
    constraintLinked: false,
    scopeViolation: false,
    contradictionDetected: false   // resolved
  },
  scoreDelta: {
    walkthroughCompleteness: 0,
    flowClarity: 0.8,
    graphVerbalAlignment: 1.0,     // candidate tự sửa lại đúng với graph
    communicationStructure: 0.8,
    requirementSynthesis: 0,
    scaleReasoning: 0,
    scopeControl: 0
  },
  redFlags: [],
  explainedNodeIds: [],
  explainedEdgeIds: []
}
```

**Policy engine:** `contradictionDetected=false` → không cần thêm challenge. `contradictionChallengesUsed` đã được tăng lên 1 khi challenge được sent ở trên.

**Transition check:**
```ts
criticalPathsCovered: true               ✓
turnCount: 4 >= minTurns: 2             ✓
contradictionDetected: false (resolved)  ✓
contradictionChallengesUsed: 1 <= maxContradictionChallenges: 2  ✓
→ TRANSITION_STAGE
```

**`SDWalkthroughLeftoverJson`:**
```ts
{ unexplainedAtEnd: { nodeIds: [], edgeIds: [] } }
```

**Candidate nhận:** *"Good overview. Let me dig deeper into a few areas."*
