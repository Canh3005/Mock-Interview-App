## WHAT

Khi ứng viên chọn Combat mode và chọn round System Design, toàn bộ phiên thiết kế hệ thống sẽ được giám sát như một buổi phỏng vấn thực chiến: camera và micro bật liên tục để phân tích ngôn ngữ cơ thể, phát hiện gian lận, và AI phát âm thay vì chỉ hiển thị text trong chat. Dữ liệu giám sát được tích lũy chung vào InterviewSession — nếu session có nhiều round, Combat Scorecard (integrity score, multimodal score) chỉ được tính và hiển thị sau khi round cuối cùng kết thúc. System Design thường là round cuối của session.

## WHY

Hiện tại SD round không có khái niệm mode (practice/combat) — tất cả ứng viên đều thi trong cùng môi trường mở. Ứng viên có thể mở tài liệu, nhờ người hỗ trợ, hoặc chuyển tab mà hệ thống không phát hiện. Feature này bổ sung mode field cho SD session, áp dụng mức giám sát Combat, tạo ra đánh giá system design có độ tin cậy cao hơn.

## Epic Context

Thuộc epic mở rộng Combat mode từ Behavioral-only sang toàn session 3-round. Feature này xử lý round thứ 3 (System Design). Feature `010-combat-mode-dsa` xử lý round thứ 2 (Live-Coding) theo cùng pattern và nên được hoàn thành trước để validate approach. Cả 2 feature chia sẻ cùng infrastructure backend (CombatModule) đã có. Feature này cần thêm `mode` field vào SD entity — đây là thay đổi schema duy nhất.

Depends on: 010-combat-mode-dsa (validate pattern trước), Behavioral Combat mode infrastructure (đã done)  
Blocks: none

## SCOPE

In:
- Thêm field `mode: 'practice' | 'combat'` vào SD Session entity + migration
- Permission Gate (camera + mic + face check) hiển thị trước khi vào SD room khi mode = combat
- TTS: AI phát âm toàn bộ tin nhắn gửi ra trong AI chat của SD room khi mode = combat
- MultimodalEngine chạy suốt phiên thiết kế khi mode = combat (eye tracking, filler word detection, micro-expression)
- CombatProctoring chạy suốt phiên thiết kế khi mode = combat (tab switch, window blur, multiple faces, no face, second voice, devtools)
- Dữ liệu hành vi và các sự kiện vi phạm proctoring được ghi nhận liên tục và tích lũy chung vào hồ sơ giám sát của InterviewSession — dùng chung cho tất cả rounds trong cùng session
- Nếu SD là round cuối của session: hệ thống tính Integrity Score và tổng hợp Combat Scorecard sau khi phase COMPLETED
- Nếu SD không phải round cuối: dữ liệu được lưu nhưng chưa tính điểm — round tiếp theo tiếp tục bổ sung vào cùng hồ sơ giám sát
- Trang kết quả hiển thị Combat Scorecard (tổng hợp toàn session) chỉ sau round cuối cùng: overall combat score, integrity score, soft-skill score, eye contact %, top filler words, stress peak timeline, proctoring events timeline
- Navigation logic cập nhật: truyền mode vào khi tạo SD session

Out:
- Silence escalation protocol (không áp dụng — ứng viên vẽ diagram, không cần nói)
- Auto-transition giữa các phase (SD đã có phase flow riêng, không thay đổi)
- Thay đổi logic chấm điểm SD (vẫn như cũ: architecture quality, completeness, depth)
- Thay đổi AI behavior hoặc phase transition logic của SD round
- Thêm voice input cho ứng viên trong SD room

Depends on: 010-combat-mode-dsa, Combat backend infrastructure (CombatModule, ProctoringSession entity, CombatSessionAggregate entity — đã có)  
Blocks: none

## Business Flow

### Happy Path

1. Ứng viên hoàn thành ModeSelectionStep chọn "Thực chiến" và RoundSelectionStep chọn System Design.
2. Hệ thống hiển thị **Permission Gate**: yêu cầu camera, mic, kiểm tra face detection. Điều kiện proceed giống hệt DSA combat (đúng 1 mặt, cam ready, mic ready, tab visible, window focused).
3. Ứng viên vào SD room. **MultimodalEngine** và **CombatProctoring** khởi động ngay khi room mount. Camera stream hiển thị nhỏ ở góc màn hình.
4. AI gửi tin nhắn mở đầu phase CLARIFICATION — hệ thống **phát âm tin nhắn** qua TTS. Ứng viên nghe AI hỏi trong khi đọc text và gõ câu trả lời vào chat.
5. Trong suốt phiên: mọi tin nhắn AI gửi ra (trong tất cả các phase: CLARIFICATION → DESIGN → DEEP_DIVE → WRAP_UP) đều được TTS phát âm. Mọi vi phạm proctoring được ghi lại silently.
6. Phase transitions xảy ra như bình thường (AI-driven, không thay đổi).
7. Khi phase chuyển sang COMPLETED: toàn bộ dữ liệu hành vi và vi phạm được lưu vào hồ sơ giám sát của InterviewSession.
   - SD thường là round cuối → hệ thống tính điểm toàn vẹn và tổng hợp Combat Scorecard.
   - Nếu còn round tiếp theo (hiếm) → dữ liệu được lưu nhưng chưa tính điểm, round sau tiếp tục bổ sung.
