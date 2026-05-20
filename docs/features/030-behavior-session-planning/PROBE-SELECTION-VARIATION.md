# Probe Selection Variation Options

## Van de

`ProbeSelectorService` hien tai la deterministic. Neu input vao khong doi va pool probe tu DB gan nhu giu cung thu tu, `SessionPlan` moi se chon lai cung mot tap probe.

Dieu nay tot cho tinh on dinh va debug, nhung co van de trong phong van thuc te:

- Ung vien co the luyen nhieu lan voi cung CV/JD va gap lai dung cau hoi cu.
- Tech stack cua ung vien co the rat rong, nhung session chi nen tap trung vao mot so tech chinh.
- Score cao nhat khong phai luc nao cung la tap cau hoi tot nhat ve mat coverage.
- Khong co co che giam uu tien probe da hoi gan day.

Current code path:

- Selector: `server/src/session-planning/probe-selector.service.ts`
- Plan creation: `server/src/session-planning/session-planning.service.ts`
- Input contract: `server/src/session-planning/types/session-plan.types.ts`

## Muc tieu

Giai phap nen dat cac yeu cau sau:

- Mot session da tao phai on dinh: runtime khong tu doi probe giua chung.
- Nhieu session cho cung user co the co variation hop ly.
- Van uu tien tech stack quan trong, khong random qua da.
- Co the test va debug lai duoc selection.
- Khong lam mat coverage cua stage 2, 3, 4.

## Baseline hien tai

Input selector hien co:

```ts
interface ProbeSelectionContext {
  probes: QuestionProbe[];
  depth: InterviewDepth;
  targetLevel: QuestionProbeLevel;
  roleFamily: QuestionProbeRoleFamily;
  language: QuestionProbeLanguage;
  priorityCompetencies: QuestionProbeCompetency[];
  competencyWeights: Record<string, number>;
  riskHypotheses: RiskHypothesis[];
  candidateClaims: CandidateClaim[];
  cvTechStack: string[];
  jdTechStack: string[];
  selectionSeed: string;
}
```

Tech scoring hien tai:

```txt
techFit = (jdMatches * 0.7 + cvOnlyMatches * 0.3) / probeTechTags.length
```

Neu probe co `techTags` nhung khong overlap voi CV/JD thi bi loai khoi technical selection.

## Current implementation status

Applied in `server/src/session-planning/probe-selector.service.ts`:

- Stage 2 now uses a dedicated JD-tech coverage selector when `jdTechStack` is present.
- Stage 2 targets `tech:intro` and `tech:mid_deep` coverage for JD techs, capped by stage probe count.
- Stage 3 now uses a dedicated applied-domain selector.
- Stage 3 prefers scenario/domain probes by `type`, `competencies`, inferred theme, and mid/deep depth.
- Stage 3 penalizes pure `technical_depth` + `intro` probes to avoid repeating Stage 2.
- Top-K seeded variation is now applied with `K = 2N`.
- `SessionPlanningService` resolves `sessionId` before selection and passes it as `selectionSeed`.
- Generic stages use seeded selection from the top `2N` scored probes.
- Stage 2 and Stage 3 use seeded top `2 * remainingSlots` candidates during their coverage loops, while preserving their coverage policy.

Not applied yet:

- User history score decay.
- A persisted `coverageTheme` schema field.

## Tech coverage policy

Quyet dinh moi: voi moi tech trong `jdTechStack`, plan nen co coverage toi thieu:

```txt
1 intro probe
1 mid/deep probe
```

Nhung rule nay chi kha thi neu so tech trong JD khong vuot qua budget probe. Vi du stage 2 broad co 4 probe thi chi cover du intro + mid/deep cho toi da 2 tech. Neu JD co 5 tech requirements, selector phai chon subset tech chinh truoc.

Suggested cap:

```txt
maxCoveredJdTech = floor(stage2ProbeCount / 2)
```

Voi count hien tai:

