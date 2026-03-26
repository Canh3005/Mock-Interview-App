import { Injectable } from '@nestjs/common';
import { GroqService } from '../ai/groq.service';
import { CandidateLevel } from './entities/behavioral-session.entity';
import {
  COMPETENCY_ANCHORS,
  EvaluationMode,
  STAGE_EVALUATION_MODE,
} from './competency-anchors.constant';

export { EvaluationMode, STAGE_EVALUATION_MODE };

export const STAGE_NAMES: Record<number, string> = {
  1: 'Culture Fit & Company Alignment',
  2: 'Tech Stack Deep-Dive',
  3: 'Domain Knowledge',
  4: 'Thực chiến CV',
  5: 'Kỹ năng mềm & Xử lý tình huống',
  6: 'Reverse Interview',
};

const PERSONA: Record<CandidateLevel, string> = {
  junior: `Bạn là một Mentor thân thiện và kiên nhẫn. Nhiệm vụ của bạn là dẫn dắt ứng viên khám phá câu trả lời của họ thay vì phán xét. Nếu ứng viên thiếu ý, hãy mớm lời nhẹ nhàng bằng câu hỏi gợi mở.`,
  mid: `Bạn là một Senior Engineer đang phỏng vấn. Bạn lắng nghe kỹ và hay vặn vẹo về hiệu năng, tính tự chủ, và cam kết dài hạn. Chỉ mớm lời nếu ứng viên im lặng > 15 giây hoặc lạc đề hoàn toàn.`,
  senior: `Bạn là một Engineering Manager / Tech Lead đang đánh giá ứng viên cấp cao. Bạn tập trung vào bức tranh tổng thể, trade-offs kỹ thuật, và khả năng dẫn dắt team. Ít mớm lời, nhiều câu hỏi đào sâu.`,
};

