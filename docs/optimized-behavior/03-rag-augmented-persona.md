# Kỹ thuật 3: RAG-Augmented Persona

## 1. Phân tích vấn đề

### Hành vi hiện tại

Tất cả câu hỏi phỏng vấn đều sinh từ LLM dựa trên:
1. `CompetencyAnchor.exampleQuestion` — hard-coded, 1 câu per anchor
2. `CompetencyAnchor.intent` + `scope` — LLM reformulate thành câu hỏi
3. `cvSnapshot` — personalize theo CV candidate

```typescript
// prompt-builder.service.ts - buildFirstQuestion()
// "Rephrase anchor intent thành câu hỏi tự nhiên, không đọc nguyên văn"
```

**Vấn đề:**
- Câu hỏi dễ đoán trước sau vài lần sử dụng
- Thiếu "mùi" phỏng vấn thật — không có câu hỏi kiểu "trick question" hay curveball
- LLM sinh câu hỏi từ description → academic tone, không như người thật hỏi
- Không có variety — cùng anchor luôn sinh câu hỏi tương tự

### Hành vi mong muốn

Interviewer thật có **kho câu hỏi tích lũy qua kinh nghiệm**, không phải sinh câu hỏi từ competency description. Họ:
- Nhớ câu hỏi hay từ đồng nghiệp
- Adapt câu hỏi kinh điển theo context candidate
- Có "signature questions" riêng
- Mix giữa standard questions và curveball

---

## 2. Thiết kế giải pháp

### 2.1 Core Concept: Question Bank + Semantic Retrieval

```
Real Interview Questions DB
         ↓
[Vector Embedding] (mỗi câu hỏi → embedding vector)
         ↓
Khi cần hỏi về competency X:
  → Retrieve top-K câu hỏi tương tự từ DB
  → Filter theo level, stage, domain
  → LLM reformulate theo CV/JD context
         ↓
Câu hỏi có "mùi" thật, không AI-generated feel
```

### 2.2 Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  Data Pipeline                   │
│                                                  │
│  Sources:                                        │
│  - Curated question banks (Glassdoor, LeetCode)  │
│  - Internal interview transcripts (nếu có)       │
│  - Industry-specific question sets               │
│  - Community contributions                       │
│                                                  │
│  Processing:                                     │
│  - Clean & deduplicate                           │
│  - Classify: stage, level, competency, domain    │
│  - Generate embeddings                           │
│  - Quality scoring                               │
│                                                  │
│  Storage:                                        │
│  - PostgreSQL + pgvector extension               │
│  - OR Pinecone/Qdrant (managed)                  │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│              Retrieval Service                   │
│                                                  │
│  Input: competency anchor + candidate context    │
│  Process:                                        │
│  1. Embed query (anchor intent + CV snippet)     │
│  2. Similarity search (cosine, top-5)            │
│  3. Re-rank by: level match, domain relevance    │
│  4. Deduplicate against already-asked questions   │
│                                                  │
│  Output: ranked list of reference questions      │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│           Question Reformulation (LLM)           │
│                                                  │
│  Input: reference questions + CV + JD + stage    │
│  Process:                                        │
│  - Pick best reference question                  │
│  - Adapt to candidate's specific experience      │
│  - Maintain conversational tone                  │
│  - Preserve difficulty level                     │
│                                                  │
│  Output: personalized, natural question          │
└─────────────────────────────────────────────────┘
```

---

## 3. Implementation Plan

### 3.1 Phase A: Data Infrastructure

#### A1. Database Schema — pgvector

Dùng PostgreSQL extension `pgvector` (đã có PostgreSQL trong stack):

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Question bank table
CREATE TABLE interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,                    -- câu hỏi gốc
  content_embedding vector(384),            -- embedding vector (all-MiniLM-L6-v2 = 384 dims)

  -- Classification
  stage INTEGER NOT NULL,                   -- 1-6
  competency VARCHAR(50) NOT NULL,          -- mapped to CompetencyAnchor.id
  applicable_levels VARCHAR(20)[] NOT NULL, -- ['junior', 'mid', 'senior']
  domain VARCHAR(50),                       -- 'frontend', 'backend', 'devops', 'general'
  question_type VARCHAR(30) NOT NULL,       -- 'behavioral', 'technical', 'situational', 'curveball'

  -- Metadata
  source VARCHAR(100),                      -- 'glassdoor', 'internal', 'community'
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
  quality_score FLOAT DEFAULT 0.0,          -- 0-1, curated quality
  times_used INTEGER DEFAULT 0,
  avg_candidate_rating FLOAT,              -- feedback từ candidate

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Vector similarity search index
CREATE INDEX idx_question_embedding ON interview_questions
  USING ivfflat (content_embedding vector_cosine_ops)
  WITH (lists = 100);

-- Composite index for filtering
CREATE INDEX idx_question_filter ON interview_questions (stage, competency, question_type);
```

