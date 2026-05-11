# PA Audit - Probe Scoring Recommended Option Drift

Date: 2026-05-11
Status: guide-updated

## Observed Failure

Luồng `processAttempt` của probe-aware scoring sau khi implement chỉ là bản MVP của Option 3: có queue, pre-check quá ngắn, LLM JSON extraction, Zod validation, quote validation, deterministic aggregation và narrative fallback. Tuy nhiên HOW/technical option khuyến nghị yêu cầu pipeline đầy đủ hơn: `tool_use` schema enforcement, embedding pre-selection thật cho answer dài, confidence-based verifier, model tier routing và xử lý CV deep-dive high-risk.

Mismatch không được ghi rõ là scope giảm, deferred item, hoặc risk còn lại trong `WALKTHROUGH.md`.

## Impact

Reviewer hoặc agent sau có thể tưởng feature đã đáp ứng đầy đủ architecture khuyến nghị, trong khi production behavior còn thiếu các lớp giảm hallucination/latency/risk cho transcript dài và CV deep-dive. Điều này làm tăng nguy cơ feedback quá tự tin, retrieval kém cho answer dài, và khó truy vết vì artifact implementation không nêu phần nào chưa đạt HOW.

## Root Cause

Quy trình hiện tại có ba lỗ hổng:

1. HOW có nhiều lớp kỹ thuật bổ sung nhưng chưa ép SA tách rõ lớp nào là `must-have trong slice hiện tại`, lớp nào là `deferred/hardening`.
2. Dev guide chưa bắt Dev lập conformance mapping với từng bước pipeline/quality guardrail trong HOW khi implement AI/background workflow phức tạp. Dev có thể làm bản rút gọn mà không dừng hỏi hoặc ghi rõ deviation.
3. BE review checklist chỉ nói chung “tuân thủ HOW” nhưng chưa có checklist buộc reviewer đối chiếu từng bước pipeline AI với code và `WALKTHROUGH.md`.

## Missed Guardrail

- SA: thiếu rule buộc phân loại mandatory/deferred khi HOW tham chiếu option khuyến nghị hoặc pipeline nhiều lớp.
- Dev: thiếu rule “không được silently downgrade architecture”; nếu không implement đủ HOW thì phải dừng hỏi/split scope hoặc ghi rõ deferred item được user approve.
- Review BE: thiếu matrix bắt từng step trong HOW scoring pipeline phải có code, test/verification, hoặc explicit approved deferral.

## Evidence

- `docs/features/024-probe-aware-scoring-feedback/HOW.md` yêu cầu “Dev phải implement core scoring theo Option 3 đã khuyến nghị” và liệt kê embedding pre-selection, `tool_use`, verifier, model tier/narrative/save flow.
- `docs/probe-aware-scoring-technical-options.md` kết luận Option 3 với 4 lớp bổ sung là hướng hiệu quả nhất.
- `server/src/question-bank/services/scoring/question-practice-scoring.service.ts` dùng `generateJsonContent` + `JSON.parse` + Zod retry, chưa có `tool_use`.
- `_contextForExtraction()` dùng chunk + keyword overlap, chưa có embedding/cosine similarity/cache.
- Không thấy verifier pass theo `confidence = low`, conflict hoặc `cv_deep_dive`.
- `WALKTHROUGH.md` mô tả flow thật nhưng không ghi phần nào lệch/deferred so với HOW.

## Guide Changes

- `docs/agent-guide/sa-guide.md`: thêm rule cho AI/complex pipeline phải phân loại mandatory/deferred và split hardening layer nếu cần.
- `docs/agent-guide/dev-guide.md`: thêm readiness/done rule bắt Dev mapping HOW guardrails; không được silently ship bản rút gọn.
- `docs/agent-guide/review-be.md`: thêm checklist riêng cho AI/background pipeline, yêu cầu đối chiếu từng step HOW với diff/WALKTHROUGH.
- `docs/agent-audits/INDEX.md`: thêm record này để các flow sau đọc chọn lọc.

## Follow-up

Cần chạy `be` hoặc `fix` riêng nếu muốn production scoring khớp đầy đủ HOW: bổ sung `tool_use`/structured output adapter, embedding pre-selection thật, confidence-based verifier, model tier routing và cập nhật `WALKTHROUGH.md`/test tương ứng. PA không sửa feature code trong lượt này.
