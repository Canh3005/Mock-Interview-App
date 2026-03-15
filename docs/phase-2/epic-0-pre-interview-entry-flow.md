# Epic 0: Pre-Interview Entry Flow (Luồng vào phòng thi)

Epic này xây dựng toàn bộ luồng từ lúc ứng viên bấm nút **"Bắt đầu phỏng vấn"** đến lúc session phỏng vấn thực sự khởi động. Luồng gồm 3 cửa: Kiểm tra ngữ cảnh CV/JD → Chọn chế độ → Chọn vòng thi.

---

## Task 0.1: BE – Preflight Check API (Kiểm tra ngữ cảnh Redis)

**Mô tả:** Endpoint kiểm tra xem Redis đã có `cv_context` và `jd_context` cho user hiện tại chưa trước khi cho phép bước vào luồng chọn chế độ.

**Chi tiết công việc:**

1. Tạo `GET /api/interview/preflight` (Guard: JWT Auth).
2. Logic:
   - Lấy `userId` từ JWT payload.
   - Kiểm tra 2 key Redis: `cv_context:{userId}` và `jd_context:{userId}`.
   - Trả về JSON:
     ```json
     {
       "ready": true | false,
       "missing": ["cv_context"] | ["jd_context"] | [] | ["cv_context","jd_context"]
     }
     ```
3. Nếu `ready: true`: Trả thêm metadata tóm tắt (không trả full context để tiết kiệm payload):
   ```json
   {
     "ready": true,
     "missing": [],
     "summary": {
       "cv_snippet": "Nguyễn Văn A – 3 năm kinh nghiệm React/NestJS...",
       "jd_snippet": "Senior Frontend Engineer tại Startup X..."
     }
   }
   ```
4. TTL Redis của 2 key này: **24 giờ** (reset khi user upload lại).

**Kỹ thuật:**
- Module: `InterviewModule` → `PreflightService`.
- Inject `RedisService` đã có từ Phase 1.
- Không query DB, chỉ Redis → đảm bảo latency < 50ms.

---

## Task 0.2: FE – Entry Guard & Notification Modal

**Mô tả:** Khi user bấm "Bắt đầu phỏng vấn", FE call preflight rồi hiển thị modal tương ứng.

**Chi tiết công việc:**

1. **Nút "Bắt đầu phỏng vấn"** trigger action `initiateInterviewEntry()`.
2. Dispatch call `GET /api/interview/preflight`, show skeleton loading trên nút (disabled + spinner).
3. **Case A – Thiếu cv_context hoặc jd_context (`ready: false`):**
   - Hiển thị `<MissingContextModal>`:
     - Icon cảnh báo (màu amber).
     - Nội dung: *"Bạn chưa upload [CV / JD / CV và JD]. Hãy hoàn thiện hồ sơ trước khi bắt đầu phỏng vấn để AI có thể cá nhân hóa đúng trình độ và vị trí của bạn."*
     - Nút **"Đi đến trang Upload"** → navigate sang `/profile/upload` (trang CV/JD đã có).
     - Nút **"Huỷ"** → đóng modal.
4. **Case B – Đủ context (`ready: true`):**
   - Hiển thị `<ContextConfirmModal>`:
     - Header: "Ngữ cảnh phỏng vấn của bạn"
     - Hiển thị `cv_snippet` và `jd_snippet` dạng card tóm tắt.
     - Message gợi ý: *"Nếu thông tin trên chưa chính xác, hãy upload lại trước khi bắt đầu."*
     - Nút **"Cập nhật CV/JD"** → navigate `/profile/upload`.
     - Nút **"Bắt đầu"** → chuyển sang Task 0.3 (Mode Selection).

**Redux Slice:** `interviewSetupSlice` với state:
```ts
{
  preflightStatus: 'idle' | 'loading' | 'ready' | 'missing',
  missing: string[],
  summary: { cv_snippet: string; jd_snippet: string } | null,
  selectedMode: 'practice' | 'combat' | null,
  selectedRounds: RoundKey[],
}
```

---

## Task 0.3: FE – Mode Selection Screen (Practice vs Combat)

**Mô tả:** Màn hình chọn chế độ thi. Hai mode có sự khác biệt cốt lõi về tài nguyên tiêu hao và cơ chế giám sát – cần truyền đạt rõ ràng để user đưa ra lựa chọn có chủ ý.

**Chi tiết công việc:**

