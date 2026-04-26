# HOW — 003-sd-whiteboard (Virtual Whiteboard / Structured Canvas)

## Overview

Feature được triển khai theo 3 story độc lập với thứ tự phụ thuộc tuyến tính: Story 1 (BE PATCH APIs) → Story 2 (FE State Layer) → Story 3 (FE Canvas + Room UI). Canvas dùng **React Flow** (`@xyflow/react`) để quản lý node/edge với JSON export built-in. Phase lock/unlock dùng **polling** (GET /sd-sessions/:id mỗi 5s) — không cần SSE ở giai đoạn này. Auto-save dùng **eventChannel saga** 30s tick.

---

## Architectural Decisions

### Decision 1: Canvas Library

**Option A — React Flow (`@xyflow/react`):**
- Pro: Declarative React component, node/edge state as JSON natively, drag-drop built-in, connection handle built-in, active maintainance (v12), DX tốt
- Con: Cần install thêm package (~200KB gzip)

**Option B — Konva.js:**
- Pro: Low-level canvas API, kiểm soát pixel hoàn toàn
- Con: State management thủ công, không có built-in JSON export, complex integration với Redux, DX kém hơn

**Option C — Custom SVG:**
- Pro: Zero dependencies
- Con: Quá nhiều công sức implement drag-drop, connection, resize từ đầu — không khả thi trong sprint này

**Chọn: Option A — React Flow** — JSON export là `useNodes()` + `useEdges()` → trivially convert sang ArchitectureJSON. Drag-drop + connection handle có sẵn. Package size chấp nhận được.

**Install:** `npm install @xyflow/react` trong `client/apps/web/`

---

### Decision 2: Phase Lock/Unlock Notification

**Option A — Polling GET /sd-sessions/:id mỗi 5s:**
- Pro: Không cần infra mới, simple saga loop, Epic 3 chỉ cần PATCH phase (đã có trong Story 1)
- Con: Delay tối đa 5s khi phase change, slight server load

**Option B — SSE từ backend:**
- Pro: Real-time ngay khi Epic 3 PATCH phase
- Con: Cần infra SSE mới ở BE (chưa có precedent trong codebase), tăng scope Story 1 lên >10 files

**Chọn: Option A — Polling** — Epic 3 chưa done, không cần real-time ngay. Có thể upgrade lên SSE sau khi Epic 3 sẵn.

---

### Decision 3: Auto-Save Implementation

**Option A — `setInterval` trong component với dispatch:**
- Con: Cleanup phức tạp khi component unmount, logic trong component (vi phạm convention)

**Option B — eventChannel saga (setInterval wrapped):**
- Pro: Logic nằm hoàn toàn trong saga, cleanup tự động khi saga cancel, testable

**Chọn: Option B** — Phù hợp convention FE: business logic trong saga, component chỉ dispatch.

---

## Story 1 — Backend: PATCH Endpoints (3 files)

### Backend Changes (`server/`)

**`server/src/sd-session/dto/update-sd-session.dto.ts`** — TẠO MỚI

```typescript
// 3 DTOs trong cùng 1 file

export class ArchitectureNodeDto {
  @IsString() @IsNotEmpty() id: string;
  @IsString() @IsNotEmpty() type: string;
  @IsString() @IsNotEmpty() label: string;
  @IsObject() position: { x: number; y: number };
}

export class ArchitectureEdgeDto {
  @IsString() @IsNotEmpty() from: string;
  @IsString() @IsNotEmpty() to: string;
  @IsString() @IsNotEmpty() label: string;
}

export class UpdateArchitectureDto {
  @ValidateNested({ each: true })
  @Type(() => ArchitectureNodeDto)
  nodes: ArchitectureNodeDto[];

  @ValidateNested({ each: true })
  @Type(() => ArchitectureEdgeDto)
  edges: ArchitectureEdgeDto[];
}

export class UpdatePhaseDto {
  @IsIn(['CLARIFICATION', 'DESIGN', 'DEEP_DIVE', 'WRAP_UP', 'COMPLETED'])
  phase: SDPhase;
}

export class AppendTranscriptDto {
  @IsString() @IsNotEmpty() text: string;
  @IsString() @IsNotEmpty() timestamp: string;  // ISO 8601
  @IsIn(['voice', 'text']) source: 'voice' | 'text';
}
```

