import { Injectable } from '@nestjs/common';
import { GroqService } from '../ai/groq.service';
import { CandidateLevel } from './entities/behavioral-session.entity';
import {
  CompetencyAnchor,
  COMPETENCY_ANCHORS,
  COVERAGE_RULES,
} from './competency-anchors.constant';

@Injectable()
export class QuestionOrchestratorService {
  private readonly miniModel = 'llama-3.1-8b-instant';

  constructor(private readonly groqService: GroqService) {}

  // Trả về anchor tiếp theo chưa được cover; null = đã đủ coverage
  getNextAnchor(
    stage: number,
    level: CandidateLevel,
    coveredCompetencies: string[],
  ): CompetencyAnchor | null {
    const anchors = (COMPETENCY_ANCHORS[stage] ?? []).filter((a) =>
      a.applicableLevels.includes(level),
    );

    // Tìm anchor chưa hỏi
    const next = anchors.find((a) => !coveredCompetencies.includes(a.id));
    return next ?? null;
  }

  // Kiểm tra stage đã cover đủ minimum required chưa
  isStageCoverageComplete(
    stage: number,
    level: CandidateLevel,
    coveredCompetencies: string[],
  ): boolean {
    const required = COVERAGE_RULES[stage]?.[level] ?? 1;
    return coveredCompetencies.length >= required;
  }

  // Build instruction inject vào system prompt: "Hãy hỏi về [anchor.intent]..."
  buildAnchorInstruction(
    anchor: CompetencyAnchor,
    cvSnapshot: string,
    candidateContext: string,
  ): string {
    const cvHint = cvSnapshot
      ? `\nDựa trên CV: ${cvSnapshot.slice(0, 300)}...`
      : '';
    const contextHint = candidateContext
      ? `\nBối cảnh ứng viên từ các stage trước: ${candidateContext}`
      : '';

    return (
      `[Anchor hướng dẫn — KHÔNG đọc nguyên văn]\n` +
      `Competency cần đánh giá: ${anchor.competency}\n` +
      `Intent: ${anchor.intent}\n` +
      `Scope follow-up: ${anchor.scope}\n` +
      `Ví dụ tham khảo (rephrase tự nhiên, KHÔNG dùng verbatim): "${anchor.exampleQuestion}"` +
      cvHint +
      contextHint
    );
  }

  // Phân loại hiệu suất stage dựa trên summary — dùng cho adaptive difficulty
  async assessStagePerformance(
    stageSummary: string,
  ): Promise<'strong' | 'average' | 'weak'> {
    if (!stageSummary) return 'average';

    const prompt =
      `Dựa vào tóm tắt buổi phỏng vấn sau, phân loại hiệu suất ứng viên.\n` +
      `Chỉ trả về đúng 1 trong 3 từ: strong / average / weak\n\n` +
      `Tóm tắt: ${stageSummary}`;

    try {
      const raw = (
        await this.groqService.generateContent({
          model: this.miniModel,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { maxOutputTokens: 10 },
        })
      )
        .trim()
        .toLowerCase();

      if (raw.includes('strong')) return 'strong';
      if (raw.includes('weak')) return 'weak';
      return 'average';
    } catch {
      return 'average';
    }
  }
}
