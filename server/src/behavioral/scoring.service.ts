import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../ai/gemini.service';
import { BehavioralStageLog } from './entities/behavioral-stage-log.entity';
import { CandidateLevel } from './entities/behavioral-session.entity';

export interface ScoreBreakdown {
  score: number;
  feedback: string;
  highlights: string[];
  red_flags: string[];
  cv_quotes_used?: string[];
}

export interface StarAnalysis {
  avg_situation_score: number;
  avg_task_score: number;
  avg_action_score: number;
  avg_result_score: number;
  weakness: string;
}

export interface FinalScore {
  total_score: number;
  candidate_level_confirmed: string;
  breakdown: {
    stage_1_culture_fit: ScoreBreakdown;
    stage_2_tech_stack: ScoreBreakdown;
    stage_3_domain: ScoreBreakdown;
    stage_4_cv_deepdive: ScoreBreakdown;
    stage_5_soft_skills: ScoreBreakdown;
    stage_6_reverse_interview: ScoreBreakdown;
  };
  star_analysis: StarAnalysis;
  overall_verdict: string;
  actionable_feedback: string;
}

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);
  private readonly model = 'gemini-2.0-flash';

  constructor(private geminiService: GeminiService) {}

  async evaluateSession(
    logs: BehavioralStageLog[],
    candidateLevel: CandidateLevel,
    cvSnapshot: string,
    jdSnapshot: string,
  ): Promise<FinalScore> {
    const transcript = this.buildTranscript(logs);
    const prompt = this.buildEvaluationPrompt(
      transcript,
      candidateLevel,
      cvSnapshot,
      jdSnapshot,
    );

    let attempt = 0;
    let lastError = '';

    while (attempt < 3) {
      attempt++;
      try {
        const errorContext = lastError
          ? `\n\nLần trước trả về JSON không hợp lệ: ${lastError}. Hãy sửa lại.`
          : '';

        const raw = (
          await this.geminiService.generateContent({
            model: this.model,
            contents: [
              { role: 'user', parts: [{ text: prompt + errorContext }] },
            ],
            config: { maxOutputTokens: 3000 },
          })
        ).trim();
        // Extract JSON block
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in response');

        const parsed = JSON.parse(jsonMatch[0]) as FinalScore;
        return parsed;
      } catch (err: any) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        lastError = err.message ?? String(err);
        this.logger.warn(`Scoring attempt ${attempt} failed: ${lastError}`);
      }
    }

    // Fallback score on complete failure
    return this.buildFallbackScore(candidateLevel);
  }

  private buildTranscript(logs: BehavioralStageLog[]): string {
    // Group by stage, limit to 6000 tokens equiv (~24000 chars)
    const MAX_CHARS = 24000;
    const grouped: Record<number, BehavioralStageLog[]> = {};
    for (const log of logs) {
      if (!grouped[log.stageNumber]) grouped[log.stageNumber] = [];
      grouped[log.stageNumber].push(log);
    }

    let transcript = '';
    for (let s = 1; s <= 6; s++) {
      const stageLogs = grouped[s] ?? [];
      if (stageLogs.length === 0) continue;
      transcript += `\n=== Giai đoạn ${s}: ${stageLogs[0].stageName ?? ''} ===\n`;
      for (const log of stageLogs) {
        if (log.role === 'SYSTEM') continue;
        const speaker = log.role === 'USER' ? 'Ứng viên' : 'AI Facilitator';
        const flags =
          log.qualityFlags.length > 0
            ? ` [${log.qualityFlags.join(', ')}]`
            : '';
        transcript += `${speaker}${flags}: ${log.content}\n`;
      }
    }

    if (transcript.length > MAX_CHARS) {
      transcript = transcript.slice(0, MAX_CHARS) + '\n...[Đã cắt bớt]';
    }
    return transcript;
  }

  private buildEvaluationPrompt(
    transcript: string,
    level: CandidateLevel,
    cvSnapshot: string,
    jdSnapshot: string,
  ): string {
    return `Bạn là một Hiring Manager chuyên nghiệp. Chấm điểm ứng viên dưới đây dựa trên buổi phỏng vấn behavioral.

Trình độ ứng viên: ${level}
CV: ${cvSnapshot.slice(0, 1000)}
JD: ${jdSnapshot.slice(0, 500)}

TRANSCRIPT PHỎNG VẤN:
${transcript}

Yêu cầu: Trả về JSON theo schema sau (không giải thích thêm, chỉ JSON):
{
  "total_score": <0-100>,
  "candidate_level_confirmed": "<junior|mid|senior>",
  "breakdown": {
    "stage_1_culture_fit": { "score": <0-100>, "feedback": "<string>", "highlights": ["<string>"], "red_flags": ["<string nếu có, phải trích dẫn lời ứng viên bằng dấu ngoặc kép>"] },
    "stage_2_tech_stack": { "score": <0-100>, "feedback": "<string>", "highlights": ["<string>"], "red_flags": ["<string>"] },
    "stage_3_domain": { "score": <0-100>, "feedback": "<string>", "highlights": ["<string>"], "red_flags": ["<string>"] },
    "stage_4_cv_deepdive": { "score": <0-100>, "feedback": "<string>", "highlights": ["<string>"], "red_flags": ["<string>"], "cv_quotes_used": ["<string>"] },
    "stage_5_soft_skills": { "score": <0-100>, "feedback": "<string>", "highlights": ["<string>"], "red_flags": ["<string>"] },
    "stage_6_reverse_interview": { "score": <0-100>, "feedback": "<string>", "highlights": ["<string>"], "red_flags": ["<string>"] }
  },
  "star_analysis": {
    "avg_situation_score": <0-100>,
    "avg_task_score": <0-100>,
    "avg_action_score": <0-100>,
    "avg_result_score": <0-100>,
    "weakness": "<string>"
  },
  "overall_verdict": "<MID_PASS|MID_BORDERLINE|JUNIOR_RECOMMEND|SENIOR_FAIL|SENIOR_PASS|JUNIOR_FAIL>",
  "actionable_feedback": "<3-5 điểm cụ thể ứng viên cần cải thiện>"
}

Lưu ý: Mọi red_flags phải trích dẫn đúng lời ứng viên (trong dấu ngoặc kép). Stage bị đánh dấu INCOMPLETE (do off-topic persistent) nhận điểm 0.`;
  }

  private buildFallbackScore(level: CandidateLevel): FinalScore {
    const emptyBreakdown: ScoreBreakdown = {
      score: 0,
      feedback: 'Không thể chấm điểm do lỗi hệ thống.',
      highlights: [],
      red_flags: [],
    };
    return {
      total_score: 0,
      candidate_level_confirmed: level,
      breakdown: {
        stage_1_culture_fit: emptyBreakdown,
        stage_2_tech_stack: emptyBreakdown,
        stage_3_domain: emptyBreakdown,
        stage_4_cv_deepdive: { ...emptyBreakdown, cv_quotes_used: [] },
        stage_5_soft_skills: emptyBreakdown,
        stage_6_reverse_interview: emptyBreakdown,
      },
      star_analysis: {
        avg_situation_score: 0,
        avg_task_score: 0,
        avg_action_score: 0,
        avg_result_score: 0,
        weakness: 'Không thể phân tích.',
      },
      overall_verdict: 'SCORING_ERROR',
      actionable_feedback:
        'Hệ thống không thể chấm điểm lần này. Vui lòng thử lại.',
    };
  }
}
