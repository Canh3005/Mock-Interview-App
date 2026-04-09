# Combat Proctoring Event Reference

Tài liệu này mô tả đúng theo **state hiện tại của code** trong FE/BE cho proctoring events ở Combat Mode. Mục tiêu là để review nhanh: event nào đang có, FE phát hiện ra sao, BE nhận và xử lý thế nào, và từng event ảnh hưởng đến integrity score như thế nào.

## 1) Danh sách event type hiện tại

Các event type thực sự đang được FE emit trong `client/apps/web/src/services/proctoring/combatProctoring.js`:

| Event type | Có trong code hiện tại | Ghi chú |
|---|---:|---|
| `NO_FACE` | Có | Phát hiện không có face trong webcam đủ lâu |
| `MULTIPLE_FACES` | Có | Phát hiện có từ 2 face trở lên đủ lâu |
| `SECOND_VOICE` | Có | Phát hiện tiếng nói thứ 2 / nghi ngờ người khác hỗ trợ |
| `TAB_HIDDEN` | Có | Phát hiện user chuyển tab hoặc ẩn tab |
| `TAB_VISIBLE` | Có | Event được gửi khi tab quay lại visible |
| `WINDOW_BLUR` | Có | Phát hiện window mất focus |
| `WINDOW_FOCUS` | Có | Event được gửi khi window quay lại focus |
| `DEVTOOLS_OPEN` | Có | Heuristic phát hiện DevTools mở qua resize pattern |
| `FOCUS_LOST` | Không | Có xuất hiện trong tài liệu cũ, nhưng không thấy emit trong code FE hiện tại |

## 2) FE phát hiện từng event như thế nào

### `TAB_HIDDEN`

FE lắng nghe `visibilitychange`.

- Khi `document.hidden === true`:
  - set `hiddenSince = now`
  - nếu đang trong grace period thì bỏ qua flag
  - nếu qua grace period thì emit ngay một `TAB_HIDDEN` với severity:
    - `HIGH` mặc định
    - giảm xuống `MEDIUM` nếu `isAiSpeaking()` trả về `true`
  - kèm `viewportRatio`
- Nếu tab vẫn bị ẩn quá ngưỡng `HIGH_HIDE_THRESHOLD_MS`:
  - với code hiện tại ngưỡng đang là `5_000ms`
  - FE emit thêm một `TAB_HIDDEN` severity `HIGH` kèm `durationMs`
- Khi tab quay lại visible:
  - tính `durationMs = now - hiddenSince`
  - emit `TAB_VISIBLE`

### `TAB_VISIBLE`

Đây là event hoàn tất vòng đời của một lần hidden.

- FE chỉ emit khi tab quay lại visible sau một giai đoạn hidden.
- `durationMs` ở đây là **thời gian tab đã bị ẩn**, không phải thời gian visible.
- Đây là điểm dễ gây hiểu nhầm nếu chỉ nhìn tên event.

### `WINDOW_BLUR`

FE lắng nghe `blur` của window.

- Khi window mất focus:
  - set `blurredSince = now`
  - nếu đang trong grace period thì bỏ qua flag
  - emit `WINDOW_BLUR` ngay
  - severity mặc định là `MEDIUM`
  - nếu `isAiSpeaking()` thì severity cũng được nâng/giữ ở `MEDIUM`

### `WINDOW_FOCUS`

FE lắng nghe `focus` của window.

- Khi window quay lại focus và `blurredSince != null`:
  - tính `durationMs = now - blurredSince`
  - emit `WINDOW_FOCUS`
  - severity `LOW`

### `DEVTOOLS_OPEN`

FE dùng heuristic từ sự chênh lệch giữa `window.outerWidth/innerWidth` và `window.outerHeight/innerHeight`.

- Nếu chênh lệch > `160px` theo một trong hai chiều:
  - coi là DevTools có khả năng đang mở
  - chỉ emit một lần khi trạng thái chuyển từ chưa flag sang flag
  - severity `LOW`
- Nếu resize trở lại bình thường:
  - reset `devtoolsFlagged = false`

### `NO_FACE`

FE poll mỗi `1000ms` trong `_startFaceMonitor()`.

- Nếu `getFaceCount() === 0`:
  - tăng `noFaceMs` theo thời gian elapsed
  - reset `multiFaceMs`
  - khi `noFaceMs >= NO_FACE_FLAG_MS` thì emit `NO_FACE`
  - current threshold trong code là `10_000ms`
  - severity `MEDIUM`
  - sau khi emit thì reset `noFaceMs = 0`

