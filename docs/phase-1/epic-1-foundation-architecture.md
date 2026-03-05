# Epic 1: Foundation Architecture (Refined for Code Challenge Scale)

Tài liệu này đi sâu vào thiết kế kiến trúc Backend linh hoạt để hỗ trợ phòng thi (Interview Session) chứa cấu hình N bài toán. Thiết kế này được đúc kết từ kinh nghiệm xây dựng các hệ thống Online Judge (OJ) như LeetCode/HackerRank, đặt trọng tâm vào **Scalability**, **Data Integrity**, và **Security**.

## 1. Phân tích & Phê bình (Critique) Thiết kế cũ
Trước khi đưa ra thiết kế chuẩn, đây là những điểm yếu chí mạng của bản thảo trước nếu chạy ở production:
1. **Thiếu Tách biệt Ngôn Ngữ (Language Abstraction):** Bảng `problems` và `submissions` gom chung `language` thành chuỗi. Thực tế, mỗi ngôn ngữ cần môi trường chạy khác nhau (Python 3.10 vs 3.8), cấu hình cấp phát Memory/Time Limit cũng khác nhau (Java cần nhiều memory và time hơn C++).
2. **Thiếu Bảng `Templates` / `Runners`:** Code của User không thể chạy trực tiếp. Nó cần một `Driver Code` (giống hàm `main()` nhận test cases và gọi hàm solution của user). Bản cũ gộp vào chung schema Problem, khiến việc thêm/bớt ngôn ngữ cực lùng nhùng.
3. **Lưu trữ Test Case thô:** Lưu Input/Output trực tiếp vào DB dạng text có nguy cơ tràn DB khi Input là mảng 10,000 phần tử. Các hệ thống thực tế dùng Storage (S3) để trỏ link. Tuy Phase 1 dùng DB cho nhanh, nhưng cần đánh index và giới hạn size.
4. **Trạng thái Session_Problems lộn xộn:** Việc gộp `is_editor_unlocked` và `pre_coding_chat` vào cùng dòng dữ liệu trạng thái code là vi phạm Single Responsibility. Chat là Chat, Code State là Code State.

## 2. Thiết kế Cơ Sở Dữ Liệu Tối Ưu (PostgreSQL)

Dưới đây là thiết kế Schema chuẩn BCNF (Boyce-Codd Normal Form) phục vụ cho một bài toán giải thuật quy mô lớn.

### 2.1. Domain: Ngân hàng Bài tập (Problem Catalog)

**Bảng `problems`**
Lõi nội dung bài toán (Language Agnostic - Không dính dáng đến lập trình cụ thể).
- `id` (UUID, PK)
- `title`, `slug`, `difficulty`
- `description` (Markdown), `constraints` (JSON array)
- `time_limit_multiplier` (Float): Cấu hình độ khó thời gian.

**Bảng `problem_templates` (CRITICAL)**
Chứa mã nguồn gốc tỳ thuộc từng bài và ngôn ngữ.
- `id` (UUID)
- `problem_id` (FK)
- `language_id` (Khóa ngoại trỏ bảng Languages chuẩn: vd 1=Python, 2=Java).
- `starter_code` (Text): Đoạn mã khung hiện ra cho User (Vd: `class Solution { public int[] twoSum() {...} }`).
- `driver_code` (Text): Đoạn mã cha nạp ở Backend. Nhiệm vụ của nó là Import `starter_code`, parse Input Test Case từ stdin, và in ra stdout.
- `time_limit_ms`, `memory_limit_kb`: Giới hạn cấu hình *riêng* cho ngôn ngữ này trong bài toán này.

**Bảng `test_cases`**
Quy luật kiểm thử.
- `id` (UUID, PK)
- `problem_id` (FK)
- `input_data` (Text)
- `expected_output` (Text)
- `is_hidden` (Boolean)
- `weight` (Int): Trọng số điểm (VD: Test ẩn ăn điểm gấp đôi).

### 2.2. Domain: Quản lý Phiên Phỏng vấn (Interview Session)

Để hỗ trợ Multi-Problem, sử dụng mô hình Master-Detail rõ ràng.

**Bảng `interview_sessions` (Session Master)**
- `id` (UUID, PK)
- `user_id` (FK)
- `configured_problems_count` (Int)
- `total_time_limit_ms` (Int)
- `status` (Enum: IN_PROGRESS, FINISHED_BY_USER, TIME_EXCEEDED).
- `final_scorecard` (JSONB): *Batch Evaluation Payload* cho AI chấm điểm cuối giờ.
- `started_at`, `finished_at`.

