# HOW.md — SD Debrief & Reference Architecture Walkthrough (Epic 5)

## Overview

SD Debrief tích hợp vào **ScoringPage** hiện có dưới dạng tab `systemDesign` — cùng infrastructure với behavioral/liveCoding/prompt. Gồm 2 story:
- **Story 1 (BE + FE):** `SDScoringTab` shell + Score Breakdown + Reference Architecture Walkthrough — sửa `getAllSessionsForInterview` để trả SD session, thêm `SDScoringTab` vào ScoringPage.
- **Story 2 (BE + FE):** Annotated Transcript + Actionable Suggestions — precompute trong evaluation job, FE đọc thẳng từ `session.evaluationResult`.

File count: Story 1 — **9 files**. Story 2 — **4 files**.

---

## Architectural Decisions

### Decision 1: Auto-layout cho Reference Canvas

**Option A — Dagre (`@dagrejs/dagre`):**
- Pro: chuẩn, handles phức tạp, tích hợp tốt với ReactFlow
- Con: thêm dependency ~50kb, cần config

**Option B — Simple layered layout (inline, không dependency):**
- Pro: zero dependency, ~30 dòng, đủ cho DAG thẳng (client → lb → server → db)
- Con: không handle circular edges, layout xấu hơn với graph phức tạp

**Chọn: Option B** — reference architectures trong seed đều là DAG tuyến tính 1 chiều, simple layered layout đủ dùng và không thêm package mới.

---

### Decision 2: Render candidate diagram trên Debrief

**Option A — Tái dùng `SDCanvas` với `isViewOnly=true`:**
- Pro: không viết mới
- Con: `SDCanvas` đọc cứng từ `state.sdSession.architectureJSON` qua `useSelector`, không nhận data qua prop → không thể pass edge highlight data, cũng không thể mount 2 instance cùng lúc an toàn

**Option B — Tạo `ReferenceCanvas.jsx` (lightweight ReactFlow wrapper):**
- Pro: nhận `nodes`, `edges`, `nodeHighlights`, `edgeHighlights` qua props; dùng chung cho cả diagram ứng viên lẫn diagram tham chiếu
- Con: viết mới component

**Chọn: Option B** — `ReferenceCanvas` là pure presentational component, không có side effect Redux, có thể mount nhiều lần.

---

### Decision 3: Annotation & Suggestions — precompute hay on-demand

**Option A — Precompute trong evaluation job (BullMQ), chạy song song với 4 AI dimensions:**
- Pro: instant khi mở debrief — user luôn redirect đến debrief sau session, không có trường hợp "tốn token mà không xem"
- Pro: không thêm latency vì chạy `Promise.allSettled()` cùng batch với scalability/tradeoff/communication/curveball
- Con: evaluation job phức tạp hơn một chút; kết quả phải lưu vào `evaluationResult` JSON (extend shape)

**Option B — On-demand khi debrief page load:**
- Pro: tách biệt concerns
- Con: user chờ thêm 5–10s trên debrief dù đã chờ xong evaluation — double wait; cần thêm BE module, API endpoint, saga, API file mới

**Chọn: Option A** — user luôn redirect đến debrief → không có waste. Chạy song song với `Promise.allSettled()` → zero added latency. Đơn giản hơn: không cần BE module mới, không cần API endpoint, không cần saga mới — FE đọc thẳng từ `evaluationResult` đã có trong Redux.

Hệ quả với Story 2: không cần `sd-debrief` module, không cần `sdDebriefSaga`, không cần `sdDebrief.api.js`. Story 2 chỉ extend `sd-evaluator.service.ts` + `evaluation-prompts.ts` ở BE, và thêm 2 display components ở FE.

---

## Story 1: SDScoringTab Shell + Score Breakdown + Reference Walkthrough

### Backend Changes

**`server/src/interview/interview.service.ts`** — extend `getAllSessionsForInterview`

Inject `SDSession` repository, fetch SD session theo `interviewSessionId`, kèm relation `problem` (cần `referenceArchitecture`):

```typescript
const sdSession = await this.sdSessionRepo.findOne({
  where: { interviewSessionId },
  relations: ['problem'],
});
// ...
return {
  interviewSessionId,
  sessions: {
    behavioral: behavioralSession || null,
    liveCoding: liveCodingData,
    prompt: null,
    systemDesign: sdSession || null,   // thay null cứng
  },
};
```

