## WHAT

Khi ứng viên chọn Combat mode và chọn round Live-Coding (DSA), toàn bộ phiên code sẽ được giám sát như một buổi phỏng vấn thực chiến: camera và micro bật liên tục để phân tích ngôn ngữ cơ thể, phát hiện gian lận, và AI phát âm thay vì chỉ hiển thị text. Dữ liệu giám sát được tích lũy chung vào InterviewSession — nếu session có nhiều round, Combat Scorecard (integrity score, multimodal score) chỉ được tính và hiển thị sau khi round cuối cùng kết thúc.

## WHY

Hiện tại Combat mode chỉ áp dụng cho Behavioral round — ứng viên vẫn có thể code trong môi trường hoàn toàn mở (tra cứu, nhờ người, mở tab khác) mà hệ thống không phát hiện được. Feature này đưa mức độ nghiêm khắc của Combat mode vào round Live-Coding, tạo ra một buổi đánh giá kỹ thuật có độ tin cậy cao hơn.

## Epic Context

Thuộc epic mở rộng Combat mode từ Behavioral-only sang toàn session 3-round. Feature này xử lý round thứ 2 (Live-Coding). Feature `011-combat-mode-sd` xử lý round thứ 3 (System Design) theo cùng pattern. Cả 2 feature chia sẻ cùng infrastructure backend (CombatModule: multimodal metrics, proctoring events, integrity score) đã được build cho Behavioral round — feature này tái sử dụng, không build mới.

Depends on: Behavioral Combat mode (đã done — infrastructure backend tồn tại)  
Blocks: 011-combat-mode-sd (cùng pattern, nên làm sau khi DSA đã xong để validate approach)

## SCOPE

In:
- Permission Gate (camera + mic + face check) hiển thị trước khi vào DSA room khi mode = combat
- TTS: AI phát âm toàn bộ tin nhắn gửi ra trong AI chat của DSA room khi mode = combat
- MultimodalEngine chạy suốt phiên code khi mode = combat (eye tracking, filler word detection, micro-expression)
- CombatProctoring chạy suốt phiên code khi mode = combat (tab switch, window blur, multiple faces, no face, second voice, devtools)
- Dữ liệu hành vi (eye tracking, filler words, expressions) và các sự kiện vi phạm proctoring được ghi nhận liên tục và tích lũy chung vào hồ sơ giám sát của InterviewSession — dùng chung cho tất cả rounds trong cùng session
- Nếu DSA là round cuối của session: hệ thống tính Integrity Score và tổng hợp Combat Scorecard sau khi round kết thúc
- Nếu DSA không phải round cuối: dữ liệu được lưu nhưng chưa tính điểm — round tiếp theo tiếp tục bổ sung vào cùng hồ sơ giám sát
- Trang kết quả hiển thị Combat Scorecard (tổng hợp toàn session) chỉ sau round cuối cùng: overall combat score, integrity score, soft-skill score, eye contact %, top filler words, stress peak timeline, proctoring events timeline

Out:
- Silence escalation protocol (user gõ code, không nói — không áp dụng)
- Auto-transition giữa các stage (DSA round không có stage)
- Time budget per stage (không áp dụng)
- Thay đổi logic chấm điểm kỹ thuật DSA (vẫn như cũ: test cases pass/fail, complexity)
- Thay đổi AI behavior hoặc hint logic của DSA round

Depends on: Combat backend infrastructure (CombatModule, ProctoringSession entity, CombatSessionAggregate entity — đã có)  
Blocks: 011-combat-mode-sd

## Business Flow

### Happy Path

1. Ứng viên hoàn thành ModeSelectionStep chọn "Thực chiến" và RoundSelectionStep chọn Live-Coding.
2. Hệ thống hiển thị **Permission Gate**: yêu cầu camera, micro, kiểm tra face detection. Ứng viên cần có đúng 1 khuôn mặt trong khung hình và đủ điều kiện (cam ready, mic ready, tab visible, window focused) mới bấm được "Bắt đầu".
3. Ứng viên vào DSA room. **MultimodalEngine** và **CombatProctoring** khởi động ngay khi room mount. Camera stream hiển thị nhỏ ở góc màn hình (như Behavioral combat room).
4. AI gửi tin nhắn đầu tiên (giới thiệu bài toán) — hệ thống **phát âm tin nhắn** đó qua TTS. Ứng viên nghe AI nói trong khi đọc text.
5. Trong suốt phiên: mọi tin nhắn AI gửi ra đều được TTS phát âm. Mọi vi phạm proctoring (chuyển tab, mất mặt, v.v.) được ghi lại silently — ứng viên không thấy alert, hệ thống chỉ log event.
6. Ứng viên nộp code. Hệ thống chấm điểm kỹ thuật như bình thường.
7. Khi phiên DSA kết thúc (nộp xong hoặc hết giờ): toàn bộ dữ liệu hành vi và vi phạm được lưu vào hồ sơ giám sát của InterviewSession.
   - Nếu DSA là round cuối → hệ thống tính điểm toàn vẹn và tổng hợp Combat Scorecard.
   - Nếu còn round tiếp theo → hệ thống chuyển sang round tiếp, tiếp tục ghi nhận hành vi vào cùng hồ sơ giám sát.
