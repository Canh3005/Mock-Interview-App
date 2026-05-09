## WHAT

Feature này xây analytics và quality loop cho Behavioral Question Bank. Admin có thể theo dõi practice count, completion rate, skip rate, retry rate, score distribution, expected signal coverage, red flag rate, follow-up trigger rate, fallback rate, user rating, report rate, language coverage và usage diversity để biết probe nào tốt hoặc cần review.

Outcome là bank được cải thiện liên tục bằng dữ liệu sử dụng thực tế thay vì chỉ dựa vào cảm giác của curator.

## WHY

Một bank nhiều câu hỏi chưa chắc chất lượng nếu không biết câu nào gây drop-off, câu nào quá dễ/khó, câu nào scoring không ổn định hoặc câu nào bị selector dùng quá nhiều. Analytics giúp admin ưu tiên sửa probe, cải thiện wording/guidance và cân bằng usage.

Feature này unlock quality optimization, A/B testing và semantic retrieval an toàn hơn.

## Epic Context

Feature thuộc epic Behavioral Question Bank, nằm ở milestone Analytics, Quality & Optimization. Nó phụ thuộc vào public practice, AI orchestration và scoring để có dữ liệu đủ ý nghĩa.

Nếu feature này chưa có, hệ thống vẫn chạy được nhưng không có vòng phản hồi để biết câu hỏi nào thực sự hữu ích hay đang làm giảm chất lượng luyện tập.

## SCOPE

In:
- Theo dõi usage và outcome theo từng probe.
- Admin xem được probe nào phổ biến, probe nào drop-off cao, probe nào scoring không ổn định hoặc bị report.
- Theo dõi language coverage để biết probe có đủ localized content cho ngôn ngữ publish hay không.
- Theo dõi usage diversity để phát hiện selector lạm dụng một nhóm probe.
- Quality review loop chuyển probe có vấn đề về needs revision hoặc ưu tiên review.
- Hỗ trợ A/B test wording display question, guidance và Interview Set ordering ở mức product decision.

Out:
- Không tự động sửa nội dung probe mà không qua review.
- Không thay thế judgement của admin/curator bằng metric đơn lẻ.
- Không xây semantic retrieval trong feature này.
- Không tạo marketplace public.

Depends on: `019-question-probe-curation-workflow`, `021-question-detail-practice-entry`, `023-probe-aware-ai-selection-orchestration`, `024-probe-aware-scoring-feedback`

Blocks: `017-behavioral-question-bank-rag`, continuous quality optimization.

## Business Flow

### Happy Path

1. Candidate browse, luyện câu hỏi hoặc tham gia Interview Set.
2. Hệ thống ghi nhận lượt xem, bắt đầu luyện, hoàn thành, bỏ qua, retry, rating/report và outcome scoring ở mức probe.
3. Admin mở dashboard chất lượng để xem probe nào có tín hiệu tốt hoặc xấu.
4. Admin lọc theo role, level, type, competency, language hoặc time period để hiểu vấn đề.
5. Probe có drop-off cao, report cao, scoring lệch hoặc thiếu language coverage được đưa vào review loop.
6. Admin/curator sửa wording, guidance, localization, taxonomy hoặc retire probe nếu cần.
7. Sau khi sửa/publish lại, analytics tiếp tục theo dõi chất lượng để xác nhận cải thiện.

### Edge Cases & Business Rules

- Một metric riêng lẻ không đủ để kết luận probe xấu; cần xem theo context role/level/difficulty và volume.
- Probe mới có ít dữ liệu không nên bị đánh giá chất lượng thấp quá sớm.
- Usage diversity phải giúp giảm lặp, không ép selector chọn probe kém phù hợp chỉ để cân bằng số lượt.
- A/B test guidance không được biến thành đáp án mẫu làm mất giá trị scoring.
- Report từ user/admin phải đưa probe vào review loop rõ ràng.
- Analytics phải phân biệt question display language và feedback language khi đánh giá localization.

## Acceptance Criteria

- Given một probe có completion rate thấp và report rate cao, When admin xem quality dashboard, Then probe được highlight là cần review với lý do nghiệp vụ rõ ràng.
- Given một role/level có vài probe được dùng quá nhiều, When admin xem usage diversity, Then admin thấy nhóm probe đang bị lạm dụng và có thể điều chỉnh curation/selector strategy.
- Given một probe active thiếu localized content tiếng Nhật, When admin xem language coverage, Then probe được đánh dấu chưa đủ coverage cho publish tiếng Nhật.
- Given admin sửa wording của một probe sau A/B test, When probe được publish lại, Then hệ thống tiếp tục đo outcome để so sánh chất lượng sau thay đổi.

## Risk

- Analytics có thể bị diễn giải sai nếu admin nhìn một metric đơn lẻ hoặc dữ liệu quá ít, dẫn đến retire/sửa probe tốt.
  Mitigation: Dashboard phải hiển thị volume, context và nhiều metric liên quan trước khi đưa probe vào quality action.