Không thêm endpoint mới — chỉ populate field đang hardcode `null`.

---

### Frontend Changes

**`client/apps/web/src/components/sd-debrief/SDScoringTab.jsx`** — tab content chính

Props: `{ session, navigate }` — `session` là `allSessions.systemDesign` từ `ScoringPage`

- Guard: nếu `session.evaluationResult === null` → hiện skeleton + retry button (POST enqueue lại)
- Layout: 4 section dọc có sticky sub-nav `Score | Reference | Transcript | Suggestions`
- Section `Score` và `Reference` render ngay từ `session.evaluationResult` / `session.architectureJSON` / `session.problem.referenceArchitecture`
- Section `Transcript` và `Suggestions` render skeleton (Story 2 fill vào)

```jsx
// SDScoringTab.jsx structure
<div>
  <DebriefNav />            {/* sticky sub-nav: Score | Reference | Transcript | Suggestions */}
  <ScoreBreakdown />        {/* Story 1 */}
  <ReferenceWalkthrough />  {/* Story 1 — gọi ReferenceCanvas 2 lần */}
  <AnnotatedTranscript />   {/* Story 2 — placeholder skeleton */}
  <ActionableSuggestions /> {/* Story 2 — placeholder skeleton */}
</div>
```

---

**`client/apps/web/src/components/sd-debrief/ScoreBreakdown.jsx`**

Input props: `{ evaluationResult }` (shape từ `_computeFinalScore`)

Render:
- Grade Band badge: `Exceptional` (A) / `Strong` (B) / `Good` (C) / `Developing` (D) / `Needs Work` (F) — màu theo band
- `finalScore / maxScore` text lớn
- Nếu `hintsUsed > 0`: hint penalty indicator `-X pts`
- 5 dimension bars (hoặc 4 nếu không có curveball):
  - Label dimension name (dùng i18n key)
  - Progress bar: `score / maxScore * 100%`
  - Score text `score/maxScore`
  - Nếu `data.missingComponents` (componentCoverage): hiển thị badge đỏ từng type thiếu

Không có loading state — evaluationResult đã có khi component mount.

---

**`client/apps/web/src/components/sd-debrief/ReferenceCanvas.jsx`**

Props:
```javascript
{
  nodes,          // array of { id, type, label } — raw từ referenceArchitecture hoặc architectureJSON
  edges,          // array of { from/source, to/target, label }
  nodeHighlights, // { [nodeId]: 'green' | 'red' } — optional
  edgeHighlights, // { [edgeId]: 'green' | 'yellow' } — optional
  title,          // string — header trên canvas
}
```

**Comparison utility** (pure function trong cùng file, export riêng để test):

```javascript
export function computeHighlights(candidateNodes, candidateEdges, refNodes, refEdges) {
  const candidateTypes = new Set(
    candidateNodes.map(n => (n.type ?? '').toLowerCase())
  );

  // Node highlights: applied to reference diagram
  const nodeHighlights = {};
  for (const n of refNodes) {
    nodeHighlights[n.id] = candidateTypes.has((n.type ?? '').toLowerCase())
      ? 'green'
      : 'red';
  }

  // Edge highlights: applied to candidate diagram
  const refNodeTypeMap = Object.fromEntries(
    refNodes.map(n => [n.id, (n.type ?? '').toLowerCase()])
  );
  const refEdgePairs = new Set(
    refEdges.map(e => `${refNodeTypeMap[e.from]}→${refNodeTypeMap[e.to]}`)
  );
  const candidateNodeTypeMap = Object.fromEntries(
    candidateNodes.map(n => [n.id, (n.type ?? '').toLowerCase()])
  );
  const edgeHighlights = {};
  for (const e of candidateEdges) {
    const pair = `${candidateNodeTypeMap[e.source]}→${candidateNodeTypeMap[e.target]}`;
    edgeHighlights[e.id] = refEdgePairs.has(pair) ? 'green' : 'yellow';
  }

  return { nodeHighlights, edgeHighlights };
}
```

**Layout utility** (simple layered DAG, inline trong file):

