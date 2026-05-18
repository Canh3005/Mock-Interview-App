# F032 — Behavior Interview Runtime: WALKTHROUGH

## Entry Points

| Endpoint | Mục đích |
|---|---|
| `POST /api/behavior-sessions` | Tạo session mới, pre-render probe questions, trả opening contract |
| `POST /api/behavior-sessions/:id/answer` | Submit candidate answer → SSE stream response |
| `GET /api/behavior-sessions/:id` | Lấy state, turnHistory, stageProgress |
| `POST /api/behavior-sessions/:id/complete` | Đánh dấu session COMPLETED, kick off Stage 5 |

Tất cả routes yêu cầu `JwtAuthGuard`. Ownership check: `session.interviewSession.userId === req.user.id`.

---

## Use-case Purpose

- **POST /api/behavior-sessions**: FE gọi sau khi có `planId` (từ F030). Server load `SessionPlan`, pre-render tất cả probe questions song song (`Promise.allSettled`), tạo `BehavioralSession` với `sessionMode = 'probe_based'`, emit opening contract turn.
- **POST /api/behavior-sessions/:id/answer**: Nhận câu trả lời của candidate → evaluate → policy → stream response. Nếu state = `OPENING` (lần đầu): start stage 1 + probe 1. Nếu đang trong probe: score cumulative answer → PolicyEngine → emit follow-up / challenge / redirect / transition / next probe.
- **GET /api/behavior-sessions/:id**: FE dùng để resume sau reload.
- **POST /api/behavior-sessions/:id/complete**: Trigger khi `interviewState === 'COMPLETED'` (auto set bởi server) hoặc user chủ động kết thúc.

---

## API / SSE Flow

### POST /api/behavior-sessions

```
FE gọi với { interviewSessionId }
  → Load SessionPlan (by sessionId = interviewSessionId)
  → Load tất cả QuestionProbe (selectedProbes + fallbackProbes từ tất cả stages)
  → Pre-render tất cả probe questions song song (Promise.allSettled, fallback về displayQuestion)
  → Create BehavioralSession (sessionMode='probe_based', interviewState='PLANNED')
  → Build opening contract text (scripted, không LLM)
  → Save opening_contract turn vào BehavioralStageLog
  → Set interviewState='OPENING', save session
  → Response: { sessionId, openingTurn, state: 'OPENING' }
```

### POST /api/behavior-sessions/:id/answer (SSE)

**Khi state = OPENING (lần đầu):**
```
emit { type: 'evaluating' }
→ startStage(stageIndex=0):
    emit stage_intro turn
    emit probe_question turn (pre-rendered)
    background: renderProbeFollowUps() (lazy pre-render)
→ stream từng turn qua SSE chunks
→ emit turn_complete cho mỗi turn
```

**Khi state = ASKING_PROBE / ASKING_FOLLOW_UP / CHALLENGING / ASKING_REDIRECT:**
```
emit { type: 'evaluating' }
→ save candidate_answer turn
→ append content vào activeProbeSession.candidateAnswerTexts (cumulative)
→ scoreForRuntime(questionProbe, cumulativeAnswer, language)  ← 2 LLM calls
→ PolicyEngine.decide(scoringResult, activeProbe, pressureProfile, ...)  ← deterministic
→ Theo action:
   REDIRECT    → save redirect turn, interviewState='ASKING_REDIRECT'
   FOLLOW_UP   → getOrRenderFollowUp (pre-rendered hoặc on-demand), save follow_up turn
   CHALLENGE   → getOrRenderFollowUp (red_flag), save challenge turn
   USE_FALLBACK → close current probe, switch to fallbackProbe, emit probe_transition + probe_question
   CLOSE_PROBE  → save ProbeRunSummary, emit probe_transition + next probe_question
                  hoặc stage_transition + stage_intro + probe_question nếu hết stage
                  hoặc set COMPLETED nếu hết stages
→ stream mỗi turn qua chunks
→ emit turn_complete cho mỗi turn kèm state + stageProgress
→ res.end()
```

---

## Code Path

| Layer | File |
|---|---|
| Controller | `behavior-session/behavior-session.controller.ts` |
| Service chính | `behavior-session/behavior-session.service.ts` |
| Flow / probe lifecycle | `behavior-session/behavior-session-flow.service.ts` |
| Policy Engine | `behavior-session/policy-engine.service.ts` |
| Probe Renderer (LLM) | `behavior-session/probe-renderer.service.ts` |
| Types | `behavior-session/types/behavior-session.types.ts` |
| DTOs | `behavior-session/dto/` |
| Entity (extended) | `behavioral/entities/behavioral-session.entity.ts` |
| Log entity (extended) | `behavioral/entities/behavioral-stage-log.entity.ts` |
| Scoring | `question-bank/services/scoring/question-practice-scoring.service.ts` |
| Module | `behavior-session/behavior-session.module.ts` |

---

## Guardrails / Failure Handling

| Guardrail | Cơ chế |
|---|---|
| Ownership | `session.interviewSession.userId !== userId` → 404 |
| No active probe | `!activeProbeSession \|\| status !== 'active'` → 400 |
| SessionPlan not found | `planId` null hoặc plan không tồn tại → 404 |
| SSE error | `try/catch` emit `{ type: 'error', message }` rồi `res.end()` |
| Pre-render fail | `Promise.allSettled` → fallback về `displayQuestion` hoặc `primaryQuestion` |
| Follow-up render fail | on-demand fallback về raw text từ `probe.followUps[].question` |
| Safety ceiling | `totalTurnCount >= maxTurnsPerProbe` → `CLOSE_PROBE (turn_limit_reached)` |
| Redirect guard | `insufficient_evidence` + `redirectCount < 1` → `REDIRECT` trước khi fallback |

---

## Conformance Notes

Implement đầy đủ các guardrail trong HOW/IMPLEMENTATION_PLAN.md:
- ✅ PolicyEngine deterministic với priority list đầy đủ (step 0 → 6)
- ✅ `totalTurnCount` safety ceiling (Junior=2, Mid=3, Senior=4)
- ✅ REDIRECT guard trước fallback (`insufficient_evidence` + redirectCount < 1)
- ✅ Pre-render probe questions tại session init (Promise.allSettled)
- ✅ Lazy pre-render follow-ups tại probe start (background)
- ✅ On-demand fallback nếu lazy pre-render chưa xong
- ✅ Cumulative answer scoring (tất cả candidate turns trong probe)
- ✅ SSE typed events: `evaluating`, `turn_start`, `chunk`, `turn_complete`, `error`
- ✅ `sessionMode = 'probe_based'` — không break sessions legacy
- ✅ Tất cả entity columns mới đều nullable

**Deviation so với IMPLEMENTATION_PLAN.md:**
- `'no_signal'` trong plan → code dùng `'insufficient_evidence'` (tên thực tế trong `OverallBand` type)
- Chunk streaming của pre-rendered text dùng word-split thay vì LLM streaming thật (không cần LLM call thêm cho pre-rendered content)
- `POST /api/behavior-sessions` nhận `interviewSessionId` (lookup SessionPlan bằng `sessionId` field), không phải `planId` trực tiếp — đơn giản hơn cho FE, không cần thêm field vào `initSession` response