---

**`server/src/sd-session/sd-session.service.ts`** — SỬA: thêm 3 method

```typescript
async updateArchitecture(
  { id, nodes, edges }: { id: string; nodes: unknown[]; edges: unknown[] }
): Promise<void> {
  const session: SDSession | null = await this.sdSessionRepository.findOne({ where: { id } });
  if (!session) throw new NotFoundException(`SDSession #${id} not found`);
  await this.sdSessionRepository.update(id, { architectureJSON: { nodes, edges } });
}

async updatePhase({ id, phase }: { id: string; phase: SDPhase }): Promise<void> {
  const session: SDSession | null = await this.sdSessionRepository.findOne({ where: { id } });
  if (!session) throw new NotFoundException(`SDSession #${id} not found`);
  await this.sdSessionRepository.update(id, { phase });
  this.logger.log(`SDSession ${id} phase → ${phase}`);
}

async appendTranscript(
  { id, entry }: { id: string; entry: Record<string, unknown> }
): Promise<void> {
  const session: SDSession | null = await this.sdSessionRepository.findOne({ where: { id } });
  if (!session) throw new NotFoundException(`SDSession #${id} not found`);
  const history: Record<string, unknown>[] = [...session.transcriptHistory, entry];
  await this.sdSessionRepository.update(id, { transcriptHistory: history });
}
```

---

**`server/src/sd-session/sd-session.controller.ts`** — SỬA: thêm 3 PATCH routes

```typescript
@Patch(':id/architecture')
@ApiOperation({ summary: 'Auto-save canvas architecture JSON' })
async updateArchitecture(
  @Param('id') id: string,
  @Body() dto: UpdateArchitectureDto,
) {
  return this.sdSessionService.updateArchitecture({ id, nodes: dto.nodes, edges: dto.edges });
}

@Patch(':id/phase')
@ApiOperation({ summary: 'Update session phase (called by AI Interviewer - Epic 3)' })
async updatePhase(@Param('id') id: string, @Body() dto: UpdatePhaseDto) {
  return this.sdSessionService.updatePhase({ id, phase: dto.phase });
}