```javascript
function computeLayout(nodes, edges) {
  // Build adjacency: nodeId → [childId]
  const children = Object.fromEntries(nodes.map(n => [n.id, []]));
  const inDegree = Object.fromEntries(nodes.map(n => [n.id, 0]));
  for (const e of edges) {
    const src = e.from ?? e.source;
    const tgt = e.to ?? e.target;
    children[src]?.push(tgt);
    if (inDegree[tgt] !== undefined) inDegree[tgt]++;
  }

  // BFS from roots to assign layers
  const layer = {};
  const queue = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);
  queue.forEach(id => (layer[id] = 0));
  while (queue.length) {
    const id = queue.shift();
    for (const childId of (children[id] ?? [])) {
      layer[childId] = Math.max(layer[childId] ?? 0, layer[id] + 1);
      queue.push(childId);
    }
  }

  // Assign positions
  const layerCounts = {};
  const NODE_W = 160, NODE_H = 100;
  return nodes.map(n => {
    const l = layer[n.id] ?? 0;
    const idx = layerCounts[l] ?? 0;
    layerCounts[l] = idx + 1;
    return { ...n, position: { x: l * (NODE_W + 40), y: idx * (NODE_H + 20) } };
  });
}
```

**Highlight node component** (defined trong file):

```jsx
function HighlightableNode({ data }) {
  // data = { label, nodeType, highlightStatus }
  const ringClass = {
    green: 'ring-2 ring-offset-1 ring-green-500',
    red:   'ring-2 ring-offset-1 ring-red-500',
  }[data.highlightStatus] ?? '';

  // Map nodeType → icon (same mapping as SDNodeTypes)
  const { Icon, borderColor } = NODE_ICON_MAP[data.nodeType] ?? { Icon: Box, borderColor: 'border-gray-400' };

  return (
    <div className={`bg-card border-2 ${borderColor} rounded-lg px-3 py-2 min-w-[100px] shadow-sm ${ringClass}`}>
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />
      <div className="flex flex-col items-center gap-1">
        <Icon className="w-5 h-5 text-slate-400" />
        <span className="text-xs text-center text-foreground font-medium leading-tight">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
    </div>
  );
}
```

`NODE_ICON_MAP` — object mapping `nodeType → { Icon, borderColor }`, copy từ `SDNodeTypes.jsx`.

**ReactFlow render:**

```jsx
const nodeTypes = useMemo(() => ({ highlightable: HighlightableNode }), []);

const rfNodes = useMemo(() => computeLayout(nodes, edges).map(n => ({
  id: n.id,
  type: 'highlightable',
  position: n.position,
  data: { label: n.label, nodeType: n.type, highlightStatus: nodeHighlights?.[n.id] },
})), [nodes, edges, nodeHighlights]);

const rfEdges = useMemo(() => edges.map(e => {
  const id = `e-${e.from ?? e.source}-${e.to ?? e.target}`;
  const hl = edgeHighlights?.[id];
  return {
    id,
    source: e.from ?? e.source,
    target: e.to ?? e.target,
    label: e.label,
    style: { stroke: hl === 'yellow' ? '#f59e0b' : hl === 'green' ? '#22c55e' : '#94a3b8' },
    labelStyle: { fontSize: 10 },
  };
}), [edges, edgeHighlights]);

return (
  <div className="h-[400px] w-full border rounded-lg overflow-hidden">
    <p className="text-sm font-medium px-3 py-1 border-b text-muted-foreground">{title}</p>
    <ReactFlow
      nodes={rfNodes} edges={rfEdges}
      nodeTypes={nodeTypes}
      nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
      fitView fitViewOptions={{ padding: 0.2 }}
    >
      <Background /> <Controls showInteractive={false} />
    </ReactFlow>
  </div>
);
```

**Sử dụng trong `SDScoringTab.jsx`:**

```jsx
// session = allSessions.systemDesign (prop từ ScoringPage)
const architectureJSON = session?.architectureJSON;
const refArch = session?.problem?.referenceArchitecture;

const { nodeHighlights, edgeHighlights } = useMemo(() =>
  refArch
    ? computeHighlights(
        architectureJSON?.nodes ?? [],
        architectureJSON?.edges ?? [],
        refArch.nodes,
        refArch.edges,
      )
    : { nodeHighlights: {}, edgeHighlights: {} },
  [architectureJSON, refArch]
);

// Candidate diagram (left): edges có edgeHighlights, no nodeHighlights
<ReferenceCanvas
  nodes={architectureJSON?.nodes ?? []}
  edges={architectureJSON?.edges ?? []}
  edgeHighlights={edgeHighlights}
  title={t('sdDebrief.yourDiagram')}
/>

// Reference diagram (right): nodes có nodeHighlights, no edgeHighlights
<ReferenceCanvas
  nodes={refArch?.nodes ?? []}
  edges={refArch?.edges ?? []}
  nodeHighlights={nodeHighlights}
  title={t('sdDebrief.referenceDiagram')}
/>
```