8. Trang kết quả hiển thị **Combat Scorecard aggregated toàn session** (chỉ sau round cuối): điểm thiết kế SD + soft-skill score + integrity score + verdict (CLEAN / MINOR_FLAGS / SUSPICIOUS) + timeline events toàn bộ session.

### Edge Cases & Business Rules

**Permission Gate từ chối:**
- Giống 010: từ chối camera/mic → không thể proceed, có thể quay lại chuyển Practice mode.
- Không phát hiện mặt → hướng dẫn điều chỉnh, chưa proceed.

**Mất camera giữa chừng:**
- Proctoring ghi NO_FACE event liên tục. Hệ thống không interrupt phase flow.

**TTS fail:**
- Tin nhắn AI vẫn hiển thị text bình thường. Phiên không bị ảnh hưởng.

**Tab switch khi đang vẽ diagram:**
- TAB_HIDDEN event bị log sau grace period 5 giây. Canvas auto-save vẫn chạy bình thường khi trở lại.

**Phase DESIGN với canvas active:**
- Ứng viên kéo thả component, không cần nói. MultimodalEngine vẫn chạy nền — đây là thiết kế đúng vì ứng viên vẫn có thể filler word khi gõ chat, và eye contact vẫn đo được.

**Practice mode SD:**
- Toàn bộ behavior trên không áp dụng. Không có Permission Gate, không có TTS, không có MultimodalEngine, không có Proctoring. SD room hoạt động như hiện tại.

**SD session cũ (không có mode field):**
- Sessions tạo trước migration mặc định là 'practice' — không bị ảnh hưởng.

## Acceptance Criteria

- Given ứng viên đã chọn Combat mode và chọn round System Design, When ứng viên bấm "Tiếp tục" sau RoundSelection, Then hệ thống hiển thị Permission Gate yêu cầu camera và mic trước khi vào SD room — không hiển thị Gate này cho Practice mode.

- Given ứng viên đã pass Permission Gate và đang trong SD room (Combat mode) ở phase CLARIFICATION, When AI gửi câu hỏi làm rõ yêu cầu vào chat, Then câu hỏi đó được phát âm qua TTS đồng thời với hiển thị text trong chat panel.

- Given ứng viên đang trong SD room (Combat mode) ở phase DESIGN, When ứng viên chuyển sang tab khác, Then hệ thống ghi TAB_HIDDEN event với timestamp — canvas auto-save không bị gián đoạn, ứng viên không nhận cảnh báo.

- Given ứng viên vừa hoàn thành SD session (phase COMPLETED) ở Combat mode và SD là round cuối của session, When hệ thống hoàn tất tính điểm, Then trang kết quả hiển thị Combat Scorecard aggregated toàn session gồm: điểm thiết kế SD, soft-skill score, integrity score, và verdict (CLEAN / MINOR_FLAGS / SUSPICIOUS).

- Given ứng viên vừa hoàn thành SD session (phase COMPLETED) ở Combat mode nhưng session còn round tiếp theo, When hệ thống hoàn tất xử lý, Then trang kết quả chỉ hiển thị điểm thiết kế SD — không có Combat Scorecard, không có integrity score.

- Given SD session được tạo với mode = 'practice', When ứng viên vào SD room, Then MultimodalEngine và CombatProctoring không khởi động, TTS không chạy, camera không được yêu cầu.

- Given SD session entity sau migration, When một SD session cũ (không có mode field) được query, Then mode trả về mặc định là 'practice'.

## Risk

**HIGH** — TTS chạy trong SD room có thể overlap với ứng viên đang gõ vào chat: nếu ứng viên gửi tin ngay khi AI đang nói, audio bị cắt hoặc queue lộn.  
Mitigation: Dùng cùng SentenceTtsBuffer queue đã có ở Behavioral room — SA quyết định reuse hay adapt.

**HIGH** — SD room là component nặng (Reactflow canvas + MediaPipe + Monaco-free nhưng nhiều state): khả năng performance regression khi thêm MultimodalEngine.  
Mitigation: SA cần benchmark frame processing rate trên cấu hình máy trung bình trước khi ship.
