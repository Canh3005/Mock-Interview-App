## Overview

Intercept `POST /interview/sessions/init` to calculate total credit cost from selected rounds, deduct atomically with pessimistic lock, then propagate `newBalance` to FE for immediate header update and low-balance toast. Insufficient credit throws structured error caught by saga to show blocking modal.

## Architectural Decisions

### Decision: Where to deduct credit

**Option A — At `initSession` (interview.service.ts):**
- Receives `rounds: string[]` → can calculate total cost for multi-round in one call
- Single deduction point for all session types
- Pro: atomic, single point of failure, multi-round naturally handled
- Con: none

**Option B — At each sub-session start (behavioral/dsa/sd):**
- Deduct separately per round start
- Pro: granular
- Con: multiple DB transactions, no atomic check for multi-round total, race condition window larger

**Chọn: Option A** — `initSession` is the only place that sees all selected rounds simultaneously, making it the correct place to validate and deduct total cost.

## Backend Changes (server/)

### `server/src/wallet/wallet.service.ts`
Add `deductCredit({ userId, amount, description })`:
- Open QueryRunner, start transaction
- `findOne(Wallet, { where: { userId }, lock: { mode: 'pessimistic_write' } })`
- If `balance < amount` → rollback, throw `BadRequestException({ code: 'INSUFFICIENT_CREDITS', required, current, deficit })`
- Deduct balance, save Wallet, create `WalletTransaction(type: DEBIT)`, commit
- Return `newBalance: number`

### `server/src/interview/interview.service.ts`
- Add module-level `ROUND_CREDIT_COST: Record<string, number>` = `{ hr_behavioral: 4, dsa: 3, system_design: 8, ai_prompting: 2 }`
- Add module-level `LOW_BALANCE_THRESHOLD = 5`
- Inject `WalletService` via constructor
- In `initSession()`: calculate `totalCost`, call `walletService.deductCredit(...)` before `sessionRepo.save()`
- Return shape: `{ sessionId, candidateLevel, estimatedDuration, newBalance }`

### `server/src/interview/interview.module.ts`
- Import `WalletModule`

## Frontend Changes (client/apps/web/)

### `src/store/slices/walletSlice.js`
- Add `setBalance(state, action)` reducer → `state.balance = action.payload`

### `src/store/slices/interviewSetupSlice.js`
- Add `creditError: null` to `initialState`
- Add `setCreditError(state, action)` → sets `creditError`, resets `loading`, sets `step = 'round_select'`
- Add `clearCreditError(state)` → `creditError = null`
- In `initSessionRequest` reducer: also clear `creditError`

### `src/store/sagas/interviewSetupSaga.js`
In `initSessionSaga` success path:
- Extract `newBalance` from response
- `yield put(setBalance(newBalance))`
- If `newBalance === 0` → `toast.warning(t('creditGate.zeroBalanceWarning'))`
- Else if `newBalance < LOW_BALANCE_THRESHOLD` → `toast.warning(t('creditGate.lowBalanceWarning', { balance: newBalance }))`

In error path:
- If `err.response?.data?.code === 'INSUFFICIENT_CREDITS'` → `yield put(setCreditError(err.response.data))`, return (no toast)
- Else → generic `initSessionFailure` + toast

### `src/components/interview-setup/InterviewSetupFlow.jsx`
- Add `InsufficientCreditModal` inline component (shows required/current/deficit + "Nạp Credit" button)
- In `InterviewSetupFlow`: read `creditError` from Redux; if set, render `InsufficientCreditModal` instead of current step content
- `onClose` of modal → dispatch `clearCreditError()`
- "Nạp Credit" button → navigate to purchase page (placeholder route for story 014)

### `src/i18n/locales/en.json` / `vi.json` / `ja.json`
Add under `creditGate`:
- `insufficientTitle`, `insufficientBody` (with `required`/`current`/`deficit` interpolation), `topUp`, `close`, `lowBalanceWarning` (with `balance`), `zeroBalanceWarning`

## API Contract

`POST /interview/sessions/init` — existing endpoint, response shape extended:
```json
{
  "sessionId": "uuid",
  "candidateLevel": "junior | mid | senior",
  "estimatedDuration": 50,
  "newBalance": 5
}
```

Error (insufficient credits):
```json
{
  "statusCode": 400,
  "code": "INSUFFICIENT_CREDITS",
  "required": 15,
  "current": 8,
  "deficit": 7
}
```

## Stability Notes

- Pessimistic write lock on Wallet row prevents race condition — only one transaction succeeds when two tabs submit simultaneously
- `deductCredit` always rolls back on any error before re-throwing — Wallet balance never corrupts
- `newBalance` returned from BE (not re-fetched) — header updates instantly without extra round-trip
- Low balance toast fires only once per successful deduction (saga fires it, not polled)

## Not Changing

- Individual sub-session start endpoints (`/behavioral/sessions/start`, `/live-coding/sessions`, `/sd-sessions`) — no credit logic added there
- Wallet entity, WalletTransaction entity — no schema change
- Purchase flow (→ story 014), refund flow (→ story 015)

## File Count
Tổng files thay đổi: 10 / 10
