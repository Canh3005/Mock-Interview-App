# Kỹ thuật 2: Cross-Stage Memory & Contradiction Detection

## 1. Phân tích vấn đề

### Hành vi hiện tại

`prompt-builder.service.ts` tạo stage summaries qua `buildStageSummary()`:

```typescript
// Hiện tại: tóm tắt 3 câu, inject vào prompt stage sau
async buildStageSummary(stageNumber, stageName, transcript): Promise<string> {
  // "Tóm tắt tối đa 3 câu: điểm mạnh, điểm yếu, chi tiết cá nhân hóa"
}

buildCandidateContextBlock(stageSummaries, currentStage): string {
  // Lấy max 2 stage summaries gần nhất, cap 1200 chars
}
```

**Vấn đề:** Summary chỉ là prose text dạng "Ứng viên trả lời tốt về X, yếu ở Y". Không có **structured claims** để so sánh cross-stage. AI không thể phát hiện:

- Stage 2: "Tôi thích làm việc độc lập, tự research"
- Stage 5: "Tôi thích môi trường collaborative, pair programming"
- → Interviewer thật: "Bạn có nhắc ở trên là thích independent work, nhưng giờ nói prefer collaboration — có thể clarify không?"

### Tại sao điều này quan trọng?

Khi interviewer nhớ và reference lại những gì candidate đã nói, candidate cảm thấy:
1. **Interviewer đang thực sự lắng nghe** (không phải bot)
2. **Consistency matters** — buộc candidate phải suy nghĩ kỹ hơn
3. **Deeper insights** — mâu thuẫn thường reveal giá trị thật của candidate

---

## 2. Thiết kế giải pháp

### 2.1 Core Concept: Structured Claims

Thay vì summary dạng prose, extract **claims** — những tuyên bố cụ thể mà candidate đã đưa ra:

```typescript
interface CandidateClaim {
  id: string;
  stageNumber: number;
  competency: string;
  claim: string;           // "Tôi prefer làm việc độc lập"
  category: ClaimCategory;
  confidence: 'stated' | 'implied';  // candidate nói trực tiếp hay suy ra
  originalQuote?: string;  // trích dẫn gốc (nếu có)
}

type ClaimCategory =
  | 'work_style'         // cách làm việc
  | 'technical_opinion'  // quan điểm kỹ thuật
  | 'experience_claim'   // tuyên bố về kinh nghiệm
  | 'value_statement'    // giá trị cá nhân/nghề nghiệp
  | 'self_assessment';   // tự đánh giá bản thân
```

### 2.2 Contradiction Detection Flow

```
Stage N kết thúc
    ↓
[extractClaims()] → Extract structured claims từ transcript
    ↓
[detectContradictions()] → So sánh claims mới với claims cũ (tất cả stages trước)
    ↓
┌─ Không có contradiction
│   → Inject enriched context vào stage N+1 (như hiện tại nhưng richer)
│
└─ Có contradiction
    → Inject contradiction hint vào system prompt stage N+1
    → AI sẽ hỏi về contradiction một cách tự nhiên (không accusatory)
```

### 2.3 Contradiction Hint Injection

```
[Ghi nhớ từ các giai đoạn trước — sử dụng tự nhiên, KHÔNG đọc nguyên văn]

Ứng viên đã chia sẻ:
- Stage 1: "Thích làm việc độc lập, tự research trước khi hỏi" (work_style)
- Stage 3: "Prefer pair programming và mob programming" (work_style)

⚠ Có sự khác biệt về work_style giữa stage 1 và stage 3.
Nếu phù hợp với câu hỏi hiện tại, hãy hỏi ứng viên reconcile sự khác biệt này.
Giữ tone tò mò (curious), KHÔNG phán xét (judgmental).
Ví dụ: "Mình nhớ anh/chị có chia sẻ là thích tự research.
        Vậy trong bối cảnh pair programming thì anh/chị balance thế nào?"
```

---

## 3. Implementation Plan

### 3.1 Files cần tạo mới

| File | Mục đích |
|---|---|
| `server/src/behavioral/claim-extractor.service.ts` | Extract structured claims từ transcript |
| `server/src/behavioral/contradiction-detector.service.ts` | So sánh claims cross-stage, phát hiện mâu thuẫn |

### 3.2 Files cần sửa

| File | Thay đổi |
|---|---|
| `prompt-builder.service.ts` | Sửa `buildCandidateContextBlock()` để inject contradiction hints |
| `behavioral-session.service.ts` | Gọi claim extraction + contradiction detection khi chuyển stage |

### 3.3 Schema changes

Thêm field vào `BehavioralSession` entity:

```typescript
// Thêm column mới
@Column('jsonb', { default: {} })
candidateClaims: Record<string, CandidateClaim[]>;  // key = stageNumber

@Column('jsonb', { default: [] })
detectedContradictions: Contradiction[];
```

### 3.4 Chi tiết implementation

