---
name: practice
description: "Skill for the Practice area of Mock-Interview-App. 17 symbols across 4 files."
---

# Practice

17 symbols | 4 files | Cohesion: 100%

## When to Use

- Working with code in `server/`
- Understanding how ProblemBankPage, handleRowClick, getAttemptFeedback work
- Modifying practice-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `server/src/question-bank/services/practice/question-practice-feedback.service.ts` | getAttemptFeedback, retryFeedback, enqueueScoring, markQueueFailed, toFeedbackResponse (+3) |
| `server/src/question-bank/services/practice/question-practice-attempt.service.ts` | submitPracticeAttempt, _probeSnapshot, _toAttemptResponse, _language, _answerInputType (+1) |
| `client/apps/web/src/components/practice/ProblemBankPage.jsx` | ProblemBankPage, handleRowClick |
| `client/apps/web/src/store/slices/practiceDSASlice.js` | startPracticeDSASession |

## Entry Points

Start here when exploring this area:

- **`ProblemBankPage`** (Function) — `client/apps/web/src/components/practice/ProblemBankPage.jsx:22`
- **`handleRowClick`** (Function) — `client/apps/web/src/components/practice/ProblemBankPage.jsx:48`
- **`getAttemptFeedback`** (Method) — `server/src/question-bank/services/practice/question-practice-feedback.service.ts:33`
- **`retryFeedback`** (Method) — `server/src/question-bank/services/practice/question-practice-feedback.service.ts:47`
- **`enqueueScoring`** (Method) — `server/src/question-bank/services/practice/question-practice-feedback.service.ts:74`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `ProblemBankPage` | Function | `client/apps/web/src/components/practice/ProblemBankPage.jsx` | 22 |
| `handleRowClick` | Function | `client/apps/web/src/components/practice/ProblemBankPage.jsx` | 48 |
| `getAttemptFeedback` | Method | `server/src/question-bank/services/practice/question-practice-feedback.service.ts` | 33 |
| `retryFeedback` | Method | `server/src/question-bank/services/practice/question-practice-feedback.service.ts` | 47 |
| `enqueueScoring` | Method | `server/src/question-bank/services/practice/question-practice-feedback.service.ts` | 74 |
| `markQueueFailed` | Method | `server/src/question-bank/services/practice/question-practice-feedback.service.ts` | 95 |
| `toFeedbackResponse` | Method | `server/src/question-bank/services/practice/question-practice-feedback.service.ts` | 106 |
| `_ownedAttempt` | Method | `server/src/question-bank/services/practice/question-practice-feedback.service.ts` | 133 |
| `_processingIsStale` | Method | `server/src/question-bank/services/practice/question-practice-feedback.service.ts` | 148 |
| `_errorMessage` | Method | `server/src/question-bank/services/practice/question-practice-feedback.service.ts` | 154 |
| `submitPracticeAttempt` | Method | `server/src/question-bank/services/practice/question-practice-attempt.service.ts` | 36 |
| `_probeSnapshot` | Method | `server/src/question-bank/services/practice/question-practice-attempt.service.ts` | 111 |
| `_toAttemptResponse` | Method | `server/src/question-bank/services/practice/question-practice-attempt.service.ts` | 145 |
| `_language` | Method | `server/src/question-bank/services/practice/question-practice-attempt.service.ts` | 161 |
| `_answerInputType` | Method | `server/src/question-bank/services/practice/question-practice-attempt.service.ts` | 178 |
| `_cleanText` | Method | `server/src/question-bank/services/practice/question-practice-attempt.service.ts` | 184 |
| `startPracticeDSASession` | Method | `client/apps/web/src/store/slices/practiceDSASlice.js` | 44 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `RetryFeedback → _errorMessage` | intra_community | 3 |
| `RetryFeedback → MarkQueueFailed` | intra_community | 3 |
| `RetryFeedback → _processingIsStale` | intra_community | 3 |
| `ProblemBankPage → StartPracticeDSASession` | intra_community | 3 |
| `GetAttemptFeedback → _processingIsStale` | intra_community | 3 |

## How to Explore

1. `gitnexus_context({name: "ProblemBankPage"})` — see callers and callees
2. `gitnexus_query({query: "practice"})` — find related execution flows
3. Read key files listed above for implementation details