---

**`client/apps/web/src/components/scoring/ScoringPage.jsx`** — thêm case `systemDesign`

```jsx
import SDScoringTab from '../sd-debrief/SDScoringTab';

// Trong renderContent():
{selectedSessionType === 'systemDesign'
  ? <SDScoringTab session={currentSessionData} navigate={navigate} />
  : selectedSessionType === 'liveCoding'
    ? <DSAScoringTab session={currentSessionData} />
    : <ScorecardDisplay scoreData={displayScore} navigate={navigate} isCombat={mode === 'combat'} />
}
```

---

**`client/apps/web/src/components/sd-room/EvaluationLoadingOverlay.jsx`** — thêm "View Results" button

Nhận thêm prop `navigate`. Khi `status === 'completed'`, thêm button bên dưới `EvaluationResult`:

```jsx
import { useDispatch } from 'react-redux';
import { setScoringInitialTab } from '../../store/slices/interviewSetupSlice';

// Trong EvaluationResult (hoặc inline trong component chính):
{status === 'completed' && (
  <button
    onClick={() => {
      dispatch(setScoringInitialTab('systemDesign'));
      navigate('scoring');
    }}
    className="w-full py-2 rounded-lg bg-cta text-white text-sm font-medium hover:bg-cta/90 transition-colors"
  >
    {t('sdRoom.evaluation.viewResults')}
  </button>
)}
```

Thêm i18n key `sdRoom.evaluation.viewResults` vào `en/vi/ja.json`.

---

**i18n** — thêm vào `en.json`, `vi.json`, `ja.json`:

```json
"sdDebrief": {
  "title": "Interview Debrief",
  "nav": { "score": "Score", "reference": "Reference", "transcript": "Transcript", "suggestions": "Suggestions" },
  "yourDiagram": "Your Diagram",
  "referenceDiagram": "Reference Architecture",
  "gradeBand": {
    "Exceptional": "Exceptional", "Strong": "Strong", "Good": "Good",
    "Developing": "Developing", "Needs Work": "Needs Work"
  },
  "hintPenalty": "Hint penalty: -{{pts}} pts",
  "missingComponents": "Missing: {{list}}",
  "nodeHighlight": {
    "green": "You included this component",
    "red": "Missing from your diagram"
  },
  "edgeHighlight": {
    "yellow": "This connection is not in the reference architecture"
  },
  "loadingAnnotations": "Analyzing your answers...",
  "loadingSuggestions": "Generating suggestions...",
  "annotationFallback": "Transcript analysis unavailable",
  "suggestionFallback": "Unable to generate suggestions at this time",
  "retry": "Retry"
}
```

### Story 1 — File Count: 9 / 10

---

## Story 2: Annotated Transcript + Actionable Suggestions

Annotation và suggestions được **precompute trong evaluation job**, chạy song song với 4 AI dimensions. Kết quả lưu vào `evaluationResult` JSON. FE đọc thẳng từ Redux — không cần API endpoint mới, không cần saga mới.

### Backend Changes

**`server/src/sd-evaluator/sd-evaluator.service.ts`** — extend `_runAiDimensions()`

Thêm 2 call song song vào `Promise.allSettled()` hiện có:

```typescript
await Promise.allSettled([
  this._evaluateScalability(session).then(pushAndUpdate),
  this._evaluateTradeoff(session).then(pushAndUpdate),
  this._evaluateCommunication(session).then(pushAndUpdate),
  hasCurveball
    ? this._evaluateCurveball(session).then(pushAndUpdate)
    : Promise.resolve(),
  // Story 2 — chạy cùng batch, không thêm latency
  this._annotateTranscript(session).then(pushAndUpdate),
  this._generateSuggestions(session).then(pushAndUpdate),
]);
```

Thêm 2 method private:

