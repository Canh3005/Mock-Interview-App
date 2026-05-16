# Feature 031 — Behavior Practice Mode

Practice mode là extension của behavior session cho phép hệ thống nhớ cross-session history và ưu tiên probe những điểm chưa được cover tốt. Feature này build trên nền F029 (calibration) và F030 (session planning) — không thay thế, chỉ mở rộng.

**Prerequisite:** F029 và F030 phải hoàn chỉnh và stable trước khi bắt đầu F031.

---

## Khác biệt cốt lõi so với Interview Mode

| | Interview mode (F030) | Practice mode (F031) |
|---|---|---|
| Probe selection | Mọi claim/risk weight bằng nhau | Weight điều chỉnh theo outcome history |
| Session goal | `screening`, `full_round`, `company_specific` | `general`, `weakness_repair`, `deep_dive` |
| Coverage | Per-session — interviewer không biết lịch sử | Cross-session — hệ thống nhớ đã cover gì |
| Khi tất cả đã cover | Không xảy ra (mỗi session fresh) | Staleness decay tự động reset weight |
| Feedback style | Post-session coaching | Có thể có live hint nếu user chọn |

---

## Thay đổi trong Stage 1 khi practice mode

### `Stage1Input` bổ sung

```ts
interface Stage1Input {
  // ... giữ nguyên từ F030 ...
  recentClaimOutcomes: SessionClaimOutcome[]  // outcomes từ N session gần nhất
  recentRiskOutcomes: SessionRiskOutcome[]    // outcomes từ N session gần nhất
}
```

### Weight modifier theo outcome history

```ts
function getClaimProbeWeight(
  claim: CandidateClaim,
  outcomes: SessionClaimOutcome[],
  decayHorizonDays = 30,
): number {
  const latest = outcomes.filter(o => o.claimId === claim.id).sort(bySessionDateDesc)[0]
  if (!latest) return 1.0

  const baseWeight: Record<SessionClaimOutcomeStatus, number> = {
    insufficient_evidence: 0.9,
    contradicted:          0.6,
    probed:                0.5,
    supported:             0.2,
  }
  const staleness = Math.min(1.0, daysSince(latest.createdAt) / decayHorizonDays)
  return baseWeight[latest.status] + (1.0 - baseWeight[latest.status]) * staleness
}
```

`getRiskProbeWeight` tương tự với `decayHorizonDays = 14` cho risk (điểm yếu recover nhanh hơn claim đã verify).

### Session goal cho practice

```ts
type PracticeGoal =
  | 'general'          // coverage rộng, hệ thống tự chọn theo weight
  | 'weakness_repair'  // ưu tiên tối đa claim/risk có weight cao (chưa cover hoặc cover kém)
  | 'deep_dive'        // tập trung 1-2 competency, probe sâu hơn, ignore weight history
```

`deep_dive` override weight về 1.0 cho tất cả claims thuộc competency được chọn — user muốn luyện lại từ đầu cho một kỹ năng cụ thể.

### Detect "all claims saturated"

Khi tất cả claims có adjusted weight < `0.4` (tất cả đã cover gần đây), Stage 1 emit warning `all_claims_recently_verified` vào `SessionPlan.warnings`. FE hiển thị "Bạn đã luyện đủ các điểm trong CV này gần đây — đây là session ôn tập." Plan vẫn được tạo, không block session.

---

## Bổ sung `SessionGoal` type

F030 dùng `SessionGoal` cho interview goals. F031 cần tách:

```ts
type InterviewGoal = 'screening' | 'full_round' | 'company_specific'
type PracticeGoal  = 'general' | 'weakness_repair' | 'deep_dive'
type SessionGoal   = InterviewGoal | PracticeGoal
```

`SessionPlan` thêm `sessionMode: 'interview' | 'practice'` để Stage 3–5 biết mode khi evaluate coverage.

---

## Ảnh hưởng đến Stage 3–5

| Stage | Interview mode | Practice mode bổ sung |
|---|---|---|
| Stage 3 runtime | Tạo `SessionClaimOutcome` / `SessionRiskOutcome` | Như cũ |
| Stage 5 synthesis | Coverage tính per-session | Thêm flag `improvedFromLastSession` per competency |
| Stage 6 coaching | Feedback per-session | Thêm so sánh với session trước: "lần này tốt hơn ở X" |
| Stage 7 progress | Tạo `BehaviorProgressProfile` | Dùng `SessionClaimOutcome` history để detect recurring weakness |

---

## Open Questions cho F031

- **Q1:** `BehaviorProgressProfile` entity lưu ở đâu — trong `BehaviorSession` aggregate hay bảng riêng? F030 chưa định nghĩa.
- **Q2:** `N session gần nhất` trong `recentClaimOutcomes` — lấy bao nhiêu session? (đề xuất: 5 sessions gần nhất trong 90 ngày)
- **Q3:** Live hint trong practice mode (hiển thị gợi ý STAR structure trong khi đang trả lời) có cần backend support hay chỉ là FE feature?
- **Q4:** `deep_dive` goal cần user chọn competency target — UX flow cho phần này là gì?

---

## Scope của F031

**Trong scope:**
- Weight modifier logic trong Stage 1
- `PracticeGoal` type và goal-based selection adjustment
- `sessionMode` field trong `SessionPlan`
- `all_claims_saturated` warning
- Stage 6 so sánh với session trước
- Stage 7 `BehaviorProgressProfile` build từ `SessionClaimOutcome` history

**Ngoài scope:**
- Live hint trong session (FE-only feature, không cần backend thay đổi)
- Recommendation engine ("bạn nên luyện topic X tiếp theo") — sau khi có đủ dữ liệu thực tế
- Social/cohort comparison — feature riêng, không phải core practice loop
