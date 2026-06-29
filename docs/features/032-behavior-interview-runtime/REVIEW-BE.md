# F032 — Behavior Interview Runtime: Review pipeline xử lý câu trả lời

## Ghi chú phạm vi

Đây là review kỹ thuật đọc trực tiếp code (không phải output của flow chính thức `review be`, vì không có `BA.md`/`HOW.md`/done report cho bước này — F032 chỉ có `IMPLEMENTATION_PLAN.md` và `WALKTHROUGH.md`). Mục đích: nhận xét nghiêm túc, có lý do cụ thể và option xử lý rõ ràng cho từng phát hiện, để chủ dự án tự quyết định việc nào xử lý trước.

**Đã đọc:**
- `server/src/behavior-session/behavior-session.controller.ts`
- `server/src/behavior-session/behavior-session.service.ts`
- `server/src/behavior-session/behavior-session-flow.service.ts`
- `server/src/behavior-session/policy-engine.service.ts`
- `server/src/behavior-session/probe-renderer.service.ts`
- `server/src/behavior-session/constants/policy-engine.constants.ts`
- `server/src/behavior-session/types/behavior-session.types.ts`
- `server/src/behavioral/entities/behavioral-session.entity.ts`
- `server/src/behavioral/entities/behavioral-stage-log.entity.ts`
- `server/src/question-bank/services/scoring/question-practice-scoring.service.ts`
- `server/src/question-bank/services/scoring/question-practice-scoring-result.service.ts`
- `server/src/question-bank/constants/question-practice-scoring.constants.ts`
- `server/src/ai/groq.service.ts`
- `server/src/jobs/workers/behavior-scoring.worker.ts`

## Tổng quan pipeline hiện tại

```
POST /api/behavior-sessions/:id/answer
  → BehaviorSessionController.submitAnswer
  → BehaviorSessionService.submitAnswer
      1. _loadSession + _loadPlan + _loadProbeMap          (đọc, không lock)
      2. flowService.saveTurn(candidate_answer)             (commit NGAY vào DB)
      3. activeProbe.candidateTurnCount++ / push answer text (chỉ in-memory)
      4. scoringService.scoreForRuntime(...)                 (1-2 lệnh LLM, có thể throw)
      5. policyEngine.decide(...)                            (deterministic, không LLM)
      6. flowService.handleDecision(...)                     (có thể thêm 1 lệnh LLM render)
      7. sessionRepo.save(session)                           (chỉ chạy nếu 4-6 không throw)
      8. stream SSE: turn_start → chunk × N (split theo space) → turn_complete
```

## Mức độ nghiêm trọng

| # | Vấn đề | Mức độ | File chính |
|---|--------|--------|------------|
| 1 | Mất đồng bộ log/session khi scoring lỗi → trùng `globalTurnIndex` | Nghiêm trọng | `behavior-session.service.ts`, `behavior-session-flow.service.ts` |
| 2 | Không lock session khi submit trùng (double-click/retry) | Nghiêm trọng | `behavior-session.service.ts` |
| 3 | Heuristic intent detection chặn LLM một chiều, rủi ro false positive | Cao | `question-practice-scoring.service.ts` |
| 4 | 3 lệnh LLM tuần tự chặn trước khi stream, "streaming" là giả | Trung bình | `question-practice-scoring.service.ts`, `probe-renderer.service.ts`, `groq.service.ts` |
| 5 | `console.log` leftover log thẳng dữ liệu câu trả lời ứng viên | Nhỏ nhưng dễ sửa | `behavior-session.service.ts:255` |
| 6 | Các ghi nhận phụ (xem mục 6) | Thấp | nhiều file |

---

## 1. (Nghiêm trọng) Mất đồng bộ giữa `BehavioralStageLog` và `BehavioralSession` khi scoring lỗi

**Vị trí:** `behavior-session.service.ts:224-300` (submitAnswer), `behavior-session-flow.service.ts:372-411` (saveTurn)

**Lý do:**
`saveTurn` ghi `BehavioralStageLog` ngay lập tức (`await this.logRepo.save(log)`), nhưng các thay đổi cấp session (`session.globalTurnCounter`, `activeProbeSession.candidateAnswerTexts`, `candidateTurnCount`) chỉ tồn tại trong object in-memory cho đến khi `sessionRepo.save(session)` được gọi ở cuối `submitAnswer` (dòng 280) — và lệnh save này **chỉ chạy nếu** `scoreForRuntime` (dòng 248) + policy decision + `handleDecision` đều thành công.