1. Route: `/interview/setup/mode` (hoặc hiện dạng multi-step modal fullscreen).
2. Hiển thị 2 card lớn cạnh nhau:

   ---
   **Practice Mode – "Luyện tập"** (màu Blue/Cyan)

   - Giao tiếp qua **Text hoặc Voice chat**.
   - AI đóng vai Mentor thân thiện, có gợi ý (hint) khi bạn bị kẹt.
   - **Không yêu cầu** Webcam hay Microphone.
   - Không kích hoạt hệ thống giám sát.
   - Tối ưu chi phí – tập trung rèn luyện logic và kiến thức thuần túy.
   - Badge: "Không giới hạn thời gian" | "Không cần Webcam"

   ---
   **Combat Mode – "Thực chiến"** (màu Red/Orange)

   - **Bắt buộc bật Webcam và Microphone** trước khi vào phòng thi.
   - Kích hoạt toàn bộ **lớp giám sát (Proctoring Shield)**:
     - Phát hiện chuyển tab / mất focus.
     - Phát hiện 2 khuôn mặt hoặc tiếng nói người thứ 2.
   - Kích hoạt **Multimodal Engine** phân tích real-time:
     - Eye-tracking (hướng nhìn).
     - Đếm từ thừa (filler words: "ừm", "à", "như là"...).
     - Phát hiện micro-expressions (căng thẳng, tự tin).
   - AI đánh giá khắt khe theo đúng level, không hint.
   - Đồng hồ đếm ngược, tính điểm chính xác.
   - Badge: "Giới hạn thời gian" | "Yêu cầu Webcam + Mic"

   ---

3. Click card → highlight border, lưu vào `interviewSetupSlice.selectedMode`.

4. **Nếu user chọn Combat Mode:**
   - Hiển thị thêm `<CombatModeWarningBox>` ngay bên dưới card (không phải modal riêng):
     ```
     ⚠️ Lưu ý khi thi Combat Mode
     • Trình duyệt sẽ yêu cầu quyền truy cập Webcam và Microphone.
     • Mọi sự kiện bất thường (chuyển tab, nhiều khuôn mặt...) sẽ được ghi lại
       dưới dạng cờ đỏ (Red Flag) để hậu kiểm — bạn sẽ KHÔNG bị đuổi ra khỏi
       phòng thi ngay lập tức.
     • Dữ liệu video KHÔNG được lưu trữ. Chỉ lưu JSON metadata phân tích.
     ```

5. Nút "Tiếp tục" chỉ active khi đã chọn mode → navigate sang Task 0.4.

---

## Task 0.3b: FE – Combat Mode Permission Gate

**Mô tả:** Nếu user chọn Combat Mode, cần xin quyền trình duyệt và kiểm tra thiết bị trước khi cho tiếp tục.

**Chi tiết công việc:**

1. Khi user bấm "Tiếp tục" với mode = `combat`:
   - Gọi `navigator.mediaDevices.getUserMedia({ video: true, audio: true })`.
   - **Success:** Lưu `mediaStream` vào ref (dùng cho Proctoring ở Epic 4), navigate tiếp.
   - **Error (Denied):** Hiển thị modal lỗi:
     ```
     ❌ Không thể vào Combat Mode
     Trình duyệt đã từ chối quyền Webcam/Microphone.
     Hãy cấp quyền trong cài đặt trình duyệt rồi thử lại,
     hoặc chuyển sang Practice Mode.
     [Thử lại] [Chuyển sang Practice Mode]
     ```

2. **Camera Preview nhỏ (400x300):**
   - Sau khi có permission: Hiển thị preview webcam trong 3 giây.
   - Chạy quick check: "Phát hiện 1 khuôn mặt ✓" (dùng MediaPipe Face Detection nhẹ).
   - Nếu không phát hiện mặt: Cảnh báo "Không nhận diện được khuôn mặt. Hãy điều chỉnh camera."

3. Sau khi pass permission gate → navigate sang Task 0.4 (Round Selection).

4. **Redux state bổ sung:**
   ```ts
   combatPermissions: {
     webcam: 'granted' | 'denied' | 'pending',
     microphone: 'granted' | 'denied' | 'pending',
     faceDetected: boolean,
   }
   ```

---

## Task 0.4: FE – Round Selection Screen (Chọn vòng thi)

**Mô tả:** Màn hình cho phép user chọn 1 hoặc nhiều vòng thi để tham gia.

**Chi tiết công việc:**

