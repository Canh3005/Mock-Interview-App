# PA Audit - JSON Editor Used as Production Form

Date: 2026-05-09
Status: guide-updated

## Observed Failure

Feature 019 admin curation UI used JSON editors (`ProbeJsonModal`, `InterviewSetJsonModal`) as the primary create/edit workflow for production admin users.

## Impact

Admin/curator would need to understand internal payload shape and manually edit nested JSON to create or update business content. This is not acceptable for production curation workflow.

## Root Cause

The process allowed "admin can create/edit probe" to be interpreted as an implementation detail instead of a production user interaction requirement. BA did not require structured input expectations, HOW did not define UX boundary, Dev convention did not ban JSON editor as primary workflow, and FE review did not classify it as critical.

## Missed Guardrail

- BA lacked production interaction expectation for create/edit flows.
- SA lacked UX boundary distinguishing primary workflow from technical tooling.
- Dev guide allowed raw JSON editor to be treated as a shortcut.
- FE convention/review checklist did not ban JSON/raw payload editor as production create/edit UX.

## Evidence

- `docs/features/019-question-probe-curation-workflow/BA.md`
- `docs/features/019-question-probe-curation-workflow/HOW.md`
- `client/apps/web/src/components/admin/question-bank/ProbeJsonModal.jsx`
- `client/apps/web/src/components/admin/question-bank/InterviewSetJsonModal.jsx`

## Guide Changes

- `docs/agent-guide/ba-guide.md`: added production interaction expectation.
- `docs/agent-guide/sa-guide.md`: added production UX boundary.
- `docs/agent-guide/dev-guide.md`: added production UI rule against JSON/raw payload editor as primary workflow.
- `docs/agent-guide/convention-fe.md`: added Production Forms requirements.
- `docs/agent-guide/review-fe.md`: added critical review check.

## Follow-up

- Feature 019 FE still needs a follow-up Dev task to replace JSON modals with structured forms/wizard.