@Patch(':id/transcript')
@ApiOperation({ summary: 'Append transcript entry (voice or text)' })
async appendTranscript(
  @Param('id') id: string,
  @Body() dto: AppendTranscriptDto,
) {
  return this.sdSessionService.appendTranscript({ id, entry: { ...dto } });
}
```

### API Contract — Story 1

| Method | Path | Auth | Request Body | Response |
|--------|------|------|--------------|----------|
| PATCH | /sd-sessions/:id/architecture | JWT | `{ nodes: [...], edges: [...] }` | 200 `{}` |
| PATCH | /sd-sessions/:id/phase | JWT | `{ phase: "DESIGN"\|"DEEP_DIVE"\|... }` | 200 `{}` |
| PATCH | /sd-sessions/:id/transcript | JWT | `{ text, timestamp, source: "voice"\|"text" }` | 200 `{}` |

Các endpoint hiện có (từ Epic 1) giữ nguyên:
- POST /sd-sessions — tạo session
- GET /sd-sessions/:id — lấy session state

### File Count — Story 1
| File | Loại |
|------|------|
| `server/src/sd-session/dto/update-sd-session.dto.ts` | Tạo mới |
| `server/src/sd-session/sd-session.service.ts` | Sửa |
| `server/src/sd-session/sd-session.controller.ts` | Sửa |

Tổng Story 1: **3 / 10** ✓

---

## Story 2 — FE State Layer: Slice + Saga + API (4 files)

**Depends on:** Story 1 phải done trước (cần PATCH endpoints)

### Frontend Changes — Story 2

**`client/apps/web/src/api/sdSession.js`** — SỬA: thêm 3 method

```javascript
export const sdSessionApi = {
  create: (payload) => axiosClient.post('/sd-sessions', payload),
  getById: (id) => axiosClient.get(`/sd-sessions/${id}`),
  // Story 2 additions:
  updateArchitecture: (id, architectureJSON) =>
    axiosClient.patch(`/sd-sessions/${id}/architecture`, architectureJSON),
  updatePhase: (id, phase) =>
    axiosClient.patch(`/sd-sessions/${id}/phase`, { phase }),
  appendTranscript: (id, entry) =>
    axiosClient.patch(`/sd-sessions/${id}/transcript`, entry),
};
```

---

**`client/apps/web/src/store/slices/sdSessionSlice.js`** — TẠO MỚI

State shape:
```javascript
const initialState = {
  // session meta
  sessionId: null,
  interviewSessionId: null,
  phase: 'CLARIFICATION',  // SDPhase
  enableCurveball: true,
  durationMinutes: 45,
  problem: null,  // { id, title, domain, description }

  // canvas
  architectureJSON: null,  // { nodes: [], edges: [] }
  isDirty: false,           // true khi có thay đổi chưa được auto-save
  lastSavedAt: null,        // timestamp ms
  autoSaveStatus: 'idle',   // 'idle' | 'saving' | 'saved' | 'error'

  // transcript
  transcriptHistory: [],    // [{ text, timestamp, source, needsConfirm? }]

  loading: false,
  error: null,
};
```

Actions cần có:
- `loadRequest(sdSessionId)` / `loadSuccess(sessionData)` / `loadFailure(msg)`
- `canvasChanged({ nodes, edges })` — dispatch từ SDCanvas mỗi khi diagram thay đổi
- `setArchitectureJSON(json)` — saga dispatch sau debounce 2s
- `autoSaveStart()` / `autoSaveSuccess()` / `autoSaveFailure()`
- `phaseUpdated(phase)` — saga dispatch khi polling detect phase change
- `transcriptAppended(entry)` — sau khi PATCH thành công

---

**`client/apps/web/src/store/sagas/sdSessionSaga.js`** — TẠO MỚI

4 watchers chính:

```javascript
// 1. Load session khi vào SD Room
function* _handleLoad(action) {
  try {
    const data = yield call(sdSessionApi.getById, action.payload)
    yield put(loadSuccess(data))
    // Bắt đầu polling phase sau khi load
    yield fork(_pollPhase)
    // Bắt đầu auto-save loop
    yield fork(_autoSaveLoop)
  } catch (err) {
    yield put(loadFailure(err.response?.data?.message || 'Cannot load SD session'))
  }
}

// 2. Debounce canvas changes → update local JSON (2s debounce qua takeLatest)
function* _handleCanvasChanged(action) {
  yield delay(2000)  // debounce: takeLatest cancels nếu có action mới
  const { nodes, edges } = action.payload
  const json = { nodes, edges }
  yield put(setArchitectureJSON(json))
  yield put(setDirty(true))
}

// 3. Auto-save loop (30s interval)
function* _autoSaveLoop() {
  const chan = eventChannel(emit => {
    const id = setInterval(() => emit('TICK'), 30000)
    return () => clearInterval(id)
  })
  try {
    while (true) {
      yield take(chan)
      const { sessionId, architectureJSON, isDirty } = yield select(s => s.sdSession)
      if (!sessionId || !isDirty || !architectureJSON) continue
      try {
        yield put(autoSaveStart())
        yield call(sdSessionApi.updateArchitecture, sessionId, architectureJSON)
        yield put(autoSaveSuccess())
      } catch {
        yield put(autoSaveFailure())
      }
    }
  } finally {
    chan.close()
  }
}

// 4. Phase polling (5s interval, stop khi COMPLETED)
function* _pollPhase() {
  while (true) {
    yield delay(5000)
    const { sessionId, phase } = yield select(s => s.sdSession)
    if (!sessionId || phase === 'COMPLETED') break
    try {
      const data = yield call(sdSessionApi.getById, sessionId)
      if (data.phase !== phase) {
        yield put(phaseUpdated(data.phase))
      }
    } catch {
      // Non-critical — keep polling
    }
  }
}

// 5. Append transcript
function* _handleAppendTranscript(action) {
  try {
    const { sessionId } = yield select(s => s.sdSession)
    yield call(sdSessionApi.appendTranscript, sessionId, action.payload)
    yield put(transcriptAppended(action.payload))
  } catch {
    // Non-critical — transcript không được lưu nhưng không crash session
  }
}