#### A2. Seed Data — Question Curation

```typescript
// server/src/question-bank/seed-questions.ts
const SEED_QUESTIONS: SeedQuestion[] = [
  // Stage 1: Culture Fit
  {
    content: 'Kể cho mình nghe về một lần bạn phải làm việc với một teammate mà cách làm việc rất khác bạn. Bạn handle thế nào?',
    stage: 1,
    competency: 'CULT_CONFLICT',
    applicableLevels: ['junior', 'mid', 'senior'],
    questionType: 'behavioral',
    difficulty: 2,
    source: 'curated',
  },
  {
    content: 'Nếu bạn join team và phát hiện codebase quality rất tệ, bạn sẽ approach việc cải thiện thế nào mà không làm mất lòng team hiện tại?',
    stage: 1,
    competency: 'CULT_CULTURE_SHAPE',
    applicableLevels: ['senior'],
    questionType: 'situational',
    difficulty: 4,
    source: 'curated',
  },

  // Stage 2: Tech Stack
  {
    content: 'Giải thích cho mình tại sao bạn chọn [tech từ CV] cho project đó thay vì [alternative phổ biến]? Nếu làm lại, bạn có chọn khác không?',
    stage: 2,
    competency: 'TECH_TRADEOFF',
    applicableLevels: ['mid', 'senior'],
    questionType: 'technical',
    difficulty: 3,
    source: 'curated',
  },

  // Curveball questions
  {
    content: 'Bạn có thể mô tả một technical decision mà bạn đã đúng nhưng team không đồng ý, và cuối cùng bạn phải compromise? Bạn học được gì?',
    stage: 2,
    competency: 'TECH_TRADEOFF',
    applicableLevels: ['senior'],
    questionType: 'curveball',
    difficulty: 5,
    source: 'curated',
  },

  // ... 100+ questions per stage ideally
];
```

### 3.2 Phase B: Retrieval Service

#### B1. `question-bank.service.ts` (file mới)

```typescript
@Injectable()
export class QuestionBankService {
  constructor(
    @InjectRepository(InterviewQuestion)
    private questionRepo: Repository<InterviewQuestion>,
    private embeddingService: EmbeddingService,
  ) {}

  async retrieveQuestions(params: {
    competencyId: string;
    stage: number;
    level: CandidateLevel;
    cvContext: string;       // CV snippet cho semantic matching
    excludeIds?: string[];   // câu hỏi đã hỏi trong session này
    limit?: number;
  }): Promise<InterviewQuestion[]> {
    const { competencyId, stage, level, cvContext, excludeIds = [], limit = 5 } = params;

    // 1. Tạo query embedding từ competency + CV context
    const queryText = `${competencyId} interview question for ${level} candidate: ${cvContext}`;
    const queryEmbedding = await this.embeddingService.embed(queryText);

    // 2. Hybrid search: vector similarity + metadata filter
    const results = await this.questionRepo.query(`
      SELECT *,
        1 - (content_embedding <=> $1::vector) AS similarity
      FROM interview_questions
      WHERE stage = $2
        AND competency = $3
        AND $4 = ANY(applicable_levels)
        AND id != ALL($5::uuid[])
        AND quality_score >= 0.5
      ORDER BY similarity DESC
      LIMIT $6
    `, [
      JSON.stringify(queryEmbedding),
      stage,
      competencyId,
      level,
      excludeIds,
      limit,
    ]);

    return results;
  }

  async recordUsage(questionId: string, candidateRating?: number): Promise<void> {
    await this.questionRepo.increment({ id: questionId }, 'timesUsed', 1);
    if (candidateRating) {
      // Update running average
      const q = await this.questionRepo.findOne({ where: { id: questionId } });
      const newAvg = q.avgCandidateRating
        ? (q.avgCandidateRating * (q.timesUsed - 1) + candidateRating) / q.timesUsed
        : candidateRating;
      await this.questionRepo.update(questionId, { avgCandidateRating: newAvg });
    }
  }
}
```