Nếu `scoreForRuntime` throw (Groq API lỗi/timeout, JSON schema validation fail cả 2 lần retry trong `_extractWithRetryRaw`), exception bay lên `try/catch` của `submitAnswer` (dòng 292-296), chỉ emit SSE `error` rồi `res.end()`. **Session không bao giờ được lưu trong nhánh lỗi này.**

**Hậu quả cụ thể:**
- `BehavioralStageLog` của candidate answer đã commit với một `globalTurnIndex` mà `session.globalTurnCounter` (trong DB) không hề biết tới (vì counter tăng chỉ ở object in-memory bị bỏ).
- Lần submit kế tiếp (user nhập lại hoặc FE tự retry) tái sử dụng đúng giá trị counter cũ từ DB → **2 row `BehavioralStageLog` có thể trùng `globalTurnIndex`**.
- `behavioral-stage-log.entity.ts:81-82` — cột `globalTurnIndex` **không có unique constraint** nào để chặn việc này → sai lệch âm thầm, không fail loudly.
- `getSession` (dòng 325-338) sort theo `globalTurnIndex ASC` → turn order/transcript có thể hiển thị sai cho FE.
- Câu trả lời của lần submit lỗi bị rơi mất khỏi `activeProbe.candidateAnswerTexts` → ngữ cảnh scoring cumulative cho probe đó thiếu một đoạn, ảnh hưởng chất lượng đánh giá Stage 5 synthesis sau này.

**Option A — Transaction toàn phần:**
Bọc toàn bộ phase mutate (saveTurn candidate_answer → scoring → decision → saveTurn turn tiếp theo → save session) trong 1 DB transaction (`dataSource.transaction`), rollback hết nếu throw ở bất kỳ đâu. Coi như answer "chưa từng được nộp" nếu fail, FE có thể retry an toàn với cùng nội dung.
*Trade-off:* phải đổi repo injection sang transactional `EntityManager` xuyên suốt `BehaviorSessionService` → `BehaviorSessionFlowService` → các nơi gọi `logRepo`/`sessionRepo`. Refactor không nhỏ, nhưng đúng nhất về consistency.

**Option B — Save session sớm hơn:**
Lưu session ngay sau khi tăng counter/push answer text (trước khi gọi LLM scoring ở bước 4), rồi lưu lại session lần 2 sau policy decision (bước 7 hiện tại vẫn giữ).
*Trade-off:* đơn giản hơn A, không cần transaction. Nhưng nếu fail giữa save lần 1 và lần 2, session bị treo ở state `EVALUATING_TURN`/`DECIDING_NEXT_ACTION` — cần thêm logic ở `_assertActiveProbe` hoặc một guard riêng để cho phép resume/re-submit từ state này, nếu không candidate sẽ bị "kẹt" không submit tiếp được.

**Option C — Lưới an toàn DB-level:**
Thêm unique constraint `(behavioralSessionId, globalTurnIndex)` trên `behavioral_stage_logs`. Không tự sửa được lỗi logic nhưng biến lỗi âm thầm thành lỗi rõ ràng (DB constraint violation) ngay khi nó xảy ra.
*Trade-off:* nên dùng kết hợp với A hoặc B, không thay thế — vì bản thân nó chỉ phát hiện, không ngăn mất dữ liệu candidate.

---

## 2. (Nghiêm trọng) Không có lock nào khi submit trùng lặp (double-click / network retry)

**Vị trí:** `behavior-session.service.ts:436-452` (`_loadSession` chỉ `findOne`, không `FOR UPDATE`, không version column)

**Lý do:**
Một lần xử lý `submitAnswer` có thể kéo dài vài giây vì tối đa 3 lệnh LLM tuần tự (xem mục 4) — đủ lâu để double-submit thực tế xảy ra (user bấm 2 lần, hoặc FE tự động retry khi tưởng request bị timeout). Hai request song song cho cùng `sessionId`:
- Cả hai đều load session và pass `_assertActiveProbe` (status vẫn `'active'` lúc đọc, vì check-then-act không có lock).
- Cả hai tự mutate object `session` riêng của mình trong process (Node, nên không share memory, nhưng đều xuất phát từ cùng dữ liệu DB ban đầu).
- Cả hai gọi `sessionRepo.save(session)` — request lưu sau "thắng", đè toàn bộ thay đổi của request lưu trước (kể cả `activeProbeSession`, `stageProgress`, `interviewState`).
- Log (`BehavioralStageLog`) của request thua vẫn nằm trong DB vì nó được ghi ngay (không phụ thuộc ai thắng/thua) → cùng pattern lệch dữ liệu như mục 1, nhưng nguyên nhân là race condition chứ không phải lỗi LLM.