```txt
stage 2 broad = 4 probe -> cover toi da 2 JD tech
stage 2 deep = 5 probe -> cover toi da 2 JD tech day du, con 1 slot bonus
```

Neu muon cover 3 JD tech day du intro + mid/deep, stage 2 can it nhat 6 probe hoac phai chia coverage sang stage 3.

### Coverage units

Selector khong nen chi dem "probe co techTag match". Nen dem theo coverage unit:

```txt
coverageKey = techTag + conversationDepthBucket
```

Depth bucket:

```txt
intro = conversationDepth === 'intro'
mid_deep = conversationDepth === 'mid' hoac 'deep'
```

Vi du:

```txt
nodejs:intro
nodejs:mid_deep
express:intro
express:mid_deep
```

Khi chon probe, selector so sanh coverage cua probe dang xet voi coverage da co trong `selected` cua stage.

```txt
missing coverage unit -> bonus lon
already covered unit -> khong bonus
too many probes same tech -> penalty nhe
```

Goi y scoring adjustment:

```txt
requiredCoverageBonus = +0.20 neu probe fill missing intro/mid_deep cho JD tech
duplicateCoveragePenalty = -0.08 neu coverage unit da co
duplicateTechPenalty = -0.04 neu tech da co du intro + mid_deep
```

Rule quan trong: required coverage bonus nen lon hon duplicate penalty, vi muc tieu dau tien la dat coverage toi thieu cho JD tech chinh.

## Stage 2 vs Stage 3 boundary

Hien tai Stage 2 va Stage 3 de bi trung nghia neu deu chon probe theo `techTags`. Can dinh nghia lai ranh gioi:

### Stage 2: Tech stack verification

Stage 2 tra loi cau hoi:

```txt
Ung vien co that su nam tung tech chinh trong JD khong?
```

Selection policy:

- Primary driver la `jdTechStack`.
- Moi covered JD tech can 1 intro probe va 1 mid/deep probe neu budget cho phep.
- Probe nen co `conversationDepth` ro: `intro`, `mid`, hoac `deep`.
- Probe nen tap trung vao mot tech chinh, vi du `nodejs`, `express`, `postgresql`.
- Type phu hop: `technical_depth`, `debugging`, `trade_off`.

Vi du:

```txt
Node.js intro: event loop / async model overview
Node.js mid/deep: blocking, microtasks, backpressure, worker threads
Express intro: request-response, middleware pipeline
Express mid/deep: error flow, async errors, middleware ordering
```

### Stage 3: Applied domain and engineering judgment

Stage 3 tra loi cau hoi:

```txt
Ung vien co biet ap dung tech vao bai toan backend/domain thuc te khong?
```

Stage 3 khong nen hoi lai "intro + deep" cho tung tech. No nen hoi scenario hoac cross-cutting engineering:

- API design va contract evolution
- Authentication/authorization flow
- Data consistency, transactions, idempotency
- Observability va debugging production incident
- Performance, scalability, caching, rate limiting
- Reliability, rollout, rollback, migration

Probe Stage 3 co the co `techTags`, nhung `techTags` chi la context. Primary driver nen la domain/engineering theme.

Vi du:

```txt
Design an idempotent payment callback flow with Express and PostgreSQL.
Debug a production latency spike across Node.js, Redis, and database calls.
Plan a JWT/session migration without breaking existing users.
```

### Implication for selector

Stage 2 selector:

```txt
optimize for per-tech coverage:
  jdTech -> intro + mid/deep
```

Stage 3 selector:

```txt
optimize for scenario/theme coverage:
  avoid repeating pure tech-depth probes already selected in Stage 2
  prefer probes with multi-tech or domain-style intent
```

Neu taxonomy hien tai khong du de phan biet Stage 3 theme, can them mot field sau:

```ts
coverageTheme?: string[];
```

Vi du:

```txt
api_design
auth_security
data_consistency
production_debugging
performance_scalability
reliability_rollout
```

Neu chua them schema, co the tam thoi infer Stage 3 theme tu `type`, `competencies`, `intent`, va `techTags`, nhung day chi nen la bridge solution.