**Bảng `session_problems` (Trạng thái nỗ lực Từng câu)**
Lưu vết trạng thái bài nào chưa code, đang code mở, số lượng nộp.
- `id` (UUID, PK)
- `session_id` (FK)
- `problem_id` (FK)
- `status` (Enum: LOCKED, UNLOCKED, SOLVED, FAILED) -> Rõ ràng hóa State Machine thay vì dùng cờ boolean.
- `current_language_id` (FK): Ngôn ngữ ứng viên đang chọn viết.
- `current_code` (Text): Auto-save mã nguồn mới nhất (Snapshots).
- `submit_count` (Int): Giới hạn 5 lần.
- `hint_count` (Int).

**Bảng `session_problem_chats` (Tách bạch Logs UI Chat)**
Không lưu vào JSONB của bảng cha, mảng Chat Idea cần được lưu dạng Row độc lập.
- `id`, `session_problem_id` (FK)
- `role` (Enum: SYSTEM, USER, AI_INTERVIEWER)
- `content` (Text)
- `timestamp`

### 2.3. Domain: Thực thi Mã (Execution)

**Bảng `submissions`**
Bảng lưu trữ cực đanh thép mỗi khi bấm nút "Submit" (Không tính "Run Code").
- `id` (UUID, PK)
- `session_problem_id` (FK)
- `language_id`
- `submitted_code` (Text)
- `status` (Enum: PENDING, ACCEPTED, WRONG_ANSWER, TIME_LIMIT_EXCEEDED, MEMORY_LIMIT_EXCEEDED, RUNTIME_ERROR, COMPILE_ERROR, INTERNAL_ERROR).
- `execution_time_ms`, `memory_used_kb`
- `failed_test_case_id` (FK, Nullable)

## 3. API Design & Lifecycle

**Khởi tạo `POST /api/sessions/init`**
- Tạo 1 `interview_sessions`, Insert N dòng `session_problems` trạng thái `LOCKED`.

**Mở khóa `POST /api/sessions/problems/:id/chat`**
- User push chat -> Lưu vào `session_problem_chats`. Đủ 2 vòng chat (Logic Rule Engine), Backend update status `session_problems` thành `UNLOCKED`, trả event về Frontend kích hoạt Editor ánh sáng.

**Nộp bài `POST /api/sessions/problems/:id/submit` (Cực Kỳ Quan Trọng)**
- Check rate-limit và giới hạn max 5 lần của `session_problems`.
- Frontend gửi `{ code, languageId }`.
- Backend *không được tin* code của Frontend. Backend ghép `code` với `driver_code` tương ứng từ bảng `problem_templates`.
- Gửi cục payload tới Job Queue Worker -> Engine Judge0. (Chạy bất đồng bộ, trả về `submission_id`).
- Tạo bảng ghi vào `submissions` với status `PENDING`. Frontend ping kiểm tra hoặc dùng WebSockets.

**Kết Thúc `POST /api/sessions/:id/evaluate`**
- Trạng thái phiên chuyển về `FINISHED_BY_USER`. Khóa mọi cổng nộp bài.
- Khởi động pipeline gom `session_problem_chats`, `submissions` cuối và đẩy sang AI Module để sinh scorecard.

## 4. Frontend Redux Kiến trúc chuẩn (Slices)

Đứng ở góc độ UI một IDE phức tạp, Zustand hay Context là không đủ sức, Redux Slice tách bạch rõ các Domain như Back-end:

1. `sessionMetaDataSlice`: Lưu Timer chung, Session ID, Active Tab bài toán nào.
2. `problemsMapSlice`: Dictionary Hash (Key: problemId). Lưu trữ đề bài (Read Only), Không trộn lẫn Code Editor.
3. `codeEditorSlice`: Lưu trữ riêng Trạng thái *thay đổi siêu tốc* của Editor (như `currentCode` cho `activeProblemId`). Điều này ngăn việc user gõ 1 chữ, toàn bộ Component Đề bài/Chat bị re-render.
4. `chatLogSlice`: Array push dữ liệu chat riêng cho bài Active đang được chọn.

*Sự tách biệt trên Store Redux ngăn chặn Render Bottleneck trên Frontend khi user gõ code tốc độ cao 60FPS.*