**Option A — Optimistic locking:**
Thêm `@VersionColumn()` vào `BehavioralSession`. TypeORM tự throw `OptimisticLockVersionMismatchError` khi save nếu version đã đổi giữa lúc load và lúc save → catch, trả HTTP 409 cho client.
*Trade-off:* cần FE xử lý 409 gracefully (báo "đang xử lý câu trả lời trước, vui lòng đợi" hoặc tự retry).

**Option B — Pessimistic lock:**
`sessionRepo.findOne({ where, lock: { mode: 'pessimistic_write' } })` trong 1 transaction — request thứ 2 bị **block chờ** thay vì đọc stale rồi ghi đè.
*Trade-off:* an toàn hơn A nhưng giữ row lock + DB connection suốt thời gian gọi LLM (vài giây) → cần transaction timeout hợp lý, và rủi ro tốn connection pool nếu nhiều user double-submit cùng lúc.

**Option C — Idempotency/state-guard rẻ:**
Chặn ngay từ đầu `submitAnswer` nếu `session.interviewState` đang ở `EVALUATING_TURN` hoặc `DECIDING_NEXT_ACTION` (tức đang có 1 request khác xử lý) → trả lỗi 409 ngay, không cần lock DB.
*Trade-off:* rẻ và dễ làm nhất, nhưng vẫn có khe hở nhỏ (race giữa lúc check state và lúc state thực sự được persist) nếu không kết hợp transaction/lock — phù hợp làm lớp chặn nhanh, không phải giải pháp triệt để một mình.

---

## 3. (Cao) Heuristic "dont_know"/"clarification_request" chặn LLM một chiều — rủi ro false positive cắt oan câu trả lời hợp lệ

**Vị trí:** `_detectIntent` tại `question-practice-scoring.service.ts:572-644`, short-circuit tại `question-practice-scoring.service.ts:81-89`; policy phản ứng tại `policy-engine.service.ts:53-71`

**Lý do:**
`_detectIntent` match bằng substring, không có ranh giới ngữ cảnh phủ định/nhượng bộ. Ví dụ câu trả lời tiếng Việt (giả định < 200 ký tự):

> "Trước đây em chưa từng làm dự án lớn thế này, nhưng lần đó em vẫn chủ động đề xuất giải pháp X và đạt kết quả Y."

Câu này chứa substring "chưa từng" → bị gán cứng `candidateIntent = 'dont_know'` và **return ngay tại `scoreForRuntime`, dòng 81-89, trước khi gọi LLM** — không có cơ chế nào để LLM (vốn có ngữ cảnh đầy đủ hơn, và đã được dạy phân loại `candidateIntent` trong chính prompt extraction) phản biện lại nhận định này.

`PolicyEngineService.decide` (dòng 53-59) phản ứng với `candidateIntent === 'dont_know'` bằng `USE_FALLBACK`/`CLOSE_PROBE` ngay lập tức, bỏ qua toàn bộ phần nội dung thực chất phía sau câu rào trước. Đây là vấn đề **fairness** đối với ứng viên, không chỉ là vấn đề kỹ thuật: ứng viên trả lời tốt nhưng có thói quen rào trước câu nói bị tính như "không biết" — tốn 1 fallback probe hoặc đóng probe sai, ảnh hưởng trực tiếp đến điểm số/đánh giá cuối.

Mức độ nghiêm trọng bị khuếch đại bởi `MAX_REDIRECTS_PER_PROBE = 1` (`policy-engine.constants.ts:3`) — biên độ sai sót gần như không có cơ hội tự sửa trong cùng probe.

**Option A — Bỏ short-circuit, luôn gọi LLM:**
Heuristic chỉ giữ lại làm fast-path cho case cực ngắn và rõ ràng (vd < 30 ký tự, đứng độc lập, không có câu sau). Mọi câu có khả năng chứa nội dung thực chất đều đi qua LLM, vốn đã có field `candidateIntent` tự phân loại theo ngữ cảnh đầy đủ trong response schema.
*Trade-off:* tăng 1 lượt gọi LLM cho một số câu trả lời ngắn rõ ràng là "không biết" — đổi lại giảm rủi ro false positive đáng kể.

