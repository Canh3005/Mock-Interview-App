---
name: auth
description: "Skill for the Auth area of Mock-Interview-App. 12 symbols across 3 files."
---

# Auth

12 symbols | 3 files | Cohesion: 100%

## When to Use

- Working with code in `server/`
- Understanding how createQuestionBankE2eContext, register, login work
- Modifying auth-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `server/src/auth/auth.service.ts` | register, login, generateTokensForOAuthUser, refreshTokens, getIdentityProfileJson (+1) |
| `server/src/auth/auth.controller.ts` | register, login, githubCallback, refresh, setRefreshTokenCookie |
| `server/tests/integration/helpers/question-bank-e2e-app.ts` | createQuestionBankE2eContext |

## Entry Points

Start here when exploring this area:

- **`createQuestionBankE2eContext`** (Function) — `server/tests/integration/helpers/question-bank-e2e-app.ts:22`
- **`register`** (Method) — `server/src/auth/auth.service.ts:29`
- **`login`** (Method) — `server/src/auth/auth.service.ts:52`
- **`generateTokensForOAuthUser`** (Method) — `server/src/auth/auth.service.ts:72`
- **`refreshTokens`** (Method) — `server/src/auth/auth.service.ts:76`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `createQuestionBankE2eContext` | Function | `server/tests/integration/helpers/question-bank-e2e-app.ts` | 22 |
| `register` | Method | `server/src/auth/auth.service.ts` | 29 |
| `login` | Method | `server/src/auth/auth.service.ts` | 52 |
| `generateTokensForOAuthUser` | Method | `server/src/auth/auth.service.ts` | 72 |
| `refreshTokens` | Method | `server/src/auth/auth.service.ts` | 76 |
| `getIdentityProfileJson` | Method | `server/src/auth/auth.service.ts` | 94 |
| `getTokens` | Method | `server/src/auth/auth.service.ts` | 109 |
| `register` | Method | `server/src/auth/auth.controller.ts` | 40 |
| `login` | Method | `server/src/auth/auth.controller.ts` | 53 |
| `githubCallback` | Method | `server/src/auth/auth.controller.ts` | 99 |
| `refresh` | Method | `server/src/auth/auth.controller.ts` | 156 |
| `setRefreshTokenCookie` | Method | `server/src/auth/auth.controller.ts` | 189 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Login → GetIdentityProfileJson` | intra_community | 3 |
| `GenerateTokensForOAuthUser → GetIdentityProfileJson` | intra_community | 3 |
| `RefreshTokens → GetIdentityProfileJson` | intra_community | 3 |

## How to Explore

1. `gitnexus_context({name: "createQuestionBankE2eContext"})` — see callers and callees
2. `gitnexus_query({query: "auth"})` — find related execution flows
3. Read key files listed above for implementation details