export function* watchSDSessionSaga() {
  yield takeLatest(loadRequest.type, _handleLoad)
  yield takeLatest(canvasChanged.type, _handleCanvasChanged)
  yield takeLatest(appendTranscriptRequest.type, _handleAppendTranscript)
}
```

---

**`client/apps/web/src/store/sagas/rootSaga.js`** — SỬA: fork `watchSDSessionSaga`

```javascript
import { watchSDSessionSaga } from './sdSessionSaga';

export default function* rootSaga() {
  yield all([
    // existing forks...
    fork(watchSDSessionSaga),  // ADD
  ]);
}
```

### File Count — Story 2
| File | Loại |
|------|------|
| `client/apps/web/src/api/sdSession.js` | Sửa |
| `client/apps/web/src/store/slices/sdSessionSlice.js` | Tạo mới |
| `client/apps/web/src/store/sagas/sdSessionSaga.js` | Tạo mới |
| `client/apps/web/src/store/sagas/rootSaga.js` | Sửa |

Tổng Story 2: **4 / 10** ✓

---

## Story 3 — FE Canvas + Room UI (8 files)

**Depends on:** Story 2 phải done trước (cần sdSessionSlice + saga)

**New package:** Install `@xyflow/react` trước khi code story này:
```
npm install @xyflow/react
```
(chạy trong `client/apps/web/`)

### Frontend Changes — Story 3

#### Cấu trúc component

```
src/components/sd-room/
├── SDRoomPage.jsx          — Layout chính (3 panel: NodeLibrary + Canvas + WalkthroughPanel)
├── SDCanvas.jsx            — React Flow canvas
├── NodeLibrary.jsx         — Sidebar với draggable node types
└── WalkthroughPanel.jsx    — Voice + Text input + transcript history
```

---

#### `SDRoomPage.jsx` — TẠO MỚI

Layout 3 panel:
```
[NodeLibrary 240px] | [SDCanvas flex-1] | [WalkthroughPanel 320px]
```

Trách nhiệm:
- Mount: dispatch `loadRequest(sdSessionId)` (sdSessionId đến từ prop, lấy từ `interviewSetup.session.sdSessionId`)
- Hiển thị `loading` state khi load
- Hiển thị `autoSaveStatus` indicator ở header (icon + "Đã lưu" / "⚠ Chưa lưu")
- Truyền `phase` và `isCanvasLocked` xuống `SDCanvas`
- Phase progress bar ở top: CLARIFICATION → DESIGN → DEEP_DIVE → WRAP_UP

```jsx
// isCanvasLocked = phase === 'CLARIFICATION'
const isCanvasLocked = phase === 'CLARIFICATION'
```

---

#### `SDCanvas.jsx` — TẠO MỚI (React Flow)

```jsx
import { ReactFlow, useNodesState, useEdgesState, addEdge, Background, Controls } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

// Custom node types mapping
const NODE_TYPES = {
  Client: ClientNode,
  LoadBalancer: LoadBalancerNode,
  // ... 11 types
}