const STAGE_INSTRUCTIONS: Record<number, Record<CandidateLevel, string>> = {
  1: {
    junior: `Giai đoạn 1 – Culture Fit: Hỏi về khả năng học hỏi và thích nghi của ứng viên trong môi trường thay đổi nhanh. Ví dụ: "Kể về lần bạn phải học một công nghệ hoàn toàn mới trong thời gian ngắn?"`,
    mid: `Giai đoạn 1 – Culture Fit: Hỏi về mức độ tự chủ và mong muốn can thiệp vào giải pháp kỹ thuật. Ví dụ: "Khi bạn không đồng ý với quyết định kỹ thuật của team, bạn xử lý như thế nào?"`,
    senior: `Giai đoạn 1 – Culture Fit: Hỏi về khả năng định hình văn hóa team và xử lý technical debt. Ví dụ: "Bạn đã từng chủ động thay đổi văn hóa làm việc của một team chưa? Kể cụ thể."`,
  },
  2: {
    junior: `Giai đoạn 2 – Tech Stack: Tập trung cú pháp và cách dùng các công cụ trong CV. Ví dụ: "Giải thích sự khác biệt giữa useEffect và useMemo trong React?"`,
    mid: `Giai đoạn 2 – Tech Stack: Tập trung bản chất và tối ưu. Ví dụ: "Khi nào bạn dùng Redux Saga thay vì Redux Thunk, và bao giờ thì đó là overengineering?"`,
    senior: `Giai đoạn 2 – Tech Stack: Tập trung kiến trúc và trade-offs. Ví dụ: "Hãy phân tích trade-off khi kết hợp NestJS OOP backend với React functional frontend trong một codebase monorepo."`,
  },
  3: {
    junior: `Giai đoạn 3 – Domain Knowledge: Kiểm tra tư duy feature đơn lẻ trong domain mock interview. Ví dụ: "Bạn sẽ thiết kế collection MongoDB nào để lưu câu trả lời ứng viên trong một phiên phỏng vấn?"`,
    mid: `Giai đoạn 3 – Domain Knowledge: Tư duy tối ưu luồng dữ liệu. Ví dụ: "Làm thế nào để dùng Redis giảm tải write operations khi log chat real-time cho hàng nghìn phiên phỏng vấn cùng lúc?"`,
    senior: `Giai đoạn 3 – Domain Knowledge: Tư duy scalability. Ví dụ: "Hãy thiết kế kiến trúc event-driven với RabbitMQ để xử lý async LLM response cho hệ thống mock interview ở scale lớn."`,
  },
  4: {
    junior: `Giai đoạn 4 – Thực chiến CV: Đào sâu vào task execution từ CV. Tập trung vào chi tiết kỹ thuật cụ thể như "Bạn implement JWT authentication như thế nào trong dự án X?"`,
    mid: `Giai đoạn 4 – Thực chiến CV: Đào sâu vào troubleshooting và problem-solving. Ví dụ: "Bạn đã xử lý race condition hay concurrency issue nào trong dự án? Giải pháp cụ thể là gì?"`,
    senior: `Giai đoạn 4 – Thực chiến CV: Tập trung System Impact & Leadership. Ví dụ: "Kể về một quyết định kỹ thuật lớn bạn đã đưa ra. Nó ảnh hưởng như thế nào đến team và sản phẩm?"`,
  },
  5: {
    junior: `Giai đoạn 5 – Kỹ năng mềm: Hỏi về cách nhận và xử lý feedback từ senior. Ví dụ: "Kể về lần bạn nhận feedback tiêu cực từ senior trong code review. Bạn cảm thấy thế nào và làm gì?"`,
    mid: `Giai đoạn 5 – Kỹ năng mềm: Hỏi về cross-functional communication. Ví dụ: "Mô tả tình huống bạn phải thuyết phục Product Owner ưu tiên technical debt thay vì feature mới."`,
    senior: `Giai đoạn 5 – Kỹ năng mềm: Hỏi về mentorship và crisis management. Ví dụ: "Nếu một junior developer trong team của bạn liên tục commit lỗi lên production, bạn xử lý như thế nào?"`,
  },
  6: {
    junior: `Giai đoạn 6 – Reverse Interview: Ứng viên được hỏi công ty. Kỳ vọng câu hỏi về task hàng ngày, mentor, tech stack, thời gian thử việc. Nếu ứng viên không hỏi hoặc hỏi cạn, gợi ý nhẹ nhàng: "Bạn có muốn hỏi về văn hóa team hay công nghệ chúng tôi đang dùng không?"`,
    mid: `Giai đoạn 6 – Reverse Interview: Kỳ vọng câu hỏi về CI/CD pipeline, cách xử lý technical debt, growth opportunity. Nếu thiếu depth, gợi ý: "Bạn có muốn hỏi về roadmap kỹ thuật hay cơ hội phát triển không?"`,
    senior: `Giai đoạn 6 – Reverse Interview: Kỳ vọng câu hỏi chiến lược 1-3 năm, KPI engineering team, bài toán khó nhất hiện tại. Đánh giá chất lượng câu hỏi – câu hỏi surface-level sẽ bị ghi nhận.`,
  },
};

const STAR_ENFORCEMENT = `
Khi đánh giá câu trả lời, hãy kiểm tra ứng viên có đề cập đủ 4 yếu tố STAR:
- Situation (Bối cảnh): Họ đang ở đâu, dự án nào?
- Task (Nhiệm vụ): Họ phải làm gì?
- Action (Hành động): Họ đã làm gì cụ thể? (Đây là phần quan trọng nhất)
- Result (Kết quả): Kết quả định lượng được không? (Con số, %, thời gian)

Nếu thiếu bất kỳ yếu tố nào, hãy hỏi thêm. KHÔNG trừ điểm ngay, hãy cho ứng viên cơ hội bổ sung. Khi trích dẫn lời ứng viên trong đánh giá, hãy dùng dấu ngoặc kép.
Trả lời bằng tiếng Việt. Giữ câu trả lời ngắn gọn, tự nhiên như trong một cuộc phỏng vấn thực tế.
`;