```typescript
private async _annotateTranscript(session: SDSession): Promise<DimensionResult>
private async _generateSuggestions(session: SDSession): Promise<DimensionResult>
```

Cả hai trả `DimensionResult` với `dimension: 'annotations'` / `'suggestions'`, `score: 0`, `maxScore: 0` (không tính điểm — chỉ dùng `data` field để lưu kết quả).

```typescript
// _annotateTranscript
const transcript = (session.transcriptHistory ?? []) as unknown[];
const filtered = (transcript as Array<{ role: string }>)
  .filter(e => e.role === 'user' || e.role === 'ai');
const raw = await this._callWithTimeout(
  buildAnnotationPrompt({ problemTitle: session.problem.title, transcriptHistory: filtered })
);
let annotations: unknown[] = [];
try { annotations = JSON.parse(raw.trim()); } catch { /* fallback: empty */ }
return { dimension: 'annotations', score: 0, maxScore: 0, data: { annotations } };

// _generateSuggestions
const dimensions = (session.evaluationResult as any)?.dimensions ?? []; // sau khi 4 dims xong
// Lưu ý: suggestions chạy song song với các dims → dùng completedDimensions từ job progress
// Giải pháp: _generateSuggestions nhận completedDimensions từ caller (xem bên dưới)
```

**Thứ tự thực thi:** `_generateSuggestions` cần score của các dimensions để chọn weakest. Vì chạy song song, cần tách ra: chạy 4 AI dims trước, sau khi `allSettled` xong → chạy `_annotateTranscript` và `_generateSuggestions` (vẫn song song với nhau, chỉ sau batch đầu).

```typescript
// Trong processEvaluation():
await this._runAiDimensions({ session, hasCurveball, pushAndUpdate });
// Sau khi có đủ scores:
await Promise.allSettled([
  this._annotateTranscript(session).then(pushAndUpdate),
  this._generateSuggestions(session, completedDimensions).then(pushAndUpdate),
]);
```

Latency tổng: `max(5 dims) + max(annotation, suggestions)` ≈ 15–20s thay vì 30–40s nếu sequential.

---

**`server/src/sd-evaluator/prompts/evaluation-prompts.ts`** — thêm 2 prompt builders

```typescript
export const buildAnnotationPrompt = ({
  problemTitle,
  transcriptHistory,
}: {
  problemTitle: string;
  transcriptHistory: unknown[];
}): string => `You are reviewing a system design interview transcript.

Problem: "${problemTitle}"

Transcript (JSON array, each entry has role, content, phase):
${JSON.stringify(transcriptHistory, null, 2)}

Annotate ONLY entries with role "user" (candidate responses). For each notable entry:

Annotation types:
- "green": explicit trade-off articulated ("I chose X over Y because Z"), correct technical depth, or successful adaptation
- "yellow": concept mentioned but lacked depth, skipped capacity estimate, or answer was vague/incomplete
- "red": direct question not answered, significant architecture gap, or technically incorrect statement

Rules:
- Only annotate entries that are clearly notable. Skip neutral exchanges.
- Maximum 6 annotations total.
- comment must be 1 sentence, specific — cite the exact concept or gap.
- entryIndex is the 0-based index of the entry in the original transcript array.

Return JSON only — no text outside JSON:
[{ "entryIndex": <number>, "type": "green"|"yellow"|"red", "comment": "<1-sentence>" }]`;

export const buildSuggestionsPrompt = ({
  problemTitle,
  dimensions,
}: {
  problemTitle: string;
  dimensions: Array<{ dimension: string; score: number; maxScore: number; data?: Record<string, unknown> }>;
}): string => {
  const sorted = [...dimensions]
    .filter(d => d.maxScore > 0)
    .sort((a, b) => a.score / a.maxScore - b.score / b.maxScore);
  const weakest = sorted.slice(0, 2);
  return `You are giving actionable feedback after a system design interview.

Problem: "${problemTitle}"

Dimension scores:
${dimensions.filter(d => d.maxScore > 0).map(d => `- ${d.dimension}: ${d.score}/${d.maxScore}`).join('\n')}

Weakest dimensions: ${weakest.map(d => d.dimension).join(', ')}
${weakest[0]?.data?.missingComponents ? `Missing components: ${(weakest[0].data.missingComponents as string[]).join(', ')}` : ''}

