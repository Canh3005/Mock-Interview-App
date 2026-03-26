# Epic 1.6: B2B Structured Interview Platform – Template-Driven Assessment

> **Scope:** Mở rộng hệ thống behavioral interview thành nền tảng B2B, cho phép các công ty tạo interview template riêng, đánh giá candidate của họ một cách nhất quán và có thể defend được với HR/legal. Epic này build trực tiếp trên `QuestionOrchestratorService` đã tách biệt ở Epic 1.5.

---

## Bối cảnh & Động lực

Epic 1.5 đã xây `QuestionOrchestratorService` với một input source duy nhất: `COMPETENCY_ANCHORS` constant (hardcoded, dùng cho B2C practice). Epic 1.6 thêm một input source thứ hai: `InterviewTemplate` entity do công ty tự định nghĩa.

**Điểm khác nhau cốt lõi giữa B2C Practice và B2B Assessment:**

| Khía cạnh | B2C Practice (Epic 1, 1.5) | B2B Assessment (Epic 1.6) |
|-----------|---------------------------|--------------------------|
| Mục tiêu | Candidate cải thiện kỹ năng | Công ty tuyển đúng người |
| Câu hỏi | Đa dạng, AI tự do | Nhất quán, theo template cố định |
| Scoring | Self-improvement, holistic | Comparative, match vs rubric — defensible |
| Ai cấu hình | System default | Công ty tự tạo template |
| Dữ liệu | Thuộc về candidate | Thuộc về công ty (candidate là object đánh giá) |
| Độ tự do AI | `freedomLevel: high` | `freedomLevel: low` hoặc `medium` |

**Nguyên tắc thiết kế:**
- `AIFacilitatorService` và `BehavioralSessionService` **không thay đổi**
- `QuestionOrchestratorService` thay đổi input source dựa theo `templateId`
- `ScoringService` thêm nhánh rubric-based song song với holistic eval hiện tại

---

## Task 1.6.1: BE – Interview Template Entity & Company Onboarding

**Mô tả:** Core data model cho B2B. Công ty tạo template định nghĩa competencies, câu hỏi bắt buộc, scoring rubrics và mức độ tự do của AI.

**DB Schema:**

```sql
-- Công ty sử dụng nền tảng
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,      -- dùng trong URL
  plan VARCHAR(20) DEFAULT 'trial',       -- trial | starter | pro | enterprise
  api_key VARCHAR(100) UNIQUE,            -- để tích hợp ATS
  settings JSONB DEFAULT '{}',           -- branding, notification prefs, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template phỏng vấn do công ty tạo
CREATE TABLE interview_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  name VARCHAR(200) NOT NULL,            -- "Senior Backend Engineer Interview"
  job_role VARCHAR(200),                 -- "Backend Engineer"
  target_level VARCHAR(10),              -- junior | mid | senior
  ai_freedom_level VARCHAR(10) DEFAULT 'medium',  -- low | medium | high
  is_active BOOLEAN DEFAULT TRUE,
  version INT DEFAULT 1,                 -- version khi template được update
  created_by UUID,                       -- user_id của HR/recruiter tạo template
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Các stage trong template (tương ứng với 6 stage mặc định)
CREATE TABLE template_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES interview_templates(id) ON DELETE CASCADE,
  stage_number INT NOT NULL,             -- 1..6
  stage_name VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,       -- Công ty có thể bỏ stage không cần
  min_competencies_required INT DEFAULT 1,
  ordering INT NOT NULL
);

-- Competency trong từng stage
CREATE TABLE template_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_stage_id UUID REFERENCES template_stages(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,            -- "Conflict Resolution"
  weight FLOAT DEFAULT 1.0,             -- Trọng số khi tính điểm stage
  is_mandatory BOOLEAN DEFAULT TRUE,    -- Bắt buộc hỏi hay optional
  evaluation_mode VARCHAR(30) NOT NULL  -- star_behavioral | technical_depth | reverse_interview
);

-- Câu hỏi bắt buộc của từng competency (AI có thể rephrase nhưng intent phải giữ)
CREATE TABLE template_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_id UUID REFERENCES template_competencies(id) ON DELETE CASCADE,
  intent TEXT NOT NULL,                 -- Mô tả intent để AI rephrase
  example_phrasing TEXT NOT NULL,       -- Câu hỏi mẫu tham khảo
  follow_up_scope TEXT,                 -- AI chỉ follow-up trong scope này
  ordering INT DEFAULT 0
);

-- Scoring rubric cho từng competency
CREATE TABLE template_scoring_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_id UUID REFERENCES template_competencies(id) ON DELETE CASCADE,
  strong_signals TEXT[] NOT NULL,       -- Dấu hiệu câu trả lời tốt (8-10đ)
  average_signals TEXT[] NOT NULL,      -- Dấu hiệu câu trả lời trung bình (5-7đ)
  weak_signals TEXT[] NOT NULL,         -- Dấu hiệu câu trả lời yếu (1-4đ)
  red_flags TEXT[] DEFAULT '{}',        -- Tín hiệu cần reject
  example_strong_answer TEXT,           -- Ví dụ câu trả lời tốt để AI calibrate
  example_weak_answer TEXT
);
```