const TECHNICAL_DEPTH_BLOCK = `
Đây là câu hỏi kỹ thuật. Đánh giá theo 4 chiều:
- Độ chính xác: Ứng viên có hiểu đúng bản chất không, hay chỉ nhớ syntax?
- Chiều sâu: Có giải thích được "tại sao" không, không chỉ "làm thế nào"?
- Trade-offs: Có nhận ra khi nào nên/không nên dùng approach đó không?
- Ví dụ thực tế: Có dẫn được case từ kinh nghiệm thực tế của bản thân không?
Nếu câu trả lời còn nông (chỉ ở mức syntax/usage), hãy hỏi thêm về performance implications, edge cases, hoặc "bạn đã gặp vấn đề này trong thực tế chưa?".
Trả lời bằng tiếng Việt. Giữ câu trả lời ngắn gọn, tự nhiên như trong một cuộc phỏng vấn thực tế.
`;

const REVERSE_INTERVIEW_BLOCK = `
Ứng viên đang hỏi bạn về công ty/team. Hãy:
1. Trả lời như một interviewer thực sự — thành thật, không cần bịa số liệu cụ thể.
2. Đánh giá ngầm chất lượng câu hỏi: Có chiều sâu chiến lược? Hay chỉ là câu hỏi xã giao?
3. Nếu ứng viên không hỏi gì, hoặc câu hỏi quá bề mặt (chỉ về lương/môi trường làm việc), hãy gợi ý nhẹ: "Bạn có muốn hỏi thêm về roadmap kỹ thuật hoặc cách team handle technical debt không?" — nhưng không ép buộc.
Trả lời bằng tiếng Việt.
`;

@Injectable()
export class PromptBuilderService {
  private readonly miniModel = 'llama-3.1-8b-instant';

  constructor(private readonly groqService: GroqService) {}

  // ─── Task 1.5.4: Cross-stage summary (max 150 tokens, async) ─────────────

  async buildStageSummary(
    stageNumber: number,
    stageName: string,
    transcript: string,
  ): Promise<string> {
    const prompt =
      `Dưới đây là hội thoại ${stageName} (Giai đoạn ${stageNumber}). ` +
      `Tóm tắt trong TỐI ĐA 3 câu:\n` +
      `1. Điểm mạnh nổi bật nhất của ứng viên trong stage này.\n` +
      `2. Điểm yếu hoặc thiếu sót đáng chú ý (nếu có).\n` +
      `3. Một chi tiết cụ thể (từ khoá, dự án, công nghệ, tên) ứng viên đề cập ` +
      `mà có thể dùng để cá nhân hoá câu hỏi ở stage sau.\n\n` +
      `Hội thoại:\n${transcript.slice(0, 3000)}`;

    try {
      const summary = await this.groqService.generateContent({
        model: this.miniModel,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { maxOutputTokens: 150 },
      });
      return summary.trim();
    } catch {
      return '';
    }
  }

  // Build candidateContextBlock từ stage_summaries để inject vào system prompt
  buildCandidateContextBlock(
    stageSummaries: Record<string, string>,
    currentStage: number,
  ): string {
    // Lấy tối đa 2 stage gần nhất trước stage hiện tại
    const available = Object.entries(stageSummaries)
      .filter(([k]) => Number(k) < currentStage)
      .sort(([a], [b]) => Number(b) - Number(a))
      .slice(0, 2);

    if (available.length === 0) return '';

    const summaryText = available
      .reverse()
      .map(([k, v]) => `Stage ${k}: ${v}`)
      .join('\n');

    // Hard-cap 300 tokens ~ 1200 chars
    const capped =
      summaryText.length > 1200
        ? summaryText.slice(0, 1200) + '...'
        : summaryText;

    return (
      `[Bối cảnh ứng viên từ các giai đoạn trước]\n${capped}\n` +
      `Dựa trên thông tin này, hãy cá nhân hoá câu hỏi và refer lại khi tự nhiên.`
    );
  }

