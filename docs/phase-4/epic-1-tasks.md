# Phase 4 - Epic 1: Candidate Profile & Personal Dashboard

## 1. Tổng quan (Overview)
**Mục tiêu Epic 1:** Xây dựng trung tâm quản trị hồ sơ cá nhân của người dùng, được gọi là **Skill Passport**. Cùng với đó là hệ thống **Static Context Storage** (lưu trữ bối cảnh tĩnh) để nạp dữ liệu hồ sơ/CV của ứng viên thành payload siêu nhẹ (JSON) vào System Prompt của LLM, giúp cá nhân hóa buổi phỏng vấn với độ trễ tối thiểu (< 200ms).

---

## 2. Chi tiết công việc (Detailed Tasks)

### 2.1. Backend & Database Architecture
- **Thiết kế Database Schema (PostgreSQL)**:
  - Tạo bảng/mô hình `user_profiles` để lưu thông tin tĩnh ngầm định: Thông tin cá nhân, định hướng công việc (Role, Thâm niên, Domain), danh sách kinh nghiệm làm việc, và hệ sinh thái kỹ năng (Tech Stack).
  - Tạo bảng/mô hình `user_skills_radar` hoặc tích hợp vào profile để lưu các chỉ số động (Dynamic metrics): Base scope 1-100 cho *System Design, DSA, Tiếng Anh chuyên ngành, Kỹ năng mềm*.
  - Tạo bảng `user_cvs` lưu trữ URL file gốc và **Parsed JSON Payload** để làm Static Context.
- **Xây dựng REST/GraphQL APIs**:
  - `GET /users/profile`: Lấy toàn bộ thông tin Skill Passport và dữ liệu Radar.
  - `PUT /users/profile`: Cập nhật các thông tin tĩnh/sửa đổi sau khi parse CV.
  - `POST /users/cv/upload`: Endpoint nhận file CV từ client (hỗ trợ .pdf, .docx).
- **Hệ thống CV/JD Parsing (Asynchronous/Background Worker)**:
  - **Vấn đề rủi ro:** Trích xuất CV/JD mất 10-15s, không thể block luồng chính.
  - **Giải pháp:** Sử dụng Message Queue (như BullMQ/RabbitMQ). Khi có file upload:
    1. Lưu file gốc (vào S3/Local Storage).
    2. Đưa job vào Queue phân loại (CV extraction job hoặc JD extraction job).
    3. Worker sử dụng PDF parser và AI nhỏ gọn (hoặc script) bóc tách kĩ năng, yêu cầu, kinh nghiệm thành định dạng JSON chuẩn.
    4. Cập nhật JSON schema vào DB (`user_cvs` hoặc `jd_analysis`) và ping/báo Notification cho Client (WebSocket hoặc Polling).
- **Static Context Storage (Tối ưu độ trễ)**:
  - Sử dụng **Redis Caching**: Sau khi CV được parse xong và chốt thông tin thành JSON payload, lưu ngay vào Redis với cấu trúc nhẹ nhất.
  - Lúc khởi tạo phòng thi, luồng Interview Service sẽ lấy trực tiếp JSON từ Redis để dán vào System Prompt => Đạt được độ trễ khởi tạo < 200ms.

### 2.2. Frontend (UI/UX)
- **Personal Dashboard & Routing**:
  - Tạo layout Dashboard chính rẽ nhánh từ app chính: Quản lý tổng quan về số session phỏng vấn, performance qua thời gian.
- **Skill Passport UI Component**:
  - **Tab Thông tin Tĩnh**: Form nhập/chỉnh sửa Kinh nghiệm làm việc, Tech Stack. Hỗ trợ tag input (ví dụ: gõ "React" -> tạo tag `React`).
  - **Tab Chỉ số Động (Radar Chart)**: 
    - Sử dụng library như `Recharts` (React) hoặc `Chart.js` để render Radar Chart chuyên nghiệp, ấn tượng (UI/UX Pro Max) thể hiện 4 trục: System Design, DSA, Tiếng Anh chuyên ngành, Kỹ năng mềm.
- **CV & JD Upload Flow & Realtime Feedback**:
  - Tạo cụm `Drag & Drop Zone` để upload CV và JD.
  - **UX/Loading states**: Khi upload, hiển thị progress spinner thông báo "Đang phân tích dữ liệu bởi AI... (10-15s)". Lúc này user vẫn có thể chuyển trang hoặc ở lại.
  - Khi background task xử lý xong, đối với CV: popup Toast và hệ thống tự động điền (autofill) các field tĩnh; đối với bản đánh giá CV-JD: hiển thị ngay Report so khớp. Người dùng review lại và ấn *Confirm*.

### 2.3. Trí tuệ Phân tích Bối cảnh (LLM Integration)
- **Context Injector Sub-system**:
  - Module trung gian nằm giữa hệ thống WebSocket/Interview và LLM. Thu thập cấu trúc: `[User Background JSON] + [Job Description (nếu có)]`.
  - Nén toàn bộ dưới dạng Markdown gọn nhẹ để tiết kiệm Input Tokens.
- **Cơ chế Fallback & Warm-up (Chuẩn bị cho Epic 2)**:
  - Viết logic phòng hờ: Nếu JSON từ CV rác/không rõ ràng, cấu hình prompt yêu cầu AI dạo đầu bằng 1-2 câu cơ bản chào hỏi và calibrate (định chuẩn) trình độ thay vì hỏi khó ngay lập tức.

---

## 3. Tiến trình Đề xuất (Implementation Roadmap)

1. **Step 1:** Setup Database Schema (Migrations) cho Profile & Caching Redis layer. (Backend)
2. **Step 2:** Xây dựng module Asynchronous CV Parsing Worker + Upload API. (Backend)
3. **Step 3:** Thiết kế & Implement Frontend Giao diện Skill Passport (với Radar Chart). (Frontend)
4. **Step 4:** Kết nối luồng Upload CV -> Polling nhận kết quả parse -> Tự động điền (Autofill) vào Form Frontend. (Fullstack)
5. **Step 5:** Cập nhật Service phỏng vấn (Interview Service): Tự động nạp JSON Context từ Redis vào Prompt của mô hình ngay trước khi websocket kết nối phòng thi. (AI/Backend)
6. **Step 6:** Benchmark & Testing: Đảm bảo độ trễ Tải phòng thi nằm trong ngân sách 200ms.