#### B2. `embedding.service.ts` (file mới)

```typescript
@Injectable()
export class EmbeddingService {
  // Option 1: Dùng Groq/OpenAI embedding API
  // Option 2: Local embedding với @xenova/transformers (no API cost)

  // Recommend Option 2 cho cost efficiency:
  private pipeline: any;

  async onModuleInit() {
    const { pipeline } = await import('@xenova/transformers');
    this.pipeline = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',  // 384 dims, fast, good quality
    );
  }

  async embed(text: string): Promise<number[]> {
    const output = await this.pipeline(text, {
      pooling: 'mean',
      normalize: true,
    });
    return Array.from(output.data);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(t => this.embed(t)));
  }
}
```

### 3.3 Phase C: Integration với Existing Flow

#### C1. Sửa `question-orchestrator.service.ts`

```typescript
// TRƯỚC:
getNextAnchor(stage, level, coveredCompetencies) {
  // Return first uncovered anchor
}

// SAU — thêm method:
async getNextQuestion(params: {
  stage: number;
  level: CandidateLevel;
  coveredCompetencies: string[];
  cvSnapshot: string;
  askedQuestionIds: string[];
}): Promise<{
  anchor: CompetencyAnchor;
  referenceQuestion: InterviewQuestion | null;
}> {
  const anchor = this.getNextAnchor(params.stage, params.level, params.coveredCompetencies);
  if (!anchor) return { anchor: null, referenceQuestion: null };

  // Retrieve relevant questions từ bank
  const questions = await this.questionBank.retrieveQuestions({
    competencyId: anchor.id,
    stage: params.stage,
    level: params.level,
    cvContext: params.cvSnapshot.slice(0, 200),
    excludeIds: params.askedQuestionIds,
    limit: 3,
  });

  // Pick best match (highest similarity + quality)
  const best = questions[0] || null;

  return { anchor, referenceQuestion: best };
}
```

#### C2. Sửa `prompt-builder.service.ts` — buildFirstQuestion

```typescript
// TRƯỚC:
async buildFirstQuestion(level, stage, cvSnapshot) {
  // Rephrase anchor intent → câu hỏi
}

// SAU:
async buildFirstQuestion(
  level: CandidateLevel,
  stage: number,
  cvSnapshot: string,
  referenceQuestion?: InterviewQuestion,  // NEW param
): Promise<string> {
  const anchor = this.getFirstAnchor(level, stage);

  if (referenceQuestion) {
    // Có reference từ question bank → reformulate
    const prompt = `
Bạn là interviewer. Dựa trên câu hỏi tham khảo dưới đây,
tạo câu hỏi phỏng vấn phù hợp với ứng viên này.

Câu hỏi tham khảo: "${referenceQuestion.content}"
Competency cần đánh giá: ${anchor.competency}
Level ứng viên: ${level}
CV context: ${cvSnapshot.slice(0, 300)}

Yêu cầu:
- Giữ essence của câu hỏi tham khảo nhưng personalize theo CV
- Tone tự nhiên, conversational (không academic)
- 2-3 câu, mở đầu bằng context/warm-up nhẹ
- Tiếng Việt tự nhiên
`;
    return await this.generateWithFallback(prompt, anchor);
  }

  // Fallback: existing logic (rephrase from anchor)
  return await this.generateFromAnchor(level, stage, cvSnapshot, anchor);
}
```

---

## 4. Data Pipeline — Thu thập & Curation

### 4.1 Nguồn dữ liệu

| Nguồn | Số lượng estimate | Effort | Quality |
|---|---|---|---|
| **Manual curation** | 50-100 câu | Cao | Rất cao |
| **Glassdoor/Blind scraping** | 500-1000 câu | Trung bình | Trung bình (cần filter) |
| **LLM generation + human review** | 200-500 câu | Thấp | Trung bình-cao |
| **Community contribution** | Ongoing | Thấp | Variable |
| **Real session transcripts** | Ongoing | Tự động | Cao (real data) |

### 4.2 Quality Assurance Pipeline