## Option 1: Exclude recently used probes

Them input:

```ts
recentProbeIds: string[]
```

Selector loai hoac phat penalty nhung probe da duoc hoi gan day.

Co hai cach:

```txt
hard exclude: probe trong recentProbeIds khong duoc chon
soft penalty: score = score - recentPenalty
```

Uu diem:

- De hieu, de test.
- Giam lap cau hoi truc tiep.
- Phu hop practice mode hoac user tao nhieu session lien tiep.

Nhuoc diem:

- Neu bank probe con it, hard exclude co the lam thieu cau hoi.
- Can luu va query lich su probe da hoi theo user/session.

Khuyen nghi:

- Dung soft penalty truoc.
- Chi hard exclude neu probe bank du lon hoac trong practice mode.

## Option 2: Focus tech stack

Them input ro rang:

```ts
focusTechStack: string[]
```

Y nghia: danh sach tech chinh can kiem tra trong session nay.

Nguon co the lay theo thu tu:

```txt
1. Tech do user/JD chon ro rang
2. jdTechRequirements neu co JD
3. Top N tech tu CV neu chi co CV
```

Scoring moi co the tach thanh:

```txt
focusMatches: match voi focusTechStack
jdMatches: match voi jdTechStack
cvMatches: match voi cvTechStack
```

Cong thuc goi y:

```txt
techFit = (focusMatches * 1.0 + jdOnlyMatches * 0.5 + cvOnlyMatches * 0.2) / probeTechTags.length
```

Uu diem:

- Giai quyet dung van de "CV co qua nhieu tech".
- Stage 2/3/4 tap trung vao tech quan trong thay vi random tren toan bo CV.
- Co the hien thi cho user: "Session nay tap trung vao Node.js, Express, PostgreSQL".

Nhuoc diem:

- Can quy tac sinh `focusTechStack`.
- Neu focus qua hep, mot so probe tot co the bi day xuong thap.

Khuyen nghi:

- Nen lam. Day la input chien luoc, khong chi la randomization.

## Option 3: Top-K selection with deterministic session seed

Thay vi luon lay top N sau khi sort score, lay top K ung vien roi pick N bang deterministic shuffle theo seed.

Vi du:

```txt
N = so probe can chon
K = min(pool size, N * 2)
candidatePool = top K by score
selected = seededShuffle(candidatePool, sessionId).slice(0, N)
```

Seed co the la:

```txt
sessionId
calibrationProfileId + createdAt
userId + sessionId
```

Uu diem:

- Cung session luon stable.
- Session khac co variation.
- Van nam trong nhom score cao, khong random qua rong.

Nhuoc diem:

- Debug can log seed va candidatePool.
- Neu score distribution rat ro, co the pick probe thap hon top absolute.

Khuyen nghi:

- Nen dung cung voi focus tech stack.
- K da chot la `K = 2N`.

## Option 4: Coverage-aware diversification

Sau khi score, khong chi sort theo score ma them coverage constraint.

Vi du trong stage 2/3:

- Khong chon qua nhieu probe cung mot `techTag`.
- Uu tien cover nhieu focus tech khac nhau.
- Uu tien da dang `type`: `technical_depth`, `debugging`, `trade_off`.
- Uu tien da dang `conversationDepth`: intro/mid/deep.

Pseudo:

```txt
while selected.length < count:
  pick probe co adjustedScore cao nhat
  adjustedScore = baseScore + coverageBonus - duplicateTagPenalty
```

Uu diem:

- Chat luong plan tot hon viec chi lay top score.
- Stage technical co coverage rong va hop ly hon.

Nhuoc diem:

- Phuc tap hon top-K shuffle.
- Can dinh nghia coverage policy ro cho tung stage.

Khuyen nghi:

- Lam sau khi co `focusTechStack`.
- Bat dau nhe bang duplicate tag penalty, chua can full optimizer.

## Option 5: Score decay by probe usage history

Luu usage history theo user:

```txt
userId
questionProbeId
lastAskedAt
askedCount
lastBand
```