**API Endpoints (Company Admin Portal):**

```
POST   /api/b2b/templates              → Tạo template mới
GET    /api/b2b/templates              → Danh sách templates của công ty
GET    /api/b2b/templates/:id          → Chi tiết template
PUT    /api/b2b/templates/:id          → Cập nhật template
DELETE /api/b2b/templates/:id          → Xoá template (soft delete)

POST   /api/b2b/templates/:id/stages   → Thêm stage
PUT    /api/b2b/templates/:id/stages/:stageId → Sửa stage
POST   /api/b2b/templates/:id/stages/:stageId/competencies → Thêm competency + rubric
```

**Files cần tạo:**
- `server/src/b2b/entities/company.entity.ts`
- `server/src/b2b/entities/interview-template.entity.ts`
- `server/src/b2b/entities/template-stage.entity.ts`
- `server/src/b2b/entities/template-competency.entity.ts`
- `server/src/b2b/entities/template-question.entity.ts`
- `server/src/b2b/entities/template-scoring-rubric.entity.ts`
- `server/src/b2b/b2b.module.ts`
- `server/src/b2b/template.controller.ts`
- `server/src/b2b/template.service.ts`

---

## Task 1.6.2: BE – Template-Driven QuestionOrchestrator

**Mô tả:** Mở rộng `QuestionOrchestratorService` (từ Epic 1.5) để load anchors từ `InterviewTemplate` thay vì hardcoded constant khi session có `templateId`.

**Chi tiết công việc:**

1. **Sửa `QuestionOrchestratorService`** — thêm nhánh template-driven:

```ts
@Injectable()
export class QuestionOrchestratorService {

  async getNextAnchor(
    stage: number,
    level: CandidateLevel,
    coveredCompetencies: string[],
    conversationContext: string,
    templateId?: string,             // NEW: nếu có → load từ DB thay vì constant
  ): Promise<CompetencyAnchor | null> {

    const anchors = templateId
      ? await this.loadAnchorsFromTemplate(templateId, stage)
      : this.loadAnchorsFromConstant(stage, level); // B2C path (Epic 1.5)

    // Logic chọn anchor tiếp theo giữ nguyên
    return this.selectNextUncoveredAnchor(anchors, coveredCompetencies);
  }

  private async loadAnchorsFromTemplate(
    templateId: string,
    stage: number,
  ): Promise<CompetencyAnchor[]> {
    // Load từ template_competencies + template_questions
    // Map sang CompetencyAnchor interface để AI Facilitator không đổi gì
  }
}
```

2. **Sửa `BehavioralSession`** — thêm optional `templateId`:

```sql
ALTER TABLE behavioral_sessions
  ADD COLUMN template_id UUID REFERENCES interview_templates(id);
-- null = B2C practice session (dùng default anchors)
-- not null = B2B assessment session (dùng template)
```

3. **Sửa `/start` endpoint** để nhận optional `templateId`:

```ts
// StartSessionDto
class StartSessionDto {
  interviewSessionId: string;
  templateId?: string;  // NEW
}
```

4. **Freedom Level injection** — khi `templateId` có mặt, đọc `ai_freedom_level` từ template và inject vào persona block:

```ts
// freedomLevel: 'low'
const freedomConstraint = {
  low:    'Hỏi sát với câu hỏi được chỉ định. Không sáng tạo câu hỏi mới. ' +
          'Follow-up chỉ trong scope được mô tả cho mỗi câu.',
  medium: 'Có thể điều chỉnh cách hỏi cho tự nhiên, nhưng giữ nguyên intent. ' +
          'Follow-up tự do trong phạm vi competency.',
  high:   '', // B2C default, không thêm constraint
}[template.ai_freedom_level];
```

**Files cần sửa:**
- `server/src/behavioral/question-orchestrator.service.ts`
- `server/src/behavioral/behavioral-session.service.ts`
- `server/src/behavioral/dto/start-session.dto.ts`
- Migration SQL thêm `template_id` vào `behavioral_sessions`

---

## Task 1.6.3: BE – Rubric-Based Scoring Engine

**Mô tả:** Thêm nhánh scoring mới cho B2B sessions — thay vì AI đánh giá holistic từ đầu (B2C), AI match câu trả lời của candidate vào rubric signals do công ty định nghĩa. Kết quả consistent và defensible hơn.

**Chi tiết công việc:**

