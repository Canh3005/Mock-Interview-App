import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CombatSessionAggregate } from './entities/combat-session-aggregate.entity';
import { GroqService } from '../ai/groq.service';

export interface MultimodalScore {
  eye_tracking: {
    score: number;
    screen_gaze_percent: number;
    feedback: string;
  };
  filler_words: {
    score: number;
    avg_filler_rate: number;
    top_fillers: string[];
    feedback: string;
  };
  expression: {
    score: number;
    dominant_expression: string;
    stress_peak_minutes: number[];
    feedback: string;
  };
  overall_soft_skill_score: number;
}

@Injectable()
export class MultimodalScoringService {
  private readonly logger = new Logger(MultimodalScoringService.name);

  constructor(
    @InjectRepository(CombatSessionAggregate)
    private aggRepo: Repository<CombatSessionAggregate>,
    private groqService: GroqService,
  ) {}

  async scoreSession(
    behavioralSessionId: string,
  ): Promise<MultimodalScore | null> {
    const agg = await this.aggRepo.findOneBy({ behavioralSessionId });
    if (!agg) return null;

    // ── Eye-Tracking Score ────────────────────────────────────────────────────
    const screenGazePercent =
      agg.eyeTotalFrames > 0
        ? Math.round((agg.eyeScreenFrames / agg.eyeTotalFrames) * 100)
        : 0;
    const eyeScore = screenGazePercent;

    // ── Filler Word Score ─────────────────────────────────────────────────────
    const avgFillerRate =
      agg.fillerFrameCount > 0 ? agg.fillerRateSum / agg.fillerFrameCount : 0;
    const fillerScore = Math.max(0, Math.round(100 - avgFillerRate * 500));
    const topFillers = Object.entries(agg.fillerWordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    // ── Expression Score ──────────────────────────────────────────────────────
    const expressionScore =
      agg.exprTotalValid > 0
        ? Math.max(
            0,
            Math.round(
              ((agg.exprConfidentCount - agg.exprStressedCount * 0.5) /
                agg.exprTotalValid) *
                100,
            ),
          )
        : 50;

    const dominantExpression = this.getDominantExpression(agg);
    const stressPeakMinutes = [...agg.stressPeakMinutes].sort((a, b) => a - b);

    // ── LLM Narrative Feedback ────────────────────────────────────────────────
    const summaryText =
      `Ứng viên duy trì giao tiếp bằng mắt ${screenGazePercent}% thời gian. ` +
      `Tỉ lệ filler word trung bình ${Math.round(avgFillerRate * 100)}% (ngưỡng tốt < 5%). ` +
      `Biểu cảm chủ yếu là '${dominantExpression}'. ` +
      (stressPeakMinutes.length > 0
        ? `Đỉnh căng thẳng tại phút: ${stressPeakMinutes.join(', ')}. `
        : '') +
      `Đưa ra nhận xét ngắn gọn bằng tiếng Việt và 1-2 gợi ý cải thiện soft skills cho ứng viên.`;

    let eyeFeedback = '';
    let fillerFeedback = '';
    let exprFeedback = '';

    try {
      const narrative = await this.groqService.generateContent({
        model: 'llama-3.1-8b-instant',
        contents: [{ role: 'user', parts: [{ text: summaryText }] }],
        config: { maxOutputTokens: 300 },
      });
      const lines = narrative.split('\n').filter((l) => l.trim().length > 0);
      eyeFeedback = lines[0] ?? '';
      fillerFeedback = lines[1] ?? '';
      exprFeedback = lines[2] ?? lines[0] ?? '';
    } catch (err) {
      this.logger.warn('LLM narrative failed, using default feedback', err);
      eyeFeedback =
        screenGazePercent >= 70
          ? 'Giao tiếp bằng mắt tốt.'
          : 'Cần tập trung nhìn vào camera nhiều hơn.';
      fillerFeedback =
        avgFillerRate < 0.05
          ? 'Diễn đạt lưu loát.'
          : 'Hãy giảm thiểu các từ đệm như "ừm", "kiểu như"...';
      exprFeedback =
        dominantExpression === 'confident'
          ? 'Thái độ tự tin, tốt!'
          : 'Hãy luyện tập thêm để trông tự tin hơn khi phỏng vấn.';
    }

    const overallScore = Math.round(
      eyeScore * 0.35 + fillerScore * 0.35 + expressionScore * 0.3,
    );

    return {
      eye_tracking: {
        score: eyeScore,
        screen_gaze_percent: screenGazePercent,
        feedback: eyeFeedback,
      },
      filler_words: {
        score: fillerScore,
        avg_filler_rate: avgFillerRate,
        top_fillers: topFillers,
        feedback: fillerFeedback,
      },
      expression: {
        score: expressionScore,
        dominant_expression: dominantExpression,
        stress_peak_minutes: stressPeakMinutes,
        feedback: exprFeedback,
      },
      overall_soft_skill_score: overallScore,
    };
  }

  private getDominantExpression(agg: CombatSessionAggregate): string {
    const neutralCount =
      agg.exprTotalValid - agg.exprConfidentCount - agg.exprStressedCount;
    const counts: Record<string, number> = {
      confident: agg.exprConfidentCount,
      stressed: agg.exprStressedCount,
      neutral: Math.max(0, neutralCount),
    };
    return (
      Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'neutral'
    );
  }
}