8. Trang kết quả hiển thị **Combat Scorecard tổng hợp toàn session** (chỉ sau round cuối): điểm kỹ thuật DSA + điểm kỹ năng mềm + integrity score + verdict (CLEAN / MINOR_FLAGS / SUSPICIOUS) + timeline events toàn bộ session.

### Edge Cases & Business Rules

**Permission Gate từ chối:**
- Nếu ứng viên từ chối camera hoặc mic → Gate hiển thị trạng thái lỗi, không thể proceed. Ứng viên có thể chọn quay lại chuyển sang Practice mode.
- Nếu không phát hiện được mặt chưa cho phép proceed.

**Mất camera giữa chừng:**
- Nếu camera track bị mất sau khi đã vào room → Proctoring ghi NO_FACE event liên tục. Hệ thống không force-end session.

**TTS fail:**
- Nếu TTS API trả lỗi hoặc timeout → tin nhắn AI vẫn hiển thị text như bình thường. Phiên không bị ảnh hưởng. TTS failure không được log như proctoring event.

**Tab switch khi đang code:**
- Tab switch bình thường (ứng viên tra cứu) bị ghi là TAB_HIDDEN event. Sau grace period 5 giây đầu phiên, mọi tab switch đều bị log. Việc deduct điểm integrity là business decision của hệ thống, không cần ứng viên biết realtime.

**Ứng viên nộp trước khi hết giờ:**
- Hệ thống lưu toàn bộ dữ liệu hành vi đã ghi nhận tới thời điểm nộp. Nếu còn round tiếp theo, giám sát tiếp tục ngay khi ứng viên vào round đó.

**DSA không phải round cuối của session:**
- Dữ liệu hành vi được lưu vào hồ sơ giám sát của session nhưng chưa tính điểm toàn vẹn. Trang kết quả của DSA round chỉ hiển thị điểm kỹ thuật DSA. Combat Scorecard tổng hợp chỉ xuất hiện sau round cuối cùng của session.

**Practice mode DSA:**
- Toàn bộ behavior trên không áp dụng. Không có Permission Gate, không có TTS, không có MultimodalEngine, không có Proctoring. DSA room hoạt động như hiện tại.

## Acceptance Criteria

- Given ứng viên đã chọn Combat mode và chọn round Live-Coding, When ứng viên bấm "Tiếp tục" sau RoundSelection, Then hệ thống hiển thị Permission Gate yêu cầu camera và mic trước khi vào DSA room — không hiển thị Gate này cho Practice mode.

- Given ứng viên đã pass Permission Gate và đang trong DSA room (Combat mode), When AI gửi bất kỳ tin nhắn nào trong chat, Then tin nhắn đó được phát âm qua TTS đồng thời với hiển thị text.

- Given ứng viên đang trong DSA room (Combat mode), When ứng viên chuyển sang tab khác trong trình duyệt, Then hệ thống ghi lại TAB_HIDDEN event với timestamp — ứng viên không nhận được cảnh báo nào trên màn hình.

- Given ứng viên vừa nộp bài DSA (Combat mode) và DSA là round cuối của session, When hệ thống hoàn tất xử lý kết quả, Then trang kết quả hiển thị Combat Scorecard aggregated toàn session gồm: điểm kỹ thuật, soft-skill score, integrity score, và verdict (CLEAN / MINOR_FLAGS / SUSPICIOUS).

- Given ứng viên vừa nộp bài DSA (Combat mode) nhưng session còn round tiếp theo, When hệ thống hoàn tất xử lý kết quả DSA, Then trang kết quả chỉ hiển thị điểm kỹ thuật DSA — không có Combat Scorecard, không có integrity score.

- Given ứng viên đang trong DSA room (Combat mode) với camera bật, When MultimodalEngine flush metrics mỗi 15 giây, Then dữ liệu eye contact %, filler rate, và dominant expression được lưu vào CombatSessionAggregate liên kết với live-coding session này.

## Risk

**HIGH** — TTS chạy song song với code editor: nếu TTS playback delay hoặc overlap giữa các câu gây nhiễu audio, ứng viên mất tập trung khi đang code.  
Mitigation: Chỉ phát TTS khi không có audio đang play; queue tin nhắn mới nếu TTS đang bận.

**HIGH** — MultimodalEngine dùng MediaPipe chạy trên browser thread: có thể gây giật lag trên máy yếu khi đang chạy Monaco Editor + AI chat đồng thời.  
Mitigation: SA quyết định worker isolation hoặc throttle frame rate xuống thấp hơn behavioral room.