1. **Sửa `ScoringService`** — thêm nhánh based trên `templateId`:

```ts
async evaluateSession(sessionId: string): Promise<FinalScore> {
  const session = await this.getSession(sessionId);

  return session.templateId
    ? this.evaluateWithRubric(session)      // B2B path
    : this.evaluateHolistic(session);       // B2C path (hiện tại)
}
```

2. **`evaluateWithRubric()` — Scoring Prompt cho B2B:**

```
System: "Bạn là một Hiring Manager đang đánh giá candidate cho vị trí {jobRole} tại {companyName}."

Context:
- Candidate level: {level}
- CV: {cvSnapshot}
- JD: {jdSnapshot}

Với mỗi competency dưới đây, hãy:
1. Đọc câu trả lời của candidate trong transcript
2. So sánh với rubric signals được cung cấp
3. Trả về điểm số và dẫn chứng trực tiếp từ lời candidate

COMPETENCY: {competency.name}
RUBRIC:
  Strong signals (8-10đ): {rubric.strong_signals}
  Average signals (5-7đ): {rubric.average_signals}
  Weak signals (1-4đ):    {rubric.weak_signals}
  Red flags:              {rubric.red_flags}
TRANSCRIPT: {stageTranscript}

Output JSON:
{
  "competency_id": "...",
  "score": 0-100,
  "matched_signals": ["signal A từ rubric", "signal B"],
  "missed_signals": ["signal C candidate chưa đề cập"],
  "red_flags_triggered": [],
  "evidence_quote": "Trích dẫn trực tiếp từ candidate"
}
```

3. **Aggregate competency scores → stage scores → total:**

```ts
// Mỗi competency có weight trong template
stageScore = competencies.reduce(
  (sum, c) => sum + (c.score * c.weight), 0
) / totalWeight;
```

4. **`RubricFinalScore` interface** (extends `FinalScore`):

```ts
interface RubricFinalScore extends FinalScore {
  template_id: string;
  template_version: number;
  competency_scores: {
    [competencyId: string]: {
      score: number;
      matched_signals: string[];
      missed_signals: string[];
      red_flags_triggered: string[];
      evidence_quote: string;
    }
  };
  hire_recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no';
  percentile_rank?: number;  // So sánh với các candidate khác cùng template (nếu đủ data)
}
```

**Files cần sửa:**
- `server/src/behavioral/scoring.service.ts`
- `server/src/behavioral/entities/behavioral-session.entity.ts`

---

## Task 1.6.4: BE – Assessment Session Management (B2B Flow)

**Mô tả:** B2B có flow khác với B2C: công ty tạo "assessment link" gửi cho candidate, candidate join qua link, kết quả về cho HR chứ không phải candidate.

**Chi tiết công việc:**

1. **`AssessmentInvitation` entity:**

```sql
CREATE TABLE assessment_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES interview_templates(id),
  company_id UUID REFERENCES companies(id),
  candidate_email VARCHAR(255) NOT NULL,
  candidate_name VARCHAR(200),
  token VARCHAR(100) UNIQUE NOT NULL,   -- Token trong invitation link
  status VARCHAR(20) DEFAULT 'pending', -- pending | in_progress | completed | expired
  expires_at TIMESTAMPTZ NOT NULL,
  behavioral_session_id UUID REFERENCES behavioral_sessions(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

2. **API Endpoints:**

```
POST /api/b2b/assessments/invite
  Body: { templateId, candidateEmail, candidateName, expiresInHours }
  → Tạo invitation, gửi email cho candidate với link

GET  /api/b2b/assessments/join/:token
  → Candidate mở link → validate token → tạo session với templateId → redirect vào phòng thi

GET  /api/b2b/assessments/:invitationId/result
  → HR xem kết quả sau khi candidate hoàn thành

GET  /api/b2b/assessments
  → Danh sách tất cả assessments của công ty (với filter, pagination)

GET  /api/b2b/assessments/compare
  Query: candidateIds[]
  → So sánh nhiều candidate cùng một template