#### A. `claim-extractor.service.ts` (file mới)

```typescript
@Injectable()
export class ClaimExtractorService {
  constructor(private groqService: GroqService) {}

  async extractClaims(
    stageNumber: number,
    competency: string,
    transcript: string,
  ): Promise<CandidateClaim[]> {
    const prompt = `
Bạn là expert phân tích phỏng vấn. Từ transcript dưới đây, extract các CLAIMS
(tuyên bố) mà ứng viên đã đưa ra.

Stage: ${stageNumber}
Competency: ${competency}
Transcript:
${transcript}

Trả về JSON array, mỗi claim gồm:
{
  "claim": "nội dung tuyên bố ngắn gọn",
  "category": "work_style|technical_opinion|experience_claim|value_statement|self_assessment",
  "confidence": "stated|implied",
  "originalQuote": "trích dẫn gốc từ transcript (nếu candidate nói trực tiếp)"
}

Quy tắc:
- Chỉ extract claims CÓ THỂ SO SÁNH giữa các stage (không extract facts thuần túy)
- "stated": candidate nói trực tiếp ("Tôi thích...")
- "implied": suy ra từ context ("Khi gặp lỗi, tôi thường tự fix" → implied self_assessment: tự tin debug)
- Tối đa 5 claims per stage (chọn quan trọng nhất)
- Bỏ qua claims quá cụ thể về 1 project (không generalizable)
`;

    const result = await this.groqService.generateContent(prompt, {
      model: 'llama-3.1-8b-instant',
      maxTokens: 300,
      temperature: 0.1,
    });

    return this.parseClaims(result, stageNumber, competency);
  }
}
```

#### B. `contradiction-detector.service.ts` (file mới)

```typescript
@Injectable()
export class ContradictionDetectorService {
  constructor(private groqService: GroqService) {}

  async detectContradictions(
    newClaims: CandidateClaim[],
    existingClaims: CandidateClaim[],
  ): Promise<Contradiction[]> {
    if (existingClaims.length === 0) return [];

    const prompt = `
So sánh claims MỚI với claims CŨ của ứng viên. Tìm mâu thuẫn hoặc inconsistency.

Claims cũ (từ các stage trước):
${JSON.stringify(existingClaims.map(c => ({
  stage: c.stageNumber,
  claim: c.claim,
  category: c.category,
})))}

Claims mới:
${JSON.stringify(newClaims.map(c => ({
  stage: c.stageNumber,
  claim: c.claim,
  category: c.category,
})))}

Trả về JSON array các mâu thuẫn:
{
  "oldClaimIndex": 0,
  "newClaimIndex": 1,
  "type": "direct_contradiction|nuance_shift|context_dependent",
  "explanation": "tại sao đây là mâu thuẫn",
  "suggestedQuestion": "câu hỏi tự nhiên để hỏi ứng viên reconcile"
}

Quy tắc:
- "direct_contradiction": nói ngược lại hoàn toàn
- "nuance_shift": không ngược hẳn nhưng đáng hỏi thêm
- "context_dependent": có thể đúng cả hai nếu context khác nhau (vẫn đáng hỏi)
- Chỉ flag khi sự khác biệt THỰC SỰ đáng hỏi (không nitpick)
- suggestedQuestion phải tự nhiên, curious tone, không accusatory
- Trả về [] nếu không có mâu thuẫn đáng kể
`;

    const result = await this.groqService.generateContent(prompt, {
      model: 'llama-3.1-8b-instant',
      maxTokens: 250,
      temperature: 0.1,
    });

    return this.parseContradictions(result, newClaims, existingClaims);
  }
}
```

#### C. Sửa `behavioral-session.service.ts` — trong `nextStage()`

```typescript
async nextStage(sessionId: string) {
  // ... existing logic ...

  // Async background task (existing):
  // 1. Summarize previous stage
  // 2. Assess performance

  // THÊM MỚI trong background task:
  // 3. Extract claims từ stage vừa hoàn thành
  const stageTranscript = await this.getStageTranscript(session, previousStage);
  const newClaims = await this.claimExtractor.extractClaims(
    previousStage,
    currentCompetency,
    stageTranscript,
  );

  // 4. Detect contradictions với all previous claims
  const allPreviousClaims = Object.values(session.candidateClaims).flat();
  const contradictions = await this.contradictionDetector.detectContradictions(
    newClaims,
    allPreviousClaims,
  );

  // 5. Save claims + contradictions
  session.candidateClaims[previousStage] = newClaims;
  session.detectedContradictions.push(...contradictions);
  await this.sessionRepo.save(session);

  // 6. Rebuild cached prompt với contradiction hints
  if (contradictions.length > 0) {
    const updatedPrompt = this.promptBuilder.buildSystemPrompt(
      session.candidateLevel,
      cvSnapshot, jdSnapshot,
      session.currentStage,
      undefined,
      this.promptBuilder.buildEnrichedContextBlock(
        session.stageSummaries,
        session.candidateClaims,
        contradictions,
        session.currentStage,
      ),
    );
    await this.redis.set(`prompt:${sessionId}`, updatedPrompt, 7200);
  }
}
```

