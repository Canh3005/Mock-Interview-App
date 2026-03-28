# Kỹ thuật 1: Socratic Depth-First Probing

## 1. Phân tích vấn đề

### Hành vi hiện tại

Trong `behavioral-session.service.ts`, anchor advancement dựa trên **turn count**:

```typescript
// Hiện tại: advance anchor mỗi 2 user turns
if (userTurnCount % 2 === 0 && isRelevant) {
  coveredCompetencies.push(currentAnchor.id);
}
```

Điều này nghĩa là dù candidate trả lời surface-level hay deep-level, AI đều chuyển anchor sau 2 turns. Interviewer thật không làm vậy.

### Hành vi mong muốn (Interviewer thật)

```
Candidate: "Tôi đã optimize database..."
Interviewer: "Optimize cụ thể bằng cách nào?"              ← drill level 1
Candidate: "Thêm index cho các query chậm"
Interviewer: "Tại sao chọn index thay vì materialized view?" ← drill level 2
Candidate: "Vì... em không biết materialized view"
Interviewer: "Okay, understood. [chuyển topic]"              ← candidate breaks → move on
```

Kỹ thuật này gọi là **Depth-First Probing** — một dạng của Socratic method áp dụng trong phỏng vấn.

---

## 2. Thiết kế giải pháp

### 2.1 Core Concept: Depth Score

Thay vì đếm turns, AI sẽ **đánh giá depth** của câu trả lời sau mỗi turn:

```typescript
type DepthAssessment = {
  currentDepth: 'surface' | 'moderate' | 'deep' | 'expert';
  shouldProbeDeeper: boolean;
  suggestedAngle: string;  // gợi ý góc drill-down tiếp theo
  candidateReachedLimit: boolean;  // candidate tỏ ra không biết thêm
};
```

### 2.2 Decision Flow

```
User trả lời
    ↓
[Assess Depth] → LLM mini model đánh giá depth
    ↓
┌─ depth = 'surface' + shouldProbeDeeper = true
│   → Drill deeper: hỏi follow-up theo suggestedAngle
│   → drill_count++
│
├─ depth = 'moderate'/'deep' + shouldProbeDeeper = true + drill_count < MAX_DRILL
│   → Drill deeper tiếp
│   → drill_count++
│
├─ candidateReachedLimit = true
│   → Stop drilling, mark competency, advance anchor
│   → Optional: provide brief teaching moment
│
└─ depth = 'deep'/'expert' + shouldProbeDeeper = false
    → Mark competency as "strong", advance anchor
```

### 2.3 Drill Depth Limits (per level)

```typescript
const MAX_DRILL_DEPTH: Record<CandidateLevel, number> = {
  junior: 2,   // hỏi thêm tối đa 2 lần
  mid: 3,      // hỏi thêm tối đa 3 lần
  senior: 4,   // hỏi thêm tối đa 4 lần
};
```

### 2.4 Prompt Injection cho Drill Mode

Khi AI cần drill deeper, inject thêm instruction vào system prompt:

```
[Chế độ Drill-Down — Lượt ${drill_count}/${max_drill}]
Câu trả lời trước của ứng viên ở mức "${currentDepth}".
Góc drill-down gợi ý: "${suggestedAngle}"

Hãy hỏi một câu follow-up cụ thể hơn, đào sâu vào khía cạnh trên.
KHÔNG chuyển sang topic mới. KHÔNG khen trước khi drill.
Giữ câu hỏi ngắn (1-2 câu), trực tiếp, chuyên nghiệp.
```

---

## 3. Implementation Plan

### 3.1 Files cần tạo mới

| File | Mục đích |
|---|---|
| `server/src/behavioral/depth-assessor.service.ts` | Service đánh giá depth, quyết định drill/advance |

### 3.2 Files cần sửa

| File | Thay đổi |
|---|---|
| `behavioral-session.service.ts` | Thay logic advance-by-turn-count bằng advance-by-depth |
| `question-orchestrator.service.ts` | Thêm `drill_count` tracking, `MAX_DRILL_DEPTH` config |
| `prompt-builder.service.ts` | Thêm `buildDrillInstruction()` method |
| `competency-anchors.constant.ts` | Thêm `drillAngles: string[]` vào interface CompetencyAnchor |

### 3.3 Chi tiết implementation

#### A. `depth-assessor.service.ts` (file mới)

```typescript
@Injectable()
export class DepthAssessorService {
  constructor(private groqService: GroqService) {}

  async assessDepth(
    competency: string,
    question: string,
    answer: string,
    previousDrillCount: number,
    maxDrill: number,
    candidateLevel: CandidateLevel,
  ): Promise<DepthAssessment> {
    const prompt = `
Bạn là expert đánh giá độ sâu câu trả lời phỏng vấn.

Competency đang đánh giá: ${competency}
Câu hỏi: ${question}
Câu trả lời: ${answer}
Số lần đã drill: ${previousDrillCount}/${maxDrill}
Level ứng viên: ${candidateLevel}

Đánh giá và trả về JSON:
{
  "currentDepth": "surface|moderate|deep|expert",
  "shouldProbeDeeper": true/false,
  "suggestedAngle": "góc cụ thể để drill tiếp (nếu shouldProbeDeeper=true)",
  "candidateReachedLimit": true/false
}