**Option B — Heuristic có điều kiện loại trừ:**
Giữ heuristic nhưng bỏ qua match nếu phát hiện liên từ nhượng bộ ("nhưng", "tuy nhiên", "but", "however", "でも", "しかし"...) xuất hiện ngay sau cụm match trong cùng câu — để LLM quyết định case đó thay vì auto-close.
*Trade-off:* vẫn rẻ (không gọi thêm LLM cho case rõ ràng), giảm false-positive rõ rệt, nhưng thêm rule phải maintain riêng theo từng ngôn ngữ (vi/en/ja) → tăng độ phức tạp có kiểm soát.

**Option C — Verify mode nhẹ:**
Khi heuristic match, vẫn gọi LLM ở "verify mode" rẻ (model nhỏ, prompt ngắn, 1 câu hỏi yes/no) để confirm trước khi return sớm.
*Trade-off:* cân bằng giữa A và B, nhưng vẫn tốn thêm 1 network round-trip mỗi lần heuristic match.

---

## 4. (Trung bình) 3 lệnh LLM tuần tự chặn trước khi có byte đầu tiên; "streaming" thực chất là giả

**Vị trí:** `question-practice-scoring.service.ts:104-122` (`scoreForRuntime`: extraction → `_withNarrativeRaw`, 2 lệnh tuần tự); `probe-renderer.service.ts` (mỗi `follow_up`/`challenge`/`redirect`/`rephrase` gọi thêm `generateContent`, ví dụ dòng 219-260); `behavior-session.service.ts:648-664` (`_streamTurn`: `turn.content.split(' ')` rồi emit từng "chunk"); `groq.service.ts:99-129` (`generateContentStream` tồn tại nhưng không dùng ở pipeline này).

**Lý do:**
Một lần `submitAnswer` (khi cần follow-up/challenge/redirect, tức phần lớn các lượt) tốn:
1. LLM extraction (`_extractWithRetryRaw`) — bắt buộc.
2. LLM narrative (`_withNarrativeRaw`) — tạo `summary`/`improvementSuggestions`.
3. LLM render text turn kế tiếp (`probe-renderer.service.ts`) — bắt buộc nếu action là FOLLOW_UP/CHALLENGE/REDIRECT/REPHRASE.

Cả 3 lệnh đều chạy **tuần tự, đồng bộ, chặn hoàn toàn** trước khi `_streamTurn` được gọi. Sau đó BE "giả vờ" streaming bằng cách chia chuỗi đã render xong theo khoảng trắng và emit từng từ qua SSE — không giảm latency cảm nhận thật vì phần nặng nhất (LLM) đã chạy xong từ trước; chỉ tạo hiệu ứng UI "đang gõ".

Đáng chú ý: `narrative` (`summary`/`improvementSuggestions`) **không hiển thị cho candidate trong lúc phỏng vấn** (dùng cho mục đích lưu feedback/Stage 5) — nghĩa là lệnh LLM #2 đang chặn turn tiếp theo dù kết quả của nó không cần ngay lúc đó.

**Option A — Tách narrative ra khỏi critical path:**
Chạy `_withNarrativeRaw` bất đồng bộ (sau khi đã trả `baseResult` cho `PolicyEngineService.decide` — vốn chỉ cần `overallBand`/`signals`/`redFlags`, không cần `summary`/`improvementSuggestions`).
*Trade-off:* giảm 1/3 số lệnh LLM chặn trên critical path → giảm latency thật; cần đảm bảo narrative vẫn được ghi lại (update `probeScoringResult` trên log) sau khi xong, cho Stage 5 synthesis dùng.

**Option B — Stream thật cho phần render turn tiếp theo:**
Dùng `generateContentStream` (đã có sẵn trong `GroqService`) cho bước render follow-up/challenge/redirect — đây là phần **duy nhất** candidate thực sự đang chờ để đọc.
*Trade-off:* cần đổi SSE writer để forward token thật từ Groq stream thay vì chia string theo space; tăng độ phức tạp code nhưng giảm time-to-first-token đáng kể.

**Option C — Giữ kiến trúc, bỏ phần giả:**
Nếu latency hiện tại được xác nhận chấp nhận được với UX, chỉ bỏ fake-chunk-by-space, gửi nguyên cục text trong 1 SSE event để không đánh lừa người dùng rằng hệ thống "đang suy nghĩ" real-time.
*Trade-off:* không cải thiện latency thật, nhưng minh bạch hơn về UX và bớt code phức tạp không mang giá trị thật.

---

## 5. (Nhỏ, nên sửa ngay) `console.log` leftover log thẳng dữ liệu câu trả lời ứng viên