### `MULTIPLE_FACES`

FE poll mỗi `1000ms` trong `_startFaceMonitor()`.

- Nếu `getFaceCount() >= 2`:
  - tăng `multiFaceMs`
  - reset `noFaceMs`
  - khi `multiFaceMs >= MULTI_FACE_FLAG_MS` thì emit `MULTIPLE_FACES`
  - current threshold trong code là `3_000ms`
  - severity `HIGH`
  - kèm `metadata.faceCount`
  - sau khi emit thì reset `multiFaceMs = 0`

### `SECOND_VOICE`

FE poll mỗi `200ms` trong `_startSecondVoiceMonitor()`.

Điều kiện để monitor chạy:

- orchestrator state phải là `CANDIDATE_THINKING` hoặc `CANDIDATE_SPEAKING`
- `isAiSpeaking()` phải là `false`

Logic hiện tại:

- lấy `vadResult.rmsLevel`
- nếu `rmsLevel <= SPEECH_RMS_THRESHOLD` thì giảm counter dần
- nếu `state === 'CANDIDATE_THINKING'` và có speech:
  - tăng `secondVoiceCounter`
- nếu `state === 'CANDIDATE_SPEAKING'` và có speech:
  - kiểm tra transcript gần nhất qua `getLastTranscriptTs()`
  - nếu không có transcript mới trong `500ms` gần nhất thì tăng counter
  - nếu có transcript mới thì giảm counter
- khi `secondVoiceCounter >= SECOND_VOICE_TICKS_TO_FLAG`:
  - emit `SECOND_VOICE`
  - severity `HIGH`
  - kèm metadata `orchestratorState`, `ttsWasPlaying`, `rmsLevel`
  - reset counter về `0`

## 3) BE nhận dữ liệu như thế nào

### Endpoint hiện có

- `POST /api/combat/sessions/:id/proctoring-event`
- `POST /api/combat/sessions/:id/proctoring-event/batch`

### Luồng ingest

Ở BE, `CombatController` gọi vào `CombatMetricsService.ingestProctoringEvent()` cho single event và `ingestProctoringEventBatch()` cho batch.

Batch hiện tại chỉ là vòng lặp qua từng event rồi gọi single ingest, không có bulk insert riêng.

### Dedupe

BE hiện tại đã xử lý dedupe theo `client_event_id` bằng cách:

- dùng raw SQL `INSERT ... ON CONFLICT (client_event_id) DO NOTHING RETURNING id`
- nếu insert không sinh ra row mới thì bỏ qua

Ngoài ra entity `proctoring_events` cũng khai báo `clientEventId` là `unique`.

Kết quả:

- duplicate từ single request
- duplicate do single + batch overlap
- duplicate khi retry mạng

... đều được bỏ qua an toàn.

### Counter handling ở BE

BE chỉ tăng counter của `proctoring_sessions` khi insert thực sự thành công:

- `HIGH` → `highFlagCount += 1`
- `MEDIUM` → `mediumFlagCount += 1`
- `LOW` → `lowFlagCount += 1`

Nếu event bị dedupe thì counter không đổi.

## 4) Integrity score hiện tính như thế nào

`IntegrityCalculatorService` lấy tất cả event của một proctoring session rồi tính 2 lớp:

1. base deductions theo severity
2. correlation adjustments theo một số type đặc biệt

### 4.1 Base deductions

Hiện tại BE không có bảng rule riêng theo từng type ở phần base deduction. Nó dùng severity:

- `HIGH` → trừ `15`
- `MEDIUM` → trừ `7`
- `LOW` → trừ `2`

Nói cách khác, mọi event type đều có base penalty, nhưng mức trừ phụ thuộc severity chứ không phải type.

### 4.2 Correlation adjustments theo type

BE chỉ có logic correlation đặc biệt cho một vài type:

#### `TAB_HIDDEN`

Có 2 nhánh chính:

1. Nếu có ít nhất một `TAB_HIDDEN`:
   - BE gọi `getSessionGazePercent(behavioralSessionId)`
   - nếu gaze on-screen toàn phiên `>= 70%`
   - cộng mitigation `+5`