Write exactly 2–3 actionable suggestions. Each suggestion:
- Is specific to this problem and the weak dimension (not generic advice like "study more")
- Tells the candidate exactly what to practice or add next time
- Is 1–2 sentences

Return JSON only:
{ "suggestions": ["<suggestion 1>", "<suggestion 2>", "<optional suggestion 3>"] }`;
};
```

---

### Frontend Changes

**`client/apps/web/src/components/sd-debrief/AnnotatedTranscript.jsx`**

Props: `{ transcriptHistory, annotations }` — đọc thẳng từ `evaluationResult.dimensions.find(d => d.dimension === 'annotations')?.data.annotations`

- `annotations` null/empty → render transcript thuần (không highlight), không cần retry
- Render transcript entries, filter bỏ `system-trigger`:
  - `user` entry: check `annotations` có `entryIndex` match → wrap bằng colored highlight div + Tooltip với `comment`
  - `ai` entry: render bình thường
  - Color: `green → bg-green-50 border-l-2 border-green-500`, `yellow → bg-yellow-50 border-l-2 border-yellow-400`, `red → bg-red-50 border-l-2 border-red-500`
  - Timestamp render nhỏ bên phải mỗi entry

---

**`client/apps/web/src/components/sd-debrief/ActionableSuggestions.jsx`**

Props: `{ suggestions }` — đọc từ `evaluationResult.dimensions.find(d => d.dimension === 'suggestions')?.data.suggestions`

- `suggestions` empty/null → render fallback text `t('sdDebrief.suggestionFallback')`
- Render `<ol>` với `suggestions.map(s => <li>{s}</li>)`

---

**`SDScoringTab.jsx`** (Story 2 bổ sung) — truyền data vào 2 component mới:

```javascript
// session = prop từ ScoringPage (allSessions.systemDesign)
const evaluationResult = session?.evaluationResult;
const annotationsDim = evaluationResult?.dimensions?.find(d => d.dimension === 'annotations');
const suggestionsDim = evaluationResult?.dimensions?.find(d => d.dimension === 'suggestions');

<AnnotatedTranscript
  transcriptHistory={session?.transcriptHistory ?? []}
  annotations={annotationsDim?.data?.annotations ?? []}
/>
<ActionableSuggestions
  suggestions={suggestionsDim?.data?.suggestions ?? []}
/>
```

---

### Story 2 — File Count: 4 / 10

---

## API Contract

Không có API endpoint mới. Annotation và suggestions được lưu trong `evaluationResult.dimensions` (mảng DimensionResult), truy cập qua endpoint hiện có:

```
GET /sd-sessions/:id  →  session.evaluationResult.dimensions
  includes: { dimension: 'annotations', data: { annotations: [...] } }
  includes: { dimension: 'suggestions', data: { suggestions: [...] } }
```

---

## Stability Notes

- Annotation + suggestions chạy sau batch 4 AI dims → không thêm latency nếu chạy song song với nhau
- AI parse fail → fallback `annotations: []` / `suggestions: []` — FE render fallback text, không crash
- `ReferenceCanvas` với circular edge: BFS không gán layer → node về layer 0, stack ở cột đầu — acceptable
- `computeHighlights` với node type undefined → `''` không match bất kỳ type nào → safe

---

## Not Changing

- `SDCanvas.jsx` và `SDNodeTypes.jsx` — không chỉnh sửa
- `sdSessionSaga` / `sdEvaluatorSaga` — không thay đổi
- Session entity / migration — không thêm column mới (`evaluationResult` JSONB đã có, chỉ extend shape)
- `App.jsx` — không thêm route mới; SD debrief hiển thị qua route `scoring` hiện có
- Không tạo `sd-debrief` module, không tạo `sdDebriefSaga`, `sdDebrief.api.js`, `sdDebriefSlice`, `SDDebriefPage`

---

## File Count

| Story | Files | Count |
|-------|-------|-------|
| Story 1 | interview.service.ts, SDScoringTab, ScoreBreakdown, ReferenceCanvas, ScoringPage.jsx, EvaluationLoadingOverlay.jsx, en/vi/ja.json | **9 / 10** |
| Story 2 | sd-evaluator.service.ts, evaluation-prompts.ts, AnnotatedTranscript, ActionableSuggestions | **4 / 10** |