**Vị trí:** `behavior-session.service.ts:255` — `console.log('Scoring result:', scoringResult)`

**Lý do:**
Chạy ở MỌI lần submit answer, log full `ProbeScoringResult` — bao gồm `evidenceQuotes` (trích nguyên văn câu trả lời ứng viên, có thể chứa thông tin cá nhân/nhạy cảm) — ra stdout thô. Không qua `Logger` của Nest nên không kiểm soát được bằng log level config, dễ bị log aggregator (nếu có) thu thập plaintext PII của ứng viên. Đây là dấu hiệu rõ của debug code chưa dọn trước khi vào nhánh chính.

**Option A (đề xuất):** Xóa hẳn dòng này — không phục vụ mục đích gì ở production.
**Option B:** Nếu cần giữ insight cho quan sát/observability, đổi thành `this.logger.debug(...)`, chỉ log `overallBand`/`confidence`, không log full `evidenceQuotes`.

---

## 6. Ghi nhận thêm (mức độ thấp, chưa phải vấn đề cấp bách)

- **Coupling ngầm giữa `selectedProbes` và `fallbackProbes` theo index** (`behavior-session.service.ts:541-550`, `_hasFallbackProbe`/`_handleFallback` dùng `session.currentProbeIndex` để index trực tiếp vào `fallbackProbes`). Giả định 1:1 index giữa 2 mảng — nếu `SessionPlan` (F030) tạo `fallbackProbes` không cùng độ dài/thứ tự với `selectedProbes`, fallback sẽ trỏ sai probe. Không phải bug runtime hiện tại (vì F030 chắc đang tạo đúng theo giả định này) nhưng là một ràng buộc ngầm không được enforce ở type hay validation nào — nên kiểm tra lại logic sinh `fallbackProbes` ở session-planning hoặc thêm comment/invariant rõ ràng.
- **Retry trong `_extractWithRetryRaw`/`_extractWithRetry` không có backoff và retry mù** (`question-practice-scoring.service.ts:187-230`, `316-395`): retry 2 lần liên tiếp ngay lập tức, không phân biệt lỗi network (đáng để retry) với lỗi JSON schema validation do chính câu trả lời/probe khiến model luôn trả cùng format sai (retry không đổi gì ngoài thêm `retryNote` vào prompt) — có thể cải thiện bằng cách tăng `temperature` nhẹ ở lần retry thứ 2 để tăng khả năng model đổi output.
- **Không có timeout riêng cho Groq call** (`groq.service.ts:40-97`): dựa hoàn toàn vào timeout mặc định của `groq-sdk`. Nếu Groq API treo lâu, cả request `submitAnswer` (đang giữ HTTP connection SSE mở) sẽ treo theo, không có giới hạn rõ ràng để fail fast và trả lỗi cho FE.
- **Chunk selection cho câu trả lời dài** (`_contextForExtraction`, `question-practice-scoring.service.ts:447-471`): heuristic chọn chunk dựa trên overlap từ khóa thô (lowercase, bỏ ký tự đặc biệt) — có thể bỏ sót đoạn liên quan nếu câu trả lời dùng từ đồng nghĩa/diễn đạt khác với label signal. Ảnh hưởng chất lượng scoring cho câu trả lời rất dài (> 8000 ký tự), không phổ biến nhưng đáng lưu ý nếu mở rộng `MaxLength` ở `SubmitAnswerDto` (hiện đang là 4000, nhỏ hơn `LONG_ANSWER_CHARS = 8000` nên trong thực tế nhánh chunking gần như không được kích hoạt qua API hiện tại — chỉ là rủi ro tiềm ẩn nếu giới hạn DTO tăng lên).

---

## Tóm tắt ưu tiên đề xuất

1. Mục 5 (xóa `console.log`) — sửa ngay, không tốn công, không rủi ro.
2. Mục 1 và 2 — nên xử lý cùng nhau vì cả hai đều xoay quanh việc thiếu transaction/lock trong `submitAnswer`; chọn Option A (transaction) cho cả 2 sẽ giải quyết đồng thời nếu chấp nhận chi phí refactor.
3. Mục 3 — ảnh hưởng trực tiếp đến độ công bằng của bài đánh giá ứng viên, nên ưu tiên trước mục 4.
4. Mục 4 — cải thiện UX/latency, không phải lỗi đúng/sai, có thể làm sau.
5. Mục 6 — theo dõi, xử lý khi có thời gian hoặc khi mở rộng `MaxLength`/session-planning liên quan.
