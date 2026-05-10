# PA Audit - Vietnamese Locale Without Diacritics

Date: 2026-05-09
Status: guide-updated

## Observed Failure

New `vi.json` keys for the admin question bank UI were written as ASCII fallback text such as `Dang xuat`, `Quan ly Bai tap`, `Tim kiem`, and mixed English/Vietnamese copy.

## Impact

Vietnamese users see unprofessional and inconsistent localization. The issue is especially visible in production admin UI labels and actions.

## Root Cause

The FE i18n convention required updating all three locale files, but did not explicitly require proper Vietnamese with diacritics. Dev used ASCII fallback to avoid encoding risk.

## Missed Guardrail

- FE convention did not ban Vietnamese without diacritics in `vi.json`.
- FE review checklist did not explicitly check locale quality beyond key presence.

## Evidence

- `client/apps/web/src/i18n/locales/vi.json`
- `docs/agent-guide/convention-fe.md`

## Guide Changes

- `docs/agent-guide/convention-fe.md`: added rule that `vi.json` must use Vietnamese with diacritics; use `[TODO: translate]` if translation is unknown.

## Follow-up

- Existing new admin question bank keys were fixed. Older mojibake in legacy locale content may need a separate cleanup if it affects current UX.
