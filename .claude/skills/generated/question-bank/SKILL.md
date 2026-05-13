---
name: question-bank
description: "Skill for the Question-bank area of Mock-Interview-App. 67 symbols across 11 files."
---

# Question-bank

67 symbols | 11 files | Cohesion: 98%

## When to Use

- Working with code in `client/`
- Understanding how compactTextList, compactLocalizedContent, compactObjectList work
- Modifying question-bank-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `client/apps/web/src/components/admin/question-bank/ProbeFormModal.jsx` | _validateProbe, _payload, _submit, _set, _options (+9) |
| `client/apps/web/src/components/admin/question-bank/InterviewSetFormModal.jsx` | _validSlotRules, _validateSet, _payload, _submit, _options (+9) |
| `client/apps/web/src/components/admin/question-bank/questionBankFormData.js` | compactTextList, compactLocalizedContent, compactObjectList, compactCompleteObjects, updateItem (+4) |
| `client/apps/web/src/components/question-bank/QuestionProbeDetailPage.jsx` | _appLocale, _submissionId, _appendVoiceTranscript, useDarkMode, QuestionProbeDetailPage (+3) |
| `client/apps/web/src/components/question-bank/PublicQuestionBankPage.jsx` | _appLocale, useDarkMode, useQuestionBankLocale, useQuestionBankFetch, useQuestionBankActions (+1) |
| `client/apps/web/src/components/question-bank/QuestionBankFilters.jsx` | _label, _options, FilterSelects, _techTagOptions, QuestionBankFilters |
| `client/apps/web/src/components/question-bank/QuestionProbeCard.jsx` | _taxonomyLabel, CardMetadata, _difficultyLabel, CardHeader |
| `client/apps/web/src/hooks/useVoiceInput.js` | useVoiceInput, clearSilenceTimer |
| `client/apps/web/src/components/admin/question-bank/QuestionBankFormFields.jsx` | SelectField, _select |
| `client/apps/web/src/components/admin/question-bank/ProbeFilterBar.jsx` | ProbeFilterBar, _filterOptions |

## Entry Points

Start here when exploring this area:

- **`compactTextList`** (Function) — `client/apps/web/src/components/admin/question-bank/questionBankFormData.js:130`
- **`compactLocalizedContent`** (Function) — `client/apps/web/src/components/admin/question-bank/questionBankFormData.js:134`
- **`compactObjectList`** (Function) — `client/apps/web/src/components/admin/question-bank/questionBankFormData.js:147`
- **`compactCompleteObjects`** (Function) — `client/apps/web/src/components/admin/question-bank/questionBankFormData.js:153`
- **`_submit`** (Function) — `client/apps/web/src/components/admin/question-bank/ProbeFormModal.jsx:189`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `compactTextList` | Function | `client/apps/web/src/components/admin/question-bank/questionBankFormData.js` | 130 |
| `compactLocalizedContent` | Function | `client/apps/web/src/components/admin/question-bank/questionBankFormData.js` | 134 |
| `compactObjectList` | Function | `client/apps/web/src/components/admin/question-bank/questionBankFormData.js` | 147 |
| `compactCompleteObjects` | Function | `client/apps/web/src/components/admin/question-bank/questionBankFormData.js` | 153 |
| `_submit` | Function | `client/apps/web/src/components/admin/question-bank/ProbeFormModal.jsx` | 189 |
| `_submit` | Function | `client/apps/web/src/components/admin/question-bank/InterviewSetFormModal.jsx` | 160 |
| `updateItem` | Function | `client/apps/web/src/components/admin/question-bank/questionBankFormData.js` | 159 |
| `setField` | Function | `client/apps/web/src/components/admin/question-bank/InterviewSetFormModal.jsx` | 152 |
| `useVoiceInput` | Function | `client/apps/web/src/hooks/useVoiceInput.js` | 6 |
| `clearSilenceTimer` | Function | `client/apps/web/src/hooks/useVoiceInput.js` | 24 |
| `QuestionProbeDetailPage` | Function | `client/apps/web/src/components/question-bank/QuestionProbeDetailPage.jsx` | 421 |
| `ChatInterface` | Function | `client/apps/web/src/components/behavioral-room/ChatInterface.jsx` | 56 |
| `removeItem` | Function | `client/apps/web/src/components/admin/question-bank/questionBankFormData.js` | 163 |
| `setField` | Function | `client/apps/web/src/components/admin/question-bank/ProbeFormModal.jsx` | 181 |
| `PublicQuestionBankPage` | Function | `client/apps/web/src/components/question-bank/PublicQuestionBankPage.jsx` | 148 |
| `_localizedContent` | Function | `client/apps/web/src/components/admin/question-bank/questionBankFormData.js` | 45 |
| `editableProbe` | Function | `client/apps/web/src/components/admin/question-bank/questionBankFormData.js` | 55 |
| `editableInterviewSet` | Function | `client/apps/web/src/components/admin/question-bank/questionBankFormData.js` | 93 |
| `ProbeFormModal` | Function | `client/apps/web/src/components/admin/question-bank/ProbeFormModal.jsx` | 176 |
| `InterviewSetFormModal` | Function | `client/apps/web/src/components/admin/question-bank/InterviewSetFormModal.jsx` | 147 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `_submit → CompactTextList` | intra_community | 4 |
| `_submit → CompactObjectList` | intra_community | 4 |
| `_submit → CompactTextList` | intra_community | 4 |
| `QuestionProbeDetailPage → ClearSilenceTimer` | intra_community | 3 |
| `PublicQuestionBankPage → _appLocale` | intra_community | 3 |
| `SlotRulesSection → SetField` | intra_community | 3 |
| `SlotRulesSection → UpdateItem` | intra_community | 3 |
| `SlotRulesSection → _options` | intra_community | 3 |
| `ChatInterface → ClearSilenceTimer` | intra_community | 3 |
| `ProbeFormModal → _localizedContent` | intra_community | 3 |

## How to Explore

1. `gitnexus_context({name: "compactTextList"})` — see callers and callees
2. `gitnexus_query({query: "question-bank"})` — find related execution flows
3. Read key files listed above for implementation details
