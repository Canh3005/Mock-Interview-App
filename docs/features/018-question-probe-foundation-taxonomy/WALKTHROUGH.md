# WALKTHROUGH - Question Probe Foundation Taxonomy

## Entry Points

- Backend module: `QuestionBankModule`, được đăng ký trong `AppModule`.
- API taxonomy: `GET /question-bank/taxonomy`.
- API validate probe: `POST /question-bank/probes/validate`.

## Use Case Purpose

Taxonomy không phải dữ liệu hiển thị cho vui. Nó là bộ lựa chọn chuẩn để admin tạo probe đúng cấu trúc, candidate sau này lọc câu hỏi đúng nhu cầu, và AI selector chọn đúng câu hỏi cho session.

Ví dụ admin muốn tạo một probe cho `Backend Mid-level` để đo `System Thinking` ở vòng `Tech Stack Deep-Dive`. UI hoặc admin tool cần lấy taxonomy để:

- Render dropdown/choice chuẩn thay vì để admin nhập tự do `backend`, `Backend Dev`, `be`, hoặc `server`.
- Gắn probe với đúng role, level, stage, type, competency và difficulty để reviewer hiểu câu hỏi dùng cho ngữ cảnh nào.
- Cho public question bank sau này filter được câu hỏi theo role/level/type/competency.
- Cho AI selector sau này lọc hard constraints, ví dụ chỉ chọn probe `active`, đúng `stage`, đúng `level`, đúng `roleFamily`.
- Biết các locale hệ thống hỗ trợ trong `languages`; đây là danh sách locale cần có trong `localizedContent`, không phải field language riêng của probe.

## API Flow

1. Khi admin mở màn quản trị hoặc công cụ nhập probe, client gọi `GET /question-bank/taxonomy`.
2. `QuestionBankController` gọi `QuestionBankService` để trả về các option chuẩn: stage, role family, level, type, competency, difficulty-related values, supported language/locale, status và follow-up trigger.
3. Client dùng các option này để dựng filter, form editor, template JSON hoặc validation checklist cho curator.
4. Admin tạo payload probe với các key taxonomy chuẩn, ví dụ `roleFamilies: ["backend"]`, `levels: ["mid"]`, `competencies: ["system_thinking"]`.
5. Khi cần kiểm tra payload trước khi submit/review, client gọi `POST /question-bank/probes/validate`.
6. `QuestionProbeValidationService` trả `{ valid, issues }`; mỗi issue chỉ ra nhóm nào thiếu, ví dụ localized content, expected signals, red flags hoặc scoring hints.

## Code Path

- `question-bank.controller.ts`: expose taxonomy và validation endpoints.
- `question-bank.service.ts`: gom taxonomy và gọi validation service.
- `question-probe-validation.service.ts`: kiểm tra metadata, intent, primary question, signals, red flags, scoring hints, follow-ups và localized content.
- `constants/question-bank-taxonomy.constants.ts`: định nghĩa taxonomy canonical.
- `entities/question-probe.entity.ts`, `entities/interview-set.entity.ts`, `entities/question-probe-audit-log.entity.ts`: nền dữ liệu cho các feature curation phía sau.

## Guardrails

- Taxonomy dùng enum/list cố định để tránh FE, BE, admin content và AI selector hiểu lệch cùng một khái niệm.
- `languages` chỉ đại diện cho supported locale của nội dung hiển thị; nội dung thật vẫn nằm trong `localizedContent`.
- Validation trả lỗi theo field group, không chỉ trả generic failure.
- Feature này chưa có candidate UI; nó là foundation cho admin curation, public bank và AI selector ở các feature sau.