Tinh penalty:

```txt
usagePenalty = recentPenalty + frequencyPenalty
finalScore = baseScore - usagePenalty
```

Vi du:

```txt
asked trong 7 ngay: -0.30
asked trong 30 ngay: -0.15
moi lan da hoi: -0.03, cap at -0.15
```

Uu diem:

- Variation theo user that su.
- Giam lap trong long-term practice.

Nhuoc diem:

- Can schema/query moi.
- Can quy tac reset/ignore cho interview mode that su.

Khuyen nghi:

- Phu hop F031 practice mode hon F030 interview planning.
- Co the de sau neu muon giu F030 don gian.

## Option 6: User-selectable focus areas

Cho user chon tech chinh truoc khi tao plan:

```txt
Focus tech: Node.js, Express, PostgreSQL
Optional: Redis, JWT
Avoid: React
```

DTO co the them:

```ts
focusTechStack?: string[];
avoidTechStack?: string[];
```

Uu diem:

- Dung mong muon user nhat.
- Huu ich khi CV co rat nhieu tech nhung user chi muon phong van cho job cu the.

Nhuoc diem:

- Can UI/UX.
- User co the chon qua nhieu hoac qua it.

Khuyen nghi:

- Nen ho tro optional.
- Neu user khong chon thi fallback ve JD/top CV tech.

## Recommended direction

Nen ap dung ca Option 4 va Option 5, nhung theo thu tu co kiem soat:

1. Giu `jdTechStack` lam focus tech stack chinh khi co JD. Cong thuc 0.7 / 0.3 hien tai la baseline tot: JD match quan trong hon CV-only match.
2. Dinh nghia ro Stage 2 vs Stage 3. Stage 2 la per-tech verification; Stage 3 la applied/domain scenario.
3. Them JD-tech coverage guarantee cho Stage 2: moi covered JD tech co 1 intro va 1 mid/deep probe neu budget cho phep.
4. Them coverage-aware diversification (Option 4) trong selector. Day la buoc nen lam som vi no khong can schema moi.
5. Them top-K deterministic selection theo `sessionId` de tao variation giua cac session ma van nam trong nhom probe score cao.
6. Them score decay theo usage history (Option 5) de giam lap probe da hoi gan day. Buoc nay can nguon du lieu lich su nen nen tach thanh phase rieng.

Ly do xep Option 4 truoc Option 5:

- Option 4 cai thien chat luong plan ngay ca khi user tao session dau tien.
- Option 4 khong phu thuoc vao DB history.
- Option 5 can query lich su probe theo user/session va phai dinh nghia cua so thoi gian, penalty cap, va che do interview/practice.

Khong nen thay scoring hien tai bang random. Huong tot hon la:

```txt
baseScore tu cong thuc hien tai
+ coverageBonus neu probe giup cover tech/type chua duoc cover
- duplicateTagPenalty neu qua nhieu probe cung tech tag
- usageDecayPenalty neu probe da hoi gan day
=> finalScore
```

## Proposed implementation shape

### 1. Keep JD-weighted tech fit

Khong can doi ngay `focusTechStack` thanh field moi neu quyet dinh san pham la:

```txt
focusTechStack = jdTechStack
```

Cong thuc hien tai co the giu:

```txt
jdMatches: 0.7
cvOnlyMatches: 0.3
```

Neu khong co JD, selector se tiep tuc dua vao `cvTechStack`.

### 2. Add coverage-aware diversification

Sau khi tinh `baseScore`, selector nen chon probe theo vong lap thay vi chi sort va slice.

Stage 2 phai dung coverage unit theo JD tech:

```txt
tech:intro
tech:mid_deep
```

Stage 3 phai dung theme coverage:

```txt
coverageTheme
```

Neu chua co `coverageTheme`, tam thoi dung heuristic tu `type`, `competencies`, `intent`, `techTags`.

Goi y penalty/bonus ban dau:

