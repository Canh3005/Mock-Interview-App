---
name: users
description: "Skill for the Users area of Mock-Interview-App. 8 symbols across 1 files."
---

# Users

8 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `server/`
- Understanding how create, findByEmail, findById work
- Modifying users-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `server/src/users/users.service.ts` | create, findByEmail, findById, getProfile, updateProfile (+3) |

## Entry Points

Start here when exploring this area:

- **`create`** (Method) — `server/src/users/users.service.ts:19`
- **`findByEmail`** (Method) — `server/src/users/users.service.ts:27`
- **`findById`** (Method) — `server/src/users/users.service.ts:31`
- **`getProfile`** (Method) — `server/src/users/users.service.ts:35`
- **`updateProfile`** (Method) — `server/src/users/users.service.ts:50`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `create` | Method | `server/src/users/users.service.ts` | 19 |
| `findByEmail` | Method | `server/src/users/users.service.ts` | 27 |
| `findById` | Method | `server/src/users/users.service.ts` | 31 |
| `getProfile` | Method | `server/src/users/users.service.ts` | 35 |
| `updateProfile` | Method | `server/src/users/users.service.ts` | 50 |
| `findIdentity` | Method | `server/src/users/users.service.ts` | 62 |
| `linkIdentity` | Method | `server/src/users/users.service.ts` | 83 |
| `handleOAuthUser` | Method | `server/src/users/users.service.ts` | 112 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleOAuthUser → Create` | intra_community | 3 |
| `UpdateProfile → FindById` | intra_community | 3 |
| `UpdateProfile → Create` | intra_community | 3 |

## How to Explore

1. `gitnexus_context({name: "create"})` — see callers and callees
2. `gitnexus_query({query: "users"})` — find related execution flows
3. Read key files listed above for implementation details