```
Raw question
    ↓
[Dedup check] → cosine similarity > 0.9 với existing → skip
    ↓
[Auto-classify] → LLM classify: stage, competency, level, type
    ↓
[Quality score] → LLM rate 0-1 dựa trên:
  - Có open-ended không? (yes = +0.3)
  - Có require specific experience không? (yes = +0.2)
  - Có multiple valid answers không? (yes = +0.2)
  - Có reveal competency không? (yes = +0.3)
    ↓
[Human review] → quality_score >= 0.7 → auto-approve
                → quality_score 0.4-0.7 → queue for review
                → quality_score < 0.4 → reject
    ↓
[Embed & index] → generate embedding, insert to DB
```

### 4.3 Feedback Loop (dài hạn)

```
Session completes → candidate rates experience
    ↓
Map rating to questions asked in session
    ↓
Update avg_candidate_rating per question
    ↓
Questions with low rating → queue for review/replacement
Questions with high rating → boost quality_score
```

---

## 5. Files tổng hợp cần tạo/sửa

### Files mới

| File | Mục đích |
|---|---|
| `server/src/question-bank/question-bank.module.ts` | NestJS module |
| `server/src/question-bank/question-bank.service.ts` | Retrieval logic |
| `server/src/question-bank/embedding.service.ts` | Vector embedding |
| `server/src/question-bank/entities/interview-question.entity.ts` | TypeORM entity |
| `server/src/question-bank/seed/seed-questions.ts` | Initial question data |
| `server/src/question-bank/seed/seed-questions.command.ts` | CLI seeder |
| `server/src/question-bank/question-quality.service.ts` | Auto quality scoring |

### Files sửa

| File | Thay đổi |
|---|---|
| `question-orchestrator.service.ts` | Thêm `getNextQuestion()` method |
| `prompt-builder.service.ts` | Sửa `buildFirstQuestion()` nhận reference question |
| `behavioral-session.service.ts` | Track `askedQuestionIds`, pass reference question |
| `docker-compose.yml` | Thêm pgvector extension config |
| `package.json` | Thêm `@xenova/transformers` dependency |

### Infrastructure

| Component | Thay đổi |
|---|---|
| PostgreSQL | Enable `pgvector` extension |
| Migration | Tạo `interview_questions` table + vector index |

---

## 6. Đánh giá

### Pros
- Câu hỏi đa dạng, tự nhiên, khó đoán trước
- Tận dụng real-world interview knowledge
- Quality improves over time via feedback loop
- Giảm dependency vào LLM creativity (dùng LLM để reformulate, không generate from scratch)
- pgvector = không cần thêm infra mới (đã có PostgreSQL)

### Cons
- **Effort ban đầu cao**: cần curate 200+ câu hỏi chất lượng trước khi hệ thống hữu ích
- **Embedding model**: thêm dependency (`@xenova/transformers` ~200MB download lần đầu)
- **Maintenance**: question bank cần update theo industry trends
- **Cold start**: domain-specific questions (fintech, e-commerce...) cần data riêng

### Risks
- **Data quality**: garbage in → garbage out. Mitigation: quality scoring pipeline + human review
- **Embedding drift**: câu hỏi hay nhưng embedding không match intent. Mitigation: hybrid search (vector + metadata filter)
- **Over-reliance on bank**: AI chỉ reformulate mà mất khả năng tự sinh câu hỏi. Mitigation: 30% câu hỏi vẫn generate từ anchor (random mix)
- **Copyright**: câu hỏi từ Glassdoor/platforms có thể có IP issues. Mitigation: always reformulate, never use verbatim

### Metrics đo lường
- **Question diversity score**: unique questions per 100 sessions (target > 80%)
- **Naturalness rating**: candidate survey "Câu hỏi có tự nhiên không?" (1-5, target > 4.0)
- **Retrieval relevance**: % câu hỏi retrieved mà LLM actually sử dụng (target > 60%)
- **Question bank growth rate**: questions added/week
- **Candidate surprise factor**: "Có câu hỏi nào bất ngờ/thú vị không?" (qualitative)

---

## 7. Tài liệu tham khảo

- **RAG (Retrieval-Augmented Generation)**: Lewis et al., 2020 — "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"
- **pgvector**: PostgreSQL extension cho vector similarity search
- **all-MiniLM-L6-v2**: Sentence-BERT model, 384 dims, fast inference
- **SimulatED** (Microsoft Research, 2024): RAG-based educational simulation
- **Interview Coach** (Stanford, 2023): LLM-based interview practice with real question banks