#### D. Sửa `prompt-builder.service.ts`

Thêm method `buildEnrichedContextBlock`:

```typescript
buildEnrichedContextBlock(
  stageSummaries: Record<string, string>,
  candidateClaims: Record<string, CandidateClaim[]>,
  contradictions: Contradiction[],
  currentStage: number,
): string {
  let block = this.buildCandidateContextBlock(stageSummaries, currentStage);

  // Thêm key claims
  const allClaims = Object.values(candidateClaims).flat();
  if (allClaims.length > 0) {
    const claimsSummary = allClaims
      .slice(-8)  // max 8 claims gần nhất
      .map(c => `- Stage ${c.stageNumber}: "${c.claim}" (${c.category})`)
      .join('\n');
    block += `\n\n[Những điều ứng viên đã chia sẻ]\n${claimsSummary}`;
  }

  // Thêm contradiction hints
  const activeContradictions = contradictions.filter(c => !c.addressed);
  if (activeContradictions.length > 0) {
    const hints = activeContradictions
      .slice(0, 2)  // max 2 contradictions per stage
      .map(c => `⚠ "${c.oldClaim}" vs "${c.newClaim}"\n  Gợi ý: ${c.suggestedQuestion}`)
      .join('\n\n');

    block += `\n\n[Lưu ý inconsistency — hỏi khi phù hợp, tone curious]\n${hints}`;
  }

  // Hard cap
  return block.slice(0, 2000);
}
```

---

## 4. Data Flow tổng thể

```
Stage N hoàn thành
    ↓
[buildStageSummary()] ── existing ──→ prose summary
    ↓
[extractClaims()] ── NEW ──→ structured claims
    ↓
[detectContradictions()] ── NEW ──→ contradictions[]
    ↓
Save to session.candidateClaims + session.detectedContradictions
    ↓
[buildEnrichedContextBlock()] ── NEW
    ↓
Inject vào system prompt cho Stage N+1
    ↓
AI tự nhiên reference/hỏi về contradictions khi phù hợp
```

---

## 5. Ví dụ thực tế

### Scenario: Candidate tự mâu thuẫn về work style

**Stage 1 (Culture Fit):**
> Q: "Khi gặp task mới mà chưa biết approach, bạn thường làm gì?"
> A: "Em thường tự research trước, đọc docs, thử prototype nhỏ rồi mới hỏi senior."

→ Claim extracted: `{ claim: "Prefer tự research trước khi hỏi người khác", category: "work_style", confidence: "stated" }`

**Stage 5 (Soft Skills):**
> Q: "Bạn collaborate với team như thế nào?"
> A: "Em rất thích pair programming, thường rủ teammate cùng debug, mob programming..."

→ Claim extracted: `{ claim: "Thích pair programming và collaborative debugging", category: "work_style", confidence: "stated" }`

→ Contradiction detected: `{ type: "nuance_shift", explanation: "Stage 1 emphasize independence, Stage 5 emphasize collaboration" }`

**Stage 5 (AI response với contradiction hint):**
> "Thú vị đấy — mình nhớ lúc nói về learning approach, bạn có chia sẻ là thường tự research
> trước khi hỏi ai. Vậy khi pair programming, bạn balance thế nào giữa việc tự tìm hiểu
> và cùng explore với teammate?"

→ Candidate phải suy nghĩ sâu hơn, reveal real work style.

---

## 6. Đánh giá

### Pros
- Tạo cảm giác interviewer "nhớ mọi thứ" — rất impressive
- Force candidate suy nghĩ kỹ hơn về consistency
- Reveal insights mà surface questioning không tìm ra
- Chạy async khi chuyển stage → không tăng latency trong stage

### Cons
- Thêm 2 LLM calls per stage transition (extract + detect) — nhưng chạy async nên OK
- Claim extraction có thể miss nuance hoặc extract sai
- Contradiction detection có thể false positive → annoying cho candidate

### Risks
- **False positive contradictions**: AI flag inconsistency mà thực ra không phải. Mitigation: chỉ inject contradiction khi `type === 'direct_contradiction'` hoặc confidence cao
- **Accusatory tone**: AI hỏi về contradiction mà nghe như đang "bắt lỗi". Mitigation: explicit instruction "curious tone, không judgmental" trong prompt
- **Context window bloat**: quá nhiều claims + contradictions. Mitigation: hard cap 2000 chars, max 8 claims, max 2 contradictions per stage

### Metrics đo lường
- **Contradiction detection accuracy**: manual review 50 sessions, đo precision/recall
- **Candidate reaction**: survey "Interviewer có nhớ những gì bạn nói ở các phần trước không?" (1-5)
- **Insight quality**: so sánh depth of insights trước/sau feature
- **False positive rate**: target < 20% contradictions là false positive