export default function SDCanvas({ isLocked }) {
  const dispatch = useDispatch()
  const savedJSON = useSelector(s => s.sdSession.architectureJSON)

  const [nodes, setNodes, onNodesChange] = useNodesState(savedJSON?.nodes ?? [])
  const [edges, setEdges, onEdgesChange] = useEdgesState(savedJSON?.edges ?? [])

  // On change → dispatch canvasChanged (saga debounces 2s)
  const handleNodesChange = useCallback((changes) => {
    onNodesChange(changes)
    dispatch(canvasChanged({ nodes: nodes, edges }))
  }, [nodes, edges, dispatch, onNodesChange])

  const handleEdgesChange = useCallback((changes) => {
    onEdgesChange(changes)
    dispatch(canvasChanged({ nodes, edges: edges }))
  }, [nodes, edges, dispatch, onEdgesChange])

  // On connect → show edge label dialog
  const handleConnect = useCallback((params) => {
    // Open EdgeLabelDialog, then addEdge with selected label
  }, [setEdges, dispatch, nodes, edges])

  // Restore from saved JSON khi mount
  useEffect(() => {
    if (savedJSON) {
      setNodes(savedJSON.nodes ?? [])
      setEdges(savedJSON.edges ?? [])
    }
  }, [])  // chỉ chạy 1 lần khi mount

  // Drop from NodeLibrary → add node tại position
  const handleDrop = useCallback((event) => {
    const type = event.dataTransfer.getData('nodeType')
    // Calculate position relative to canvas
    // setNodes([...nodes, newNode])
  }, [nodes, setNodes, dispatch, edges])

  if (isLocked) {
    return <LockedCanvasOverlay />  // Message "Canvas sẽ unlock sau Clarification phase"
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
      onConnect={handleConnect}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <Background />
      <Controls />
    </ReactFlow>
  )
}
```

**Custom Node Structure (mỗi type là 1 component nhỏ):**
- Mỗi node type có icon từ `lucide-react`, màu border riêng theo category
- Node label editable (double-click → inline input)
- Category → màu border:
  - Infra (LB, CDN, Gateway): `border-blue-500`
  - Compute (WebServer, Worker): `border-green-500`
  - Storage (DB, Cache, ObjectStorage): `border-yellow-500`
  - Messaging (MQ): `border-purple-500`
  - External (Client, ExternalService): `border-gray-400`

**Ghi chú quan trọng:** `SDCanvas.jsx` sẽ vượt 50 dòng do custom node definitions → tách custom nodes ra `SDNodeTypes.jsx` (file phụ, không tính trong budget vì không có logic business, chỉ render). Tổng file count vẫn giữ nguyên budget.

---

#### `NodeLibrary.jsx` — TẠO MỚI

Sidebar 240px rộng, danh sách 11 node types theo category:

```
Clients
  ├── [icon] Client
Infrastructure
  ├── [icon] Load Balancer
  ├── [icon] API Gateway
  ├── [icon] CDN
Compute
  ├── [icon] Web Server
  ├── [icon] Worker
Storage
  ├── [icon] Database (SQL)
  ├── [icon] Database (NoSQL)
  ├── [icon] Cache (Redis)
  └── [icon] Object Storage (S3)
Messaging
  ├── [icon] Message Queue
External
  └── [icon] External Service
```

Mỗi item: `draggable`, `onDragStart` → `e.dataTransfer.setData('nodeType', type)`. Canvas `onDrop` nhận type và tạo node mới.

---

#### `WalkthroughPanel.jsx` — TẠO MỚI

Layout:
```
[Transcript history area - scrollable]
─────────────────────────────────────
[🎤 Ghi âm button] | [Text input + Send]
```

Trách nhiệm:
- `useVoiceInput()` hook (tái dùng từ behavioral round)
- Khi voice stop: nếu transcript non-empty → dispatch `appendTranscriptRequest({ text, timestamp: new Date().toISOString(), source: 'voice' })`
- Khi text send: dispatch `appendTranscriptRequest({ text, timestamp: ..., source: 'text' })`
- Render transcript history từ `s.sdSession.transcriptHistory` — mỗi entry hiển thị `[HH:mm:ss] 🎤/💬 text`
- STT low confidence: **không detect ở FE level** (Web Speech API không expose confidence đủ reliable) — transcript được append trực tiếp

---

#### `App.jsx` — SỬA: thêm sd-room route

```jsx
import SDRoomPage from './components/sd-room/SDRoomPage'

// Trong renderPage():
if (page === 'sd-room') {
  return (
    <SDRoomPage
      navigate={navigate}
      sdSessionId={interviewSession?.sdSessionId}
      interviewSessionId={interviewSession?.sessionId}
    />
  )
}

// Trong navigate() guard, thêm 'sd-room' vào list cần auth:
// target === 'sd-room' → check isAuthenticated
```

---

#### i18n Keys — Thêm vào cả 3 file

```json
// en.json
"sdRoom": {
  "canvasLockedMessage": "Canvas will unlock after Clarification phase",
  "autoSaveStatus": {
    "saved": "Saved",
    "saving": "Saving...",
    "error": "Save failed — retrying"
  },
  "nodeLibrary": {
    "title": "Components",
    "categories": {
      "clients": "Clients",
      "infrastructure": "Infrastructure",
      "compute": "Compute",
      "storage": "Storage",
      "messaging": "Messaging",
      "external": "External"
    }
  },
  "walkthrough": {
    "voiceButton": "Hold to record",
    "textPlaceholder": "Explain your design...",
    "send": "Send",
    "transcript": "Walkthrough"
  },
  "phase": {
    "CLARIFICATION": "Clarification",
    "DESIGN": "Architecture",
    "DEEP_DIVE": "Deep Dive",
    "WRAP_UP": "Edge Cases",
    "COMPLETED": "Completed"
  }
}