2. Với từng `TAB_HIDDEN` có `durationMs > 5000`:
   - BE lấy `relevanceScore` trước và sau thời điểm event
   - nếu `scoreAfter > scoreBefore + 0.3`
   - trừ thêm `10`

#### `SECOND_VOICE`

Nếu có ít nhất một `SECOND_VOICE`:

- BE gọi `getSessionDominantExpression(behavioralSessionId)`
- nếu dominant expression là `stressed`
- trừ thêm `5`

#### Các type khác

- `TAB_VISIBLE`
- `WINDOW_BLUR`
- `WINDOW_FOCUS`
- `DEVTOOLS_OPEN`
- `NO_FACE`
- `MULTIPLE_FACES`

Hiện tại **không có correlation rule riêng** cho các type này trong `IntegrityCalculatorService`.

### 4.3 Rule tổng hợp khác

Ngoài rule theo type, BE còn có:

- nếu trong cùng 1 type chỉ xuất hiện 1 lần và severity không phải `HIGH`:
  - cộng mitigation `+3`
- nếu một window 30 giây có từ 3 type khác nhau trở lên:
  - trừ `10`
- cap tổng adjustment trong khoảng `[-20, +20]`

### 4.4 Final score

BE tính:

```text
finalScore = clamp(100 - baseDeductions + adjustments, 0..100)
```

Sau đó map verdict:

- `>= 85` → `CLEAN`
- `70-84` → `MINOR_FLAGS`
- `50-69` → `SUSPICIOUS`
- `< 50` → `HIGHLY_SUSPICIOUS`

## 5) Bảng review theo từng type

| Type | FE detect | BE ingest/dedupe | Integrity impact |
|---|---|---|---|
| `TAB_HIDDEN` | `visibilitychange`, hidden state, grace period, AI-speaking giảm severity | Lưu vào `proctoring_events`, dedupe theo `client_event_id`, tăng counter theo severity | Base deduction theo severity; mitigation `+5` nếu gaze on-screen `>= 70%`; aggravation `-10` nếu `durationMs > 5000` và relevance score sau đó tăng mạnh |
| `TAB_VISIBLE` | Emit khi tab quay lại visible sau hidden | Lưu như event bình thường; dedupe theo `client_event_id` | Không có correlation rule riêng; chỉ ảnh hưởng base deduction theo severity `LOW` nếu có |
| `WINDOW_BLUR` | `window.blur` | Lưu như event bình thường; dedupe theo `client_event_id` | Không có correlation rule riêng; base deduction theo severity |
| `WINDOW_FOCUS` | `window.focus`, tính `durationMs` từ lúc blur | Lưu như event bình thường; dedupe theo `client_event_id` | Không có correlation rule riêng; base deduction theo severity `LOW` nếu có |
| `DEVTOOLS_OPEN` | Heuristic resize `outer - inner > 160` | Lưu như event bình thường; dedupe theo `client_event_id` | Không có correlation rule riêng; base deduction theo severity `LOW` |
| `NO_FACE` | `getFaceCount() === 0` đủ `10s` | Lưu như event bình thường; dedupe theo `client_event_id` | Không có correlation rule riêng; base deduction theo severity `MEDIUM` |
| `MULTIPLE_FACES` | `getFaceCount() >= 2` đủ `3s` | Lưu như event bình thường; dedupe theo `client_event_id` | Không có correlation rule riêng; base deduction theo severity `HIGH` |
| `SECOND_VOICE` | VAD RMS, orchestrator state, transcript freshness, đủ `5s` | Lưu như event bình thường; dedupe theo `client_event_id` | Base deduction theo severity `HIGH`; aggravation `-5` nếu dominant expression toàn phiên là `stressed` |

## 6) Điểm cần lưu ý khi review

1. `TAB_VISIBLE` đang gửi `durationMs`, nhưng giá trị đó là thời gian tab bị ẩn trước đó. Tên field này dễ gây hiểu nhầm.
2. FE hiện không emit `FOCUS_LOST`, dù tài liệu cũ có nhắc tới.
3. BE hiện chỉ có correlation rule riêng cho `TAB_HIDDEN` và `SECOND_VOICE`.
4. Các type còn lại vẫn ảnh hưởng integrity qua base deduction theo severity, nhưng không có rule đặc thù.
5. Batch endpoint hiện chỉ loop qua từng event, không làm bulk insert riêng. Dedupe vẫn an toàn nhờ `client_event_id` unique + `ON CONFLICT DO NOTHING`.