  buildSystemPrompt(
    level: CandidateLevel,
    cvSnapshot: string,
    jdSnapshot: string,
    stage: number,
    truncationNote?: string,
    candidateContextBlock?: string,
    difficultySignal?: string,
  ): string {
    const persona = PERSONA[level] + (difficultySignal ?? '');
    const stageInstruction = STAGE_INSTRUCTIONS[stage]?.[level] ?? '';
    const truncationBlock = truncationNote
      ? `\n[Lưu ý hệ thống: ${truncationNote}]`
      : '';

    const mode = STAGE_EVALUATION_MODE[stage] ?? EvaluationMode.STAR_BEHAVIORAL;
    let evaluationBlock: string;
    if (mode === EvaluationMode.TECHNICAL_DEPTH) {
      evaluationBlock = TECHNICAL_DEPTH_BLOCK;
    } else if (mode === EvaluationMode.REVERSE_INTERVIEW) {
      evaluationBlock = REVERSE_INTERVIEW_BLOCK;
    } else {
      evaluationBlock = STAR_ENFORCEMENT;
    }

    const contextBlock = candidateContextBlock
      ? `\n${candidateContextBlock}\n`
      : '';

    return `${persona}

CV của ứng viên: ${cvSnapshot}
Vị trí ứng tuyển: ${jdSnapshot}
Hãy cá nhân hóa câu hỏi dựa trên kinh nghiệm thực tế trong CV này.
${contextBlock}
${stageInstruction}
${evaluationBlock}${truncationBlock}`;
  }

  // Fallback khi AI call thất bại — dùng exampleQuestion của anchor đầu tiên
  private getFallbackFirstQuestion(
    level: CandidateLevel,
    stage: number,
  ): string {
    const anchor = (COMPETENCY_ANCHORS[stage] ?? []).find((a) =>
      a.applicableLevels.includes(level),
    );
    if (anchor) return anchor.exampleQuestion;
    return `Hãy bắt đầu ${STAGE_NAMES[stage]}.`;
  }

  // AI rephrase anchor intent thành câu hỏi mở đầu tự nhiên, cá nhân hoá theo CV
  async buildFirstQuestion(
    level: CandidateLevel,
    stage: number,
    cvSnapshot: string,
  ): Promise<string> {
    const anchor = (COMPETENCY_ANCHORS[stage] ?? []).find((a) =>
      a.applicableLevels.includes(level),
    );

    if (!anchor) return `Hãy bắt đầu ${STAGE_NAMES[stage]}.`;

    const stageName = STAGE_NAMES[stage];
    const cvHint = cvSnapshot
      ? `\nCV ứng viên (tóm tắt): ${cvSnapshot.slice(0, 400)}`
      : '';

    const stageOpener =
      stage === 1
        ? 'Mở đầu buổi phỏng vấn bằng câu chào ngắn và câu hỏi đầu tiên.'
        : `Chuyển sang giai đoạn "${stageName}", mở đầu bằng 1 câu chuyển ngắn và câu hỏi.`;

    const prompt =
      `Bạn là interviewer. ${stageOpener}\n` +
      `Competency cần đánh giá: ${anchor.competency}\n` +
      `Intent: ${anchor.intent}\n` +
      `Scope: ${anchor.scope}\n` +
      `Ví dụ tham khảo (KHÔNG dùng verbatim, hãy rephrase tự nhiên): "${anchor.exampleQuestion}"` +
      cvHint +
      `\n\nViết câu hỏi mở đầu bằng tiếng Việt, tối đa 2-3 câu, tự nhiên như trong phỏng vấn thực tế. Chỉ trả về câu hỏi, không giải thích thêm.`;

    try {
      const result = await this.groqService.generateContent({
        model: this.miniModel,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { maxOutputTokens: 300 },
      });
      console.log('[buildFirstQuestion] result:', result);
      return result.trim() || this.getFallbackFirstQuestion(level, stage);
    } catch {
      return this.getFallbackFirstQuestion(level, stage);
    }
  }
}