Quy tắc:
- "surface": câu trả lời chung chung, thiếu chi tiết cụ thể
- "moderate": có chi tiết nhưng chưa giải thích WHY hoặc trade-offs
- "deep": giải thích rõ WHY, có trade-off analysis, có ví dụ thực tế
- "expert": thể hiện kiến thức vượt expectations cho level này
- candidateReachedLimit=true khi: trả lời "không biết", lặp lại ý cũ, hoặc đưa thông tin sai
- Với junior, "moderate" có thể đủ tốt. Với senior, cần "deep" trở lên.
`;

    // Dùng mini model cho tốc độ (chạy song song với stream response)
    const result = await this.groqService.generateContent(prompt, {
      model: 'llama-3.1-8b-instant',
      maxTokens: 150,
      temperature: 0.1,
    });

    return this.parseAssessment(result);
  }
}
```

#### B. Sửa `behavioral-session.service.ts`

Thay thế logic advance-by-turn-count:

```typescript
// TRƯỚC (turn-based):
if (userTurnCount % 2 === 0 && isRelevant) {
  coveredCompetencies.push(currentAnchor.id);
}

// SAU (depth-based):
const assessment = await this.depthAssessor.assessDepth(
  currentAnchor.competency,
  currentQuestion,
  userMessage,
  session.drillCounts[currentAnchor.id] || 0,
  MAX_DRILL_DEPTH[session.candidateLevel],
  session.candidateLevel,
);

if (assessment.candidateReachedLimit || !assessment.shouldProbeDeeper) {
  // Advance: candidate đã đạt giới hạn hoặc trả lời đủ sâu
  coveredCompetencies.push(currentAnchor.id);
  session.drillCounts[currentAnchor.id] = 0;
} else {
  // Drill deeper: inject drill instruction vào next response
  session.drillCounts[currentAnchor.id] =
    (session.drillCounts[currentAnchor.id] || 0) + 1;
  session.currentDrillContext = {
    angle: assessment.suggestedAngle,
    depth: assessment.currentDepth,
    count: session.drillCounts[currentAnchor.id],
  };
}
```

#### C. Sửa `prompt-builder.service.ts`

Thêm method `buildDrillInstruction`:

```typescript
buildDrillInstruction(drillContext: {
  angle: string;
  depth: string;
  count: number;
  maxDrill: number;
}): string {
  return `
[Chế độ Drill-Down — Lượt ${drillContext.count}/${drillContext.maxDrill}]
Câu trả lời trước ở mức "${drillContext.depth}".
Góc drill-down: "${drillContext.angle}"

Yêu cầu:
- Hỏi follow-up cụ thể hơn, đào sâu vào góc trên
- KHÔNG chuyển sang topic mới
- KHÔNG khen trước khi probe
- Giữ câu hỏi 1-2 câu, trực tiếp
- Nếu ứng viên tỏ ra không biết, acknowledge và chuyển topic một cách tự nhiên
`;
}
```

#### D. Sửa `CompetencyAnchor` interface

```typescript
interface CompetencyAnchor {
  // ... existing fields
  drillAngles?: string[];  // Gợi ý các góc drill-down cho anchor này
}

// Ví dụ cho TECH_UNDERSTANDING:
{
  id: 'TECH_UNDERSTANDING',
  competency: 'Technical Fundamentals',
  drillAngles: [
    'Tại sao chọn công nghệ/approach này thay vì alternative?',
    'Trade-off chính của approach này là gì?',
    'Trong điều kiện nào approach này sẽ fail?',
    'Cách debug/monitor approach này trong production?',
  ],
}
```

---

## 4. Data Flow tổng thể

```
User trả lời
    ↓
[assessDepth()] ←── chạy song song ──→ [streamFacilitatorResponse()]
    ↓                                        ↓
DepthAssessment                         AI Response (streamed)
    ↓
┌─ shouldProbeDeeper?
│  YES → save drillContext → inject drill instruction vào NEXT turn
│  NO  → advance anchor → clear drillContext
└─ candidateReachedLimit?
   YES → advance + optional teaching moment
```

**Key insight:** `assessDepth()` chạy **song song** với `streamFacilitatorResponse()` để không tăng latency. Kết quả depth chỉ ảnh hưởng đến turn **tiếp theo**, không phải turn hiện tại.

---

## 5. Đánh giá

### Pros
- Tạo cảm giác "bị challenge" giống phỏng vấn thật
- Phân biệt rõ candidate giỏi vs candidate chỉ biết surface
- Không tăng latency (depth assessment chạy song song)
- Backward compatible — nếu depth assessment fail, fallback về turn-based

### Cons
- Thêm 1 LLM call per turn (mini model, ~50-100ms)
- Cần tune prompt cho depth assessment để tránh over-drilling
- `drillAngles` cần curate cho từng anchor (manual effort)

### Risks
- Over-drilling: candidate bị hỏi quá nhiều → frustrating. Mitigation: `MAX_DRILL_DEPTH` cap
- Depth assessment sai: LLM đánh giá "surface" cho câu trả lời thực ra đã đủ. Mitigation: temperature thấp (0.1), clear rubric trong prompt

### Metrics đo lường
- **Avg drill depth per competency**: target 1.5-2.5 cho mid level
- **Candidate satisfaction** (survey): so sánh trước/sau
- **Depth variance**: candidate giỏi nên có avg depth cao hơn candidate yếu
- **Time per competency**: không nên tăng quá 50% so với turn-based

---

## 6. Tài liệu tham khảo

- **Socratic Method in Education**: Paul & Elder (2006) — Critical Thinking framework
- **Depth-First Interview Technique**: Used by Google, Amazon bar raiser methodology
- **Adaptive Testing (CAT)**: Computerized Adaptive Testing — cùng concept nhưng cho multiple choice
- **Paper**: "Interview Coach: Using LLMs to Practice Behavioral Interviews" (2023)
