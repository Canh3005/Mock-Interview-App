import { Injectable, Logger } from '@nestjs/common';
import { GroqService } from '../ai/groq.service';
import { LiveCodingSession } from './entities/live-coding-session.entity';
import { LiveCodingSessionProblem } from './entities/live-coding-session-problem.entity';
import { Problem } from '../problems/entities/problem.entity';

@Injectable()
export class LiveCodingAiService {
  private readonly logger = new Logger(LiveCodingAiService.name);
  private readonly MODEL = 'llama-3.3-70b-versatile';

  constructor(private readonly groqService: GroqService) {}

  async onTLE(
    session: LiveCodingSession,
    sp: LiveCodingSessionProblem,
    problem: Problem,
    results: { isHidden: boolean; status: string }[],
  ): Promise<void> {
    const visiblePassed = results.filter(
      (r) => !r.isHidden && r.status === 'AC',
    ).length;
    const visibleTotal = results.filter((r) => !r.isHidden).length;
    const approachText = sp.approachText ?? '(chưa ghi approach)';

    const prompt = `Bạn là AI Interviewer trong một buổi DSA live coding.
Bài toán: ${problem.title} | Tags: ${problem.tags.join(', ')} | Difficulty: ${problem.difficulty}
Approach ứng viên ghi ban đầu: "${approachText}"
Kết quả vừa chạy: pass ${visiblePassed}/${visibleTotal} test case nhỏ, TLE trên test case lớn.

Hãy hỏi 1 câu follow-up ngắn (tối đa 3 câu) để gợi ý ứng viên suy nghĩ về optimization.
Không được tiết lộ thuật toán cụ thể. Dùng tag [${problem.tags.join(', ')}] để định hướng câu hỏi.
Trả lời trực tiếp câu hỏi, không có lời dẫn.`;

    try {
      const aiResponse = await this.groqService.generateContent({
        model: this.MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { maxOutputTokens: 200 },
      });

      session.aiConversation = [
        ...session.aiConversation,
        {
          role: 'ai',
          content: aiResponse,
          trigger: 'TLE',
          problemId: sp.problemId,
          sentAt: new Date().toISOString(),
        },
      ];
    } catch (e: unknown) {
      this.logger.error(`onTLE AI call failed: ${(e as Error).message}`);
    }
  }

  async onIdle(
    session: LiveCodingSession,
    sp: LiveCodingSessionProblem,
    problem: Problem,
  ): Promise<void> {
    const approachText = sp.approachText ?? '(chưa ghi approach)';
    const lastRun = sp.runHistory.at(-1);
    const lastRunSummary = lastRun
      ? `${lastRun.results.filter((r) => r.status === 'AC').length} AC, TLE: ${lastRun.hasTLE}`
      : 'Chưa chạy lần nào';

    const prompt = `Bạn là AI Interviewer trong một buổi DSA live coding.
Ứng viên đã không tương tác hơn 5 phút.
Bài toán: ${problem.title} | Approach ban đầu: "${approachText}"
Lần run gần nhất: ${lastRunSummary}

Gửi 1 câu gợi ý nhẹ để ứng viên tự nói ra chỗ đang bị stuck. Không tiết lộ hướng giải.
Trả lời trực tiếp câu hỏi, không có lời dẫn.`;

    try {
      const aiResponse = await this.groqService.generateContent({
        model: this.MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { maxOutputTokens: 150 },
      });

      session.aiConversation = [
        ...session.aiConversation,
        {
          role: 'ai',
          content: aiResponse,
          trigger: 'IDLE',
          problemId: sp.problemId,
          sentAt: new Date().toISOString(),
        },
      ];
    } catch (e: unknown) {
      this.logger.error(`onIdle AI call failed: ${(e as Error).message}`);
    }
  }

  async generateDebrief(
    session: LiveCodingSession,
    sp: LiveCodingSessionProblem,
    problem: Problem,
  ): Promise<Record<string, unknown>> {
    const approachText = sp.approachText ?? '(không có)';
    const finalCode = sp.finalCode ?? '(không submit)';
    const tleTimes = sp.runHistory.filter((r) => r.hasTLE).length;
    const lastRun = sp.runHistory.at(-1);
    const lastStatus = lastRun
      ? lastRun.results.map((r) => r.status).join(', ')
      : 'N/A';

    const problemConversation = session.aiConversation
      .filter((m) => m.problemId === sp.problemId)
      .map((m) => `[${m.role.toUpperCase()}] ${m.content}`)
      .join('\n');

    const prompt = `Bạn là interviewer phân tích buổi DSA live coding.
---
Bài: ${problem.title} | Tags: ${problem.tags.join(', ')} | Difficulty: ${problem.difficulty}
Approach ứng viên: "${approachText}"
Lịch sử chạy: ${sp.runHistory.length} lần — ${tleTimes} lần TLE, lần cuối: ${lastStatus}
Conversation AI trong bài này:
${problemConversation || '(không có)'}
Code cuối:
\`\`\`
${finalCode}
\`\`\`

Trả về JSON hợp lệ (không markdown, chỉ JSON thuần):
{
  "approachVerdict": "...",
  "complexityAnalysis": { "submitted": "O(...)", "optimal": "O(...)", "verdict": "tối ưu|chưa tối ưu" },
  "stuckPoints": ["..."],
  "followUpPerformance": "...",
  "actionableSuggestion": "..."
}`;

    const raw = await this.groqService.generateContent({
      model: this.MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 600 },
    });

    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch {
      this.logger.warn(
        `Failed to parse debrief JSON for ${sp.problemId}, returning raw`,
      );
      return { raw, approachVerdict: raw };
    }
  }
}