```txt
requiredCoverageBonus = 0.20 neu fill missing JD tech intro/mid_deep
duplicateTechTagPenalty = 0.08 cho moi tech tag da duoc cover
newTechTagBonus = 0.04 neu probe cover tech tag chua duoc cover
duplicateTypePenalty = 0.04 neu stage da co probe cung type
```

Pseudo:

```txt
selected = []
while selected.length < count:
  for each remaining probe:
    adjustedScore = baseScore
    adjustedScore += newTechTagBonus
    adjustedScore -= duplicateTechTagPenalty
    adjustedScore -= duplicateTypePenalty
  pick highest adjustedScore
```

Muc tieu khong phai ep moi tech deu co cau hoi, ma la tranh viec 4-5 probe cua stage 2/3 deu roi vao cung mot tech tag.

### 3. Replace top-N with top-K seeded pick

Trong `_selectForStage`:

```txt
score all probes
apply coverage adjustment
sort by adjusted score desc
candidatePool = top 2N
selectedRaw = seededPick(candidatePool, count, selectionSeed + stage)
fallbackRaw = next best or seeded from remaining
```

Important: neu candidatePool it hon count thi chon het.

### 4. Add usage-history score decay

Them input vao selector:

```ts
probeUsage?: Record<
  string,
  {
    lastAskedAt?: string;
    askedCount?: number;
  }
>;
```

Hoac dang da normalize hon:

```ts
probeUsagePenalties: Record<string, number>;
```

Khuyen nghi bat dau voi `probeUsagePenalties` de selector khong can biet cach tinh thoi gian.

Penalty goi y:

```txt
asked trong 7 ngay: -0.30
asked trong 30 ngay: -0.15
asked trong 90 ngay: -0.07
frequency: -0.03 * askedCount, cap at -0.15
```

Final score:

```txt
finalScore = baseScore + coverageBonus - coveragePenalty - usagePenalty
```

Usage history co the lay tu:

- `BehavioralSession.stageProgress[].probeRuns[]` neu da luu day du.
- Hoac bang moi `question_probe_usage` neu can query nhanh va on dinh hon.

Khuyen nghi production:

- Phase dau: derive tu session history gan day, khong tao bang moi.
- Khi traffic tang: denormalize thanh bang usage rieng.

### 5. Add logs/debug metadata

`PlannedProbe.selectionReason` nen noi ro:

```txt
Tech: nodejs, express | score=0.82 | coverage:+0.04 usage:-0.15
```

Co the them field sau nay:

```ts
selectionDebug?: {
  baseScore: number;
  penalties: string[];
  seed?: string;
}
```

## Open questions

- `focusTechStack` nen do user chon hay auto resolve tu JD/CV?
- Neu user chi co CV va khong co JD, top CV tech nen lay theo thu tu nao?
- Co nen dam bao moi focus tech co it nhat 1 probe neu bank co du?
- Fallback probes co nen dung cung seeded strategy hay luon lay next-best deterministic?
- Interview mode co can xem history cu hay chi practice mode moi can?

## Suggested first milestone

Milestone nho nhat co gia tri:

- Giu JD/CV tech weighting hien tai.
- Dinh nghia Stage 2 la JD-tech verification va Stage 3 la applied/domain scenario.
- Them Stage 2 coverage units: `tech:intro`, `tech:mid_deep`.
- Them coverage-aware diversification trong selector cho Stage 2.
- Them unit tests cho missing JD-tech intro/mid_deep duoc uu tien hon duplicate coverage.
- Chua can query usage history.

Milestone tiep theo:

- Them Stage 3 theme coverage, uu tien domain/scenario probe thay vi lap lai pure tech-depth probe.
- Top-K seeded selection da ap dung voi `K = 2N`.
- Unit test da cover seeded top-2N pool cho generic stage selection.

Milestone sau do:

- Query recent probe usage theo user.
- Tinh `probeUsagePenalties` trong `SessionPlanningService`.
- Ap dung score decay trong selector.
- Unit tests cho recent probe bi day xuong nhung khong bi loai cung neu pool qua it.