// vi.json — tương tự bằng tiếng Việt
// ja.json — tương tự bằng tiếng Nhật (dùng [TODO: translate] nếu chưa có)
```

### File Count — Story 3
| File | Loại |
|------|------|
| `client/apps/web/src/components/sd-room/SDRoomPage.jsx` | Tạo mới |
| `client/apps/web/src/components/sd-room/SDCanvas.jsx` | Tạo mới |
| `client/apps/web/src/components/sd-room/NodeLibrary.jsx` | Tạo mới |
| `client/apps/web/src/components/sd-room/WalkthroughPanel.jsx` | Tạo mới |
| `client/apps/web/src/i18n/locales/en.json` | Sửa |
| `client/apps/web/src/i18n/locales/vi.json` | Sửa |
| `client/apps/web/src/i18n/locales/ja.json` | Sửa |
| `client/apps/web/src/App.jsx` | Sửa |

Tổng Story 3: **8 / 10** ✓

---

## Stability Notes

### Timeout / Error Handling

| Scenario | Handling |
|----------|----------|
| GET /sd-sessions/:id fail khi load | `loadFailure` → hiển thị error message + retry button |
| PATCH /architecture fail (network) | `autoSaveFailure` → indicator "⚠ Chưa lưu", saga retry lần sau (30s) |
| PATCH /transcript fail | Log silently — không crash session, transcript lost là acceptable |
| Phase polling fail | Log silently — retry 5s sau |
| React Flow throw | ErrorBoundary wrap `SDCanvas` → fallback "Canvas không khả dụng, tải lại trang" |

### Race Condition Prevention

- `canvasChanged` dùng `takeLatest` → chỉ saga mới nhất chạy, không có race giữa multiple changes
- `_autoSaveLoop` fork riêng, không liên quan `canvasChanged` watcher → không conflict
- Phase polling là read-only → không có write race

### Canvas State Restoration

- Khi `loadSuccess`, saga dispatch `setArchitectureJSON(data.architectureJSON)` vào slice
- `SDCanvas` có `useEffect([])` → `setNodes(savedJSON.nodes)` + `setEdges(savedJSON.edges)` 1 lần khi mount
- Không poll lại JSON từ server trong khi đang vẽ (sẽ overwrite local changes)

### Backend Validation

- PATCH /:id/phase — service check `if (!session) throw NotFoundException` trước update
- PATCH /:id/architecture — không validate node/edge structure deeply (JSON flexible), chỉ check session exists
- PATCH /:id/transcript — append, không replace → không mất transcript cũ nếu 2 request race

---

## Not Changing

- `SDSession` entity schema — đã có đủ field (architectureJSON, transcriptHistory, phase) từ Epic 1
- `SDProblem` entity — readonly trong feature này
- `InterviewSession` entity — không đụng tới
- Existing GET endpoints (`GET /sd-sessions/:id`) — giữ nguyên
- `useVoiceInput` hook — tái dùng, không sửa
- `interviewSetupSlice` / `interviewSetupSaga` — sdSessionId đã được lưu vào `session.sdSessionId` từ Epic 1

---

## File Count Summary

| Story | Files | Notes |
|-------|-------|-------|
| Story 1 — Backend PATCH APIs | 3 / 10 | Không phụ thuộc FE |
| Story 2 — FE State Layer | 4 / 10 | Phụ thuộc Story 1 |
| Story 3 — FE Canvas + Room UI | 8 / 10 | Phụ thuộc Story 2 |

Tổng toàn bộ feature: **15 files** (split thành 3 story, mỗi story ≤ 10)

**Triển khai thứ tự:** Story 1 → Story 2 → Story 3

BE Dev có thể làm Story 1 song song với FE Dev Story 2 (dùng mock API) — chỉ cần chốt API contract ở trên.