```

3. **Candidate anonymization option:** Công ty có thể bật blind review — HR chỉ thấy kết quả, không thấy tên candidate cho đến khi quyết định shortlist.

**Files cần tạo:**
- `server/src/b2b/entities/assessment-invitation.entity.ts`
- `server/src/b2b/assessment.controller.ts`
- `server/src/b2b/assessment.service.ts`

---

## Task 1.6.5: FE – Company Admin Portal

**Mô tả:** Dashboard cho HR/Recruiter của công ty để tạo template, gửi invitation, xem kết quả.

**Chi tiết công việc:**

1. **Template Builder UI:**
   - Wizard 3 bước: Thông tin cơ bản → Cấu hình stages & competencies → Review & Publish
   - Drag-and-drop để sắp xếp thứ tự stage/competency
   - Editor để nhập rubric signals (dạng list, mỗi dòng 1 signal)
   - Preview mode: Xem template như candidate sẽ trải qua

2. **Assessment Dashboard:**
   - Bảng danh sách candidates với status (pending/in_progress/completed)
   - Khi click vào candidate → xem `RubricFinalScore` với evidence quotes
   - **Compare view:** Xếp 2-4 candidates cạnh nhau theo từng competency
   - Export kết quả ra CSV/PDF

3. **Candidate-facing flow:**
   - Trang join từ invitation link: Xác nhận tên, đọc hướng dẫn, bắt đầu
   - Phòng thi giống B2C nhưng không hiển thị STAR guide (tránh gợi ý)
   - Sau khi xong: Thông báo "Kết quả sẽ được gửi đến [company]", không show score

**Files cần tạo:**
- `client/apps/web/src/pages/company/` — Admin portal pages
- `client/apps/web/src/components/template-builder/` — Template builder components
- `client/apps/web/src/components/assessment-dashboard/` — Results dashboard

---

## Task 1.6.6: Data & Analytics

**Mô tả:** Càng nhiều assessment được chạy qua cùng một template, hệ thống càng có dữ liệu để calibrate và cung cấp benchmark.

**Chi tiết công việc:**

1. **Per-template analytics:**
   - Phân phối điểm tất cả candidates theo từng competency
   - Competency nào có variance cao nhất (phân hoá giỏi/kém tốt nhất)
   - Thời gian trả lời trung bình per stage

2. **Percentile ranking:**
   - Khi ≥ 10 assessments cùng template: Tính percentile cho mỗi candidate mới
   - Hiển thị trên scorecard: "Điểm Conflict Resolution của bạn ở top 20% trong 34 candidates đã thi"

3. **Question effectiveness:** Track câu hỏi nào của AI (dựa trên anchor) phân hoá candidate tốt nhất → gợi ý HR điều chỉnh rubric.

```sql
CREATE TABLE assessment_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES interview_templates(id),
  competency_id UUID REFERENCES template_competencies(id),
  session_id UUID REFERENCES behavioral_sessions(id),
  score FLOAT NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Kiến trúc luồng dữ liệu tổng quan

```
HR tạo Template
      ↓
HR gửi Invitation → candidate nhận email với link
      ↓
Candidate click link → join assessment session
      │
      │  BehavioralSession (với templateId)
      │        ↓
      │  QuestionOrchestrator.loadAnchorsFromTemplate()
      │        ↓
      │  AIFacilitator (freedomLevel từ template)
      │        ↓
      │  [Interview diễn ra]
      │        ↓
      │  ScoringService.evaluateWithRubric()
      ↓
HR xem RubricFinalScore + evidence quotes
HR compare candidates
HR export report
```

---

## Thứ tự implement

```
1.6.1 (Schema + Company Onboarding)     ← Foundation
    ↓
1.6.2 (Template-Driven Orchestrator)    ← Core logic, cần Schema xong
    ↓
1.6.3 (Rubric-Based Scoring)            ← Cần Orchestrator biết templateId
    ↓
1.6.4 (Assessment Session Management)   ← Cần Scoring xong
    ↓
1.6.5 (Company Admin Portal FE)         ← Cần tất cả BE APIs
    ↓
1.6.6 (Analytics)                       ← Cuối cùng, cần data từ real sessions
```

---

## Quản trị rủi ro

| Rủi ro | Giải pháp |
|--------|-----------|
| Công ty xây rubric kém chất lượng → scoring không có giá trị | Cung cấp rubric template mẫu theo industry standard. Sau 10 sessions, highlight competencies có variance thấp bất thường (rubric quá dễ/khó). |
| Candidate share câu hỏi của nhau (câu hỏi lộ) | AI rephrase từ intent nên câu surface form luôn khác nhau. Core intent giữ nguyên nhưng candidate không biết exact wording trước. |
| AI Facilitator bị influence bởi template freedom level | Freedom level được inject vào system prompt — test kỹ với `low` level để đảm bảo AI không sáng tạo ra câu hỏi ngoài scope. |
| Data isolation giữa các company | Row-level security trên tất cả B2B tables: `company_id` là mandatory filter trong mọi query. Mỗi company chỉ thấy data của mình. |
| Template version drift — công ty update template khi đang có session in-progress | `behavioral_sessions` lưu `template_version` tại thời điểm start. Session luôn dùng version đã lock, không bị ảnh hưởng bởi update mới. |
| So sánh candidates không fair nếu AI hỏi khác nhau | Với `freedomLevel: low`, AI constraint chặt theo intent → surface form khác nhau nhưng competency được test là như nhau. Ghi lại actual question AI đã hỏi vào log để audit. |