1. Hiển thị 4 card vòng thi (dạng checkbox, multi-select):

   | Vòng | Tên | Mô tả ngắn | Thời gian ước tính |
   |------|-----|-------------|-------------------|
   | 2.1  | HR & Behavioral (STAR) | Đánh giá culture fit, xử lý tình huống qua cấu trúc STAR. AI dẫn dắt nếu bạn thiếu ý. | ~20 phút |
   | 2.2  | DSA & Live Coding | Giải thuật, Clean Code, Time/Space Complexity. Sandbox an toàn. | ~30 phút |
   | 2.3  | AI Prompting & Pair Programming | Đánh giá khả năng dùng AI Tool để debug và tư duy Chain-of-Thought. | ~20 phút |
   | 2.4  | System Design (Virtual Whiteboard) | Thiết kế kiến trúc bằng Drag & Drop. AI đọc JSON diagram. | ~30 phút |

2. Mỗi card gồm: Icon vòng, tên, badge độ khó, thời gian ước tính, mô tả 2-3 dòng.
3. Validation: Phải chọn ít nhất 1 vòng.
4. Hiển thị tổng thời gian ước tính ở footer dựa trên các vòng đã chọn.
5. **Lưu ý UX:** Các vòng chưa implement (2.2, 2.3, 2.4 nếu chưa done) hiển thị badge "Sắp ra mắt" và bị disabled.

---

## Task 0.5: BE – Khởi tạo Interview Session

**Mô tả:** Sau khi user xác nhận, BE tạo session với đầy đủ config. Combat mode tạo thêm record proctoring.

**Chi tiết công việc:**

1. Endpoint: `POST /api/interview/sessions/init`
2. Request body:
   ```json
   {
     "mode": "practice" | "combat",
     "rounds": ["hr_behavioral", "dsa", "ai_prompting", "system_design"],
     "candidateLevel": "junior" | "mid" | "senior"
   }
   ```
   - `candidateLevel` được BE tự suy ra từ `cv_context` trong Redis (dùng AI classification hoặc rule-based từ năm kinh nghiệm). FE không tự quyết level.
3. BE logic:
   - Đọc `cv_context:{userId}` và `jd_context:{userId}` từ Redis.
   - Classify `candidateLevel` từ cv_context (số năm kinh nghiệm, seniority keyword).
   - Tạo record `interview_sessions` với:
     ```
     mode, rounds (JSONB array), candidate_level, status=IN_PROGRESS
     cv_context_snapshot (copy từ Redis để tránh mất khi TTL expire)
     jd_context_snapshot
     ```
   - **Nếu mode = `combat`:** Tạo thêm record `proctoring_sessions` (xem Epic 4) liên kết với `interview_session_id`.
   - Trả về `{ sessionId, candidateLevel, estimatedDuration, proctoringSessionId? }`.
4. FE nhận `sessionId` → lưu vào Redux → navigate sang giao diện vòng thi đầu tiên đã chọn.
   - Nếu combat: FE cũng bắt đầu khởi động `MultimodalEngine` và `ProctoringShield` (xem Epic 3, 4).

**DB Schema bổ sung cho `interview_sessions`:**
```sql
ALTER TABLE interview_sessions ADD COLUMN mode VARCHAR(10) NOT NULL DEFAULT 'practice';
ALTER TABLE interview_sessions ADD COLUMN rounds JSONB NOT NULL DEFAULT '[]';
ALTER TABLE interview_sessions ADD COLUMN candidate_level VARCHAR(10);
ALTER TABLE interview_sessions ADD COLUMN cv_context_snapshot TEXT;
ALTER TABLE interview_sessions ADD COLUMN jd_context_snapshot TEXT;
```

---

## Quản trị rủi ro

| Rủi ro | Giải pháp |
|--------|-----------|
| Redis TTL hết hạn giữa chừng (user để màn hình lâu) | `cv_context_snapshot` đã copy vào DB ở Task 0.5, session không bị ảnh hưởng |
| User bypass FE và gọi thẳng `/sessions/init` thiếu context | BE luôn validate Redis trước khi init, trả 400 nếu thiếu |
| `candidateLevel` classify sai | Hiển thị cho user xác nhận level ở bước cuối của modal (dropdown chọn tay nếu muốn override) |
| Trình duyệt từ chối quyền Webcam/Mic giữa chừng (iOS Safari hạn chế) | Permission Gate ở Task 0.3b bắt lỗi sớm, fallback rõ ràng sang Practice Mode |
| User chọn Combat Mode nhưng thiết bị không có webcam | Quick device check trong Permission Gate, hiển thị lỗi cụ thể |
