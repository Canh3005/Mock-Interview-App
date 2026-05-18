# WALKTHROUGH — F030 Session Planning (Stage 1)

## Entry points

| Loại | Đường dẫn |
|---|---|
| API tạo plan | `POST /session-planning/plans` |
| API lấy plan gần nhất | `GET /session-planning/plans/latest` |
| Controller | `server/src/session-planning/session-planning.controller.ts` |
| Module | `server/src/session-planning/session-planning.module.ts` |

---

## Use-case purpose

- **POST /session-planning/plans** — User confirm bắt đầu session: hệ thống nhận `calibrationProfileId`, `depth`, `durationMinutes`, `language`, tạo `SessionPlan` xác định trước toàn bộ probe cho 6 stage. Plan là execution contract bất biến cho Interview Runtime (Stage 2).
- **GET /session-planning/plans/latest** — Runtime hoặc FE dùng để load plan gần nhất của user trước khi bắt đầu interview session.

---

## User/API flow

1. FE gửi `POST /session-planning/plans` kèm `calibrationProfileId`, `depth`, `durationMinutes`, `language`, (optional) `personaPreference`.
2. Controller gọi `SessionPlanningService.createPlan`.
3. Service load `BehaviorCalibrationProfile` theo `calibrationProfileId` + `userId`.
4. Validate status: từ chối nếu `failed`, `jd_only` (partial không có CV).
5. Load `CandidateClaim[]`, `RiskHypothesis[]` theo calibration, `QuestionProbe[]` (`status = active`).
6. Tính `jdTechStack` (rỗng nếu partial cv_only).
7. Build `PersonaPolicy` từ preset theo `targetLevel`; override `tone` nếu `personaPreference` được truyền.
8. Build `PressureProfile` từ preset theo `targetLevel`; điều chỉnh `maxChallengesPerProbe` theo `depth`.
9. Gọi `ProbeSelectorService.buildStageAllocations` → trả về 6 `StageProbeAllocation`, `allocatedMinutes = 0`.
10. Gọi `_allocateDuration` → tính `allocatedMinutes` và `estimatedMinutes` cho từng probe (clamp 4–12 phút). Stage trống (0 probe) bị skip; weight của chúng được phân bổ lại cho `must_include` stages.
11. Tạo entity `SessionPlan` với `sessionId` mới (UUID), lưu DB.
12. Trả về `SessionPlan` đã persist.

---

## Code path

```
Controller → SessionPlanningService.createPlan
               ├── profileRepository.findOne
               ├── _validateProfile
               ├── claimRepository.find
               ├── riskRepository.find
               ├── probeRepository.find (status=active)
               ├── _resolveJdTechStack
               ├── _buildPersonaPolicy
               ├── _buildPressureProfile
               ├── ProbeSelectorService.buildStageAllocations
               │     └── per stage: _hardFilter → _selectForStage
               │           ├── Stage 6: _selectStage6 (role_level_fit only)
               │           └── Stages 1–5: _scoreProbesForStage → _routeScore
               │                 ├── Behavioral (1,5): _scoreBehavioralProbe
               │                 ├── Technical (2,3): _scoreTechnicalProbe (null nếu techFit=0)
               │                 └── CV (4): _scoreCvProbe
               ├── _allocateDuration → _computeEffectiveWeights
               └── planRepository.save
```

---

## Guardrails / Failure

| Điều kiện | Phản hồi |
|---|---|
| Profile không tìm thấy hoặc sai userId | `NotFoundException` |
| `profile.status === 'failed'` hoặc status lạ | `BadRequestException` |
| `profile.status === 'partial'` và `!hasCv` (jd_only) | `BadRequestException` |
| Stage 4 không có probe sau filter | `selectedProbes: []`, `allocatedMinutes: 0`; weight phân bổ lại cho must_include stages |
| Stage 6 không có probe | `selectedProbes: []`, plan vẫn valid |
| Probe tech stages có techTags nhưng techTagFit = 0 (không match CV/JD) | Bị loại khỏi pool scoring (trả `null`) |

---

## Scoring summary

| Stage | Formula |
|---|---|
| 1, 5 (behavioral) | `competencyFit×0.45 + roleLevelFit×0.35 + riskWeight×0.20` |
| 2, 3 (technical) | `techTagFit×0.55 + roleLevelFit×0.30 + difficultyFit×0.15` |
| 4 (CV) | `claimVerificationFit×0.50 + techTagFit×0.30 + roleLevelFit×0.20` |
| 6 | `roleLevelFit` only, chọn 1 probe |

Stage 5 override `priorityCompetencies` thành `[conflict_handling, collaboration, communication, impact_measurement]`.

---

## Conformance notes

- Probe selection: đúng theo IMPLEMENTATION_PLAN — hard filter 5 điều kiện, scoring per-stage-type, probe count table (broad/deep), fallback cho must_include stages.
- Duration allocation: đúng công thức — `usable = duration - 5`, weight per stage per depth, phân bổ lại weight của stage trống.
- `recent_repetition_penalty`: deferred theo OQ-3 trong plan — `penalty = 0` cho tất cả (chưa có `BehaviorSession` entity).
- Stage 1 không gọi LLM — toàn bộ deterministic backend logic.
- `SessionPlan.sessionId`: UUID mới được generate, dùng làm correlation ID cho Stage 2 (Interview Runtime).
