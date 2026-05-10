# Agent Audit Records

Folder này lưu các case trace của PA (Process Auditor).

Mục đích:

- Giữ `docs/agent-guide/` gọn, chỉ chứa rule/checklist đang có hiệu lực.
- Lưu lại bối cảnh lỗi, root cause, missed guardrail và quyết định sửa guide.
- Giúp PA lần sau phát hiện lỗi lặp lại hoặc pattern tương tự.
- Cho các luồng BA/SA/Dev/Review đọc `INDEX.md` trước, rồi chỉ mở record liên quan.

## Index

`INDEX.md` là file bắt buộc để tránh mọi agent phải đọc toàn bộ audit records.

Mỗi dòng trong index phải có:

- `date`
- `title`
- `applies_to`
- `symptom`
- `guardrail`
- `record`

Agent khác chỉ mở `record` khi `applies_to`, domain hoặc symptom khớp task hiện tại.

Quy ước file:

`YYYY-MM-DD-short-slug.md`

Ví dụ:

- `2026-05-09-json-editor-production-form.md`
- `2026-05-09-vi-locale-without-diacritics.md`

Mỗi audit record nên dùng format:

```md
# PA Audit - [Short Title]

Date: YYYY-MM-DD
Status: guide-updated | guide-already-covered | needs-follow-up

## Observed Failure

## Impact

## Root Cause

## Missed Guardrail

## Evidence

## Guide Changes

## Follow-up
```

Không lưu implementation plan dài ở đây. Nếu cần sửa code feature hiện tại, tạo follow-up dev/review riêng.
