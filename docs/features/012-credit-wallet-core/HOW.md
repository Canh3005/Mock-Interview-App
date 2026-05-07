## Overview

Tạo `WalletModule` mới (entity + service + controller). `AuthService.register()` gọi `WalletService.createWalletWithBonus()` ngay sau khi tạo user. Race condition chặn bằng DB unique constraint trên `wallet_bonus_claim.email`.

## Architectural Decisions

### Decision: Idempotency khi tặng signup bonus

**Option A — Application-level check (SELECT trước rồi INSERT):**
- Pro: đơn giản
- Con: TOCTOU race condition — 2 request song song đều SELECT thấy "chưa có" → double bonus

**Option B — DB unique constraint + catch:**
- Pro: atomic ở mức DB, không có race condition dù 2 request đồng thời
- Con: cần catch `QueryFailedError` để phân biệt lỗi constraint với lỗi thật

**Chọn: Option B** — vì BA đã flag Risk HIGH cho race condition, unique constraint là cách duy nhất đảm bảo "exactly once" tuyệt đối.

### Decision: Transaction scope

Wallet được tạo trước (committed ngay), sau đó mới claim bonus trong một transaction riêng. Nếu bonus claim fail (unique constraint), wallet vẫn tồn tại với balance = 0 — không rollback toàn bộ đăng ký.

## Backend Changes (server/)

1. `src/wallet/entities/wallet.entity.ts` — Entity mới: id, userId (unique), balance (int default 0)
2. `src/wallet/entities/wallet-transaction.entity.ts` — Entity mới: id, walletId (FK), type (enum BONUS/DEBIT/REFUND), amount (int), description, createdAt
3. `src/wallet/entities/wallet-bonus-claim.entity.ts` — Entity mới: id, email (unique), claimedAt
4. `src/wallet/dto/wallet-response.dto.ts` — `{ balance: number }`
5. `src/wallet/wallet.service.ts` — 2 public methods:
   - `createWalletWithBonus(userId, email)`: tạo wallet → claim bonus (TX) → credit nếu claim success
   - `getBalance(userId)`: trả về balance hiện tại
6. `src/wallet/wallet.controller.ts` — `GET /wallet/me` (JwtAuthGuard)
7. `src/wallet/wallet.module.ts` — forFeature 3 entities, exports WalletService
8. `src/auth/auth.service.ts` — inject WalletService, gọi `createWalletWithBonus` sau `usersService.create()`
9. `src/auth/auth.module.ts` — import WalletModule
10. `src/app.module.ts` — import WalletModule (để register WalletController)

## Frontend Changes (client/apps/web/)

1. `src/api/wallet.api.js` — `walletApi.getBalance()`
2. `src/store/slices/walletSlice.js` — state: `{ balance, loading, error }`, actions: fetchBalanceRequest/Success/Failure + reset
3. `src/store/sagas/walletSaga.js` — watch loginSuccess/registerSuccess/refreshSuccess → fetch balance; watch logoutSuccess → reset
4. `src/store/sagas/rootSaga.js` — thêm `fork(watchWalletSaga)`
5. `src/components/shared/SharedNavbar.jsx` — thêm `CreditBadge` component hiển thị trong DashboardBar và InterviewBar
6. `src/i18n/locales/en.json` — thêm `wallet.credits`
7. `src/i18n/locales/vi.json` — thêm `wallet.credits`
8. `src/i18n/locales/ja.json` — thêm `wallet.credits`

## API Contract

```
GET /wallet/me
Authorization: Bearer <token>
Response 200: { "balance": 5 }
Response 401: Unauthorized
```

## Stability Notes

- Không có external call → không cần timeout
- Bonus claim transaction: `QueryRunner` với rollback nếu fail; wallet vẫn committed trước đó
- `QueryFailedError` với code `23505` (PostgreSQL unique violation) = expected → bỏ qua, không log error
- Wallet `userId` có unique constraint — nếu `createWalletWithBonus` gọi 2 lần cho cùng userId, lần 2 ném `ConflictException` (không xảy ra trong flow bình thường vì auth.service kiểm tra email trước)

## Not Changing

- Auth flow (register/login/refresh tokens) — chỉ thêm side effect sau khi user được tạo
- User entity — không thêm field
- BullMQ / Redis — không dùng cho feature này (sync là đủ, bonus tặng ngay)

## File Count

Story 1 (BE): 10 / 10
Story 2 (FE): 8 / 10
