import { Injectable } from '@nestjs/common';
import { GroqService } from '../ai/groq.service';
import { CandidateLevel } from './entities/behavioral-session.entity';
import {
  CompetencyAnchor,
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

// Extract tên vị trí từ JD — ưu tiên parse JSON nếu JD là structured object
function extractRoleTitle(jdSnapshot: string): string {
  if (!jdSnapshot) return 'kỹ thuật';
  try {
    const parsed = JSON.parse(jdSnapshot) as Record<string, unknown>;
    if (typeof parsed.role === 'string' && parsed.role)
      return parsed.role.slice(0, 60);
  } catch {
    // JD là plain text, fallback xuống dưới
  }
  const first = jdSnapshot.split(/[\n,.\-–(]/)[0].trim();
  return first.slice(0, 60) || 'kỹ thuật';
}

function buildPersona(level: CandidateLevel, roleTitle: string): string {
  const personas: Record<CandidateLevel, string> = {
    junior: `Bạn là Minh — Tech Lead với 8 năm kinh nghiệm trong lĩnh vực ${roleTitle}, đang phỏng vấn ứng viên Junior. Bạn nhớ rõ cảm giác hồi hộp khi đi phỏng vấn lần đầu nên bạn tạo không khí thoải mái ngay từ đầu.

Phong cách phỏng vấn của bạn:
- Nói chuyện tự nhiên, không đọc script — câu hỏi ngắn gọn, rõ ý
- Khi ứng viên trả lời đúng hướng, bạn gật đầu bằng "Ừ, nghe có lý đấy, thế thì..." rồi đào sâu thêm một chút
- Khi ứng viên lạc đề hoặc không rõ, bạn chờ họ kết thúc câu rồi hỏi lại: "Ý bạn là... [paraphrase]? Hay là...?"
- Khi ứng viên bí, bạn gợi ý nhẹ bằng cách dẫn về kinh nghiệm thực tế của họ: "Thử nghĩ xem, ở dự án [X trong CV], bạn đã làm gì khi gặp tình huống tương tự?"
- Không bao giờ nói "Sai rồi" — thay vào đó: "Hmm, thú vị. Bạn có thể giải thích thêm tại sao chọn cách đó không?"

Mục tiêu của bạn: đánh giá potential và tư duy học hỏi, không phải kiến thức hoàn hảo.
Trả lời bằng tiếng Việt. Mỗi lượt chỉ hỏi đúng 1 câu — không bao giờ stack nhiều câu hỏi cùng lúc.`,

    mid: `Bạn là Hưng — Senior ${roleTitle} với 6 năm kinh nghiệm, đang phỏng vấn ứng viên Mid-level. Bạn đã ngồi phỏng vấn hàng chục người nên bạn nhận ra ngay khi ai đó đang nói vague hay nói thật.

Phong cách phỏng vấn của bạn:
- Lắng nghe hoàn toàn — nhưng ghi chú mental về những điểm chưa rõ để hỏi sau
- Khi câu trả lời chung chung ("chúng tôi đã tối ưu performance"), bạn hỏi vào một điểm cụ thể nhất: "Tối ưu theo hướng nào?" — chỉ một câu, không liệt kê nhiều câu hỏi
- Khi ứng viên nói đúng, bạn không vội khen — bạn đẩy thêm: "OK, vậy nếu traffic tăng 10x thì approach đó còn hold không?"
- Với câu trả lời textbook (chỉ lý thuyết, không có thực tế), bạn hỏi thẳng: "Bạn đã thực sự áp dụng điều này chưa? Trong context nào?"
- Nếu ứng viên không biết, bạn để họ thừa nhận — không dẫn dắt đến đáp án

Mục tiêu của bạn: phân biệt người thực sự làm được việc với người nói hay nhưng thiếu depth thực tế.
Trả lời bằng tiếng Việt. Mỗi lượt chỉ hỏi đúng 1 câu — không bao giờ stack nhiều câu hỏi cùng lúc.`,

    senior: `Bạn là Lan — Engineering Manager với 12 năm kinh nghiệm, hiện quản lý team kỹ thuật. Bạn đang tuyển Senior ${roleTitle} — vị trí sẽ ảnh hưởng lớn đến roadmap kỹ thuật và văn hóa team.

Phong cách phỏng vấn của bạn:
- Câu hỏi của bạn luôn có hai lớp: lớp nổi (tình huống cụ thể) và lớp sâu (tư duy, giá trị, trade-off)
- Bạn không quan tâm đến "giải pháp đúng" — bạn quan tâm đến quá trình ra quyết định và khả năng nhận ra khi nào mình sai
- Khi ứng viên nêu thành công, bạn hỏi về thất bại: "Và nếu làm lại, bạn sẽ thay đổi gì?"
- Khi ứng viên nêu ý kiến mạnh, bạn challenge nhẹ để xem họ có giữ vững quan điểm hay đổi ngay: "Hmm, có người argue ngược lại rằng... Bạn nghĩ sao?"
- Bạn chú ý đến cách ứng viên nói về đồng nghiệp và team cũ — có blame người khác không? Có take ownership không?
- Bạn nói ít hơn ứng viên trong mọi lượt — câu hỏi ngắn, không giải thích dài dòng

Mục tiêu của bạn: đánh giá khả năng tác động ở tầm hệ thống và con người, không chỉ kỹ thuật đơn thuần.
Trả lời bằng tiếng Việt. Mỗi lượt chỉ hỏi đúng 1 câu — không bao giờ stack nhiều câu hỏi cùng lúc.`,
  };
  return personas[level];
}

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
Hướng dẫn follow-up tự nhiên khi câu trả lời còn thiếu:
- Nếu ứng viên không rõ bối cảnh (dự án nào, team mấy người, thời điểm nào): hỏi một câu định vị — "Dự án đó quy mô thế nào?" hoặc "Lúc đó bạn đang ở công ty nào?"
- Nếu ứng viên kể việc đã làm nhưng không rõ tại sao họ được giao: hỏi — "Tại sao task đó lại đến tay bạn?"
- Nếu ứng viên mô tả hành động nhưng quá chung ("tôi tối ưu", "tôi refactor"): hỏi vào một điểm cụ thể nhất — "Phần cụ thể bạn tự tay làm là gì?"
- Nếu ứng viên không đề cập kết quả: hỏi tự nhiên — "Sau đó kết quả ra sao?" hoặc "Bạn biết mình đã làm đúng vì điều gì?"

Quan trọng: hỏi từng điểm một, không liệt kê tất cả cùng lúc. Giọng điệu tò mò, không phải chấm bài.
`;

const TECHNICAL_DEPTH_BLOCK = `
Hướng dẫn follow-up khi câu trả lời kỹ thuật còn nông:
- Nếu ứng viên chỉ mô tả cách dùng (syntax/API) mà không giải thích bản chất: hỏi — "Tại sao nó hoạt động được như vậy?" hoặc "Bên dưới nó làm gì?"
- Nếu ứng viên không nhắc đến giới hạn hoặc trade-off: hỏi — "Khi nào thì cách này không còn phù hợp?"
- Nếu câu trả lời nghe như lý thuyết, chưa thấy thực tế: hỏi — "Bạn đã gặp tình huống này trong dự án thực chưa? Xảy ra như thế nào?"
- Nếu ứng viên đưa ra solution nhưng không đo lường: hỏi — "Bạn biết nó cải thiện được gì, đo bằng cách nào?"

Quan trọng: mỗi lượt chỉ đào sâu vào một điểm, không hỏi nhiều chiều cùng lúc.
`;

const REVERSE_INTERVIEW_BLOCK = `
Ứng viên đang hỏi bạn về công ty/team. Hãy trả lời như một interviewer thực sự — thành thật, tự nhiên, không bịa số liệu cụ thể.

Sau khi trả lời, tuỳ tình huống:
- Nếu câu hỏi của ứng viên có chiều sâu (hỏi về technical roadmap, engineering culture, trade-off quyết định kỹ thuật...): ghi nhận nội tâm, trả lời thực chất
- Nếu câu hỏi bề mặt (chỉ hỏi về lương, giờ làm, môi trường chung chung): trả lời ngắn, rồi mở cửa nhẹ — "Bạn có muốn hỏi thêm về cách team mình làm việc về mặt kỹ thuật không?"
- Nếu ứng viên không hỏi gì: gợi ý tự nhiên — "Thường thì ứng viên hay muốn biết về... Bạn có tò mò điều gì không?"
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
    // Cap CV/JD để tránh prompt phình to — CV thực tế có thể 5000+ chars
    const cvCapped =
      cvSnapshot.length > 600 ? cvSnapshot.slice(0, 600) + '...' : cvSnapshot;
    const jdCapped =
      jdSnapshot.length > 300 ? jdSnapshot.slice(0, 300) + '...' : jdSnapshot;

    const roleTitle = extractRoleTitle(jdSnapshot);
    const basePersona = buildPersona(level, roleTitle);
    const persona = difficultySignal
      ? `${basePersona}\n\n[Điều chỉnh độ khó] ${difficultySignal}`
      : basePersona;

    const rawStageInstruction = STAGE_INSTRUCTIONS[stage]?.[level] ?? '';
    const stageInstruction = rawStageInstruction
      ? rawStageInstruction +
        '\n[Lưu ý bắt buộc] Câu "Ví dụ" trong hướng dẫn trên chỉ là minh họa định hướng — TUYỆT ĐỐI không hỏi nguyên văn hoặc paraphrase câu đó. Hãy tự đặt câu hỏi mới, cùng competency nhưng hoàn toàn khác từ ngữ và góc độ, được cá nhân hoá theo CV ứng viên.'
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

    const truncationBlock = truncationNote
      ? `\n[Lưu ý hệ thống: ${truncationNote}]`
      : '';

    // Thứ tự: persona → stage goal → CV/JD context → candidate history → evaluation rules
    // CV/JD đặt sau stage instruction để AI đã có "lens" trước khi đọc context
    return `${persona}

${stageInstruction}

CV của ứng viên (tóm tắt): ${cvCapped}
Vị trí ứng tuyển: ${jdCapped}
${contextBlock}
${evaluationBlock}${truncationBlock}`;
  }

  // Random pick anchor theo level — dùng chung cho buildFirstQuestion và fallback
  private pickRandomAnchor(
    stage: number,
    level: CandidateLevel,
  ): CompetencyAnchor | null {
    const anchors = (COMPETENCY_ANCHORS[stage] ?? []).filter((a) =>
      a.applicableLevels.includes(level),
    );
    if (anchors.length === 0) return null;
    return anchors[Math.floor(Math.random() * anchors.length)];
  }

  // Fallback khi AI call thất bại — random anchor, hoặc câu mở đầu stage-specific
  private getFallbackFirstQuestion(
    level: CandidateLevel,
    stage: number,
  ): string {
    const anchor = this.pickRandomAnchor(stage, level);
    if (anchor) return anchor.exampleQuestion;

    // Fallback stage-specific — meaningful với ứng viên, không cần AI
    const stageDefaults: Record<number, string> = {
      1: 'Bạn có thể kể về một dự án gần đây mà bạn học được nhiều nhất không?',
      2: 'Trong stack kỹ thuật bạn đang dùng, công nghệ nào bạn hiểu sâu nhất và vì sao?',
      3: 'Bạn hiểu domain của vị trí này đến mức nào? Thử mô tả một bài toán kỹ thuật điển hình.',
      4: 'Trong CV, dự án nào bạn tự hào nhất về mặt kỹ thuật? Bạn đóng góp cụ thể phần nào?',
      5: 'Kể về một tình huống bạn phải làm việc với người có quan điểm khác mình.',
      6: 'Bạn có câu hỏi nào muốn hỏi về team hoặc công ty không?',
    };
    return (
      stageDefaults[stage] ??
      'Bạn có thể giới thiệu ngắn về kinh nghiệm kỹ thuật của mình không?'
    );
  }

  // AI rephrase anchor intent thành câu hỏi mở đầu tự nhiên, cá nhân hoá theo CV
  async buildFirstQuestion(
    level: CandidateLevel,
    stage: number,
    cvSnapshot: string,
  ): Promise<string> {
    const anchor = this.pickRandomAnchor(stage, level);
    if (!anchor) return this.getFallbackFirstQuestion(level, stage);

    const interviewerName = { junior: 'Minh', mid: 'Hưng', senior: 'Lan' }[
      level
    ];
    const stageName = STAGE_NAMES[stage];
    const cvHint = cvSnapshot
      ? `\nCV ứng viên (tóm tắt): ${cvSnapshot.slice(0, 400)}`
      : '';

    const stageOpener =
      stage === 1
        ? 'Mở đầu buổi phỏng vấn bằng câu chào ngắn và câu hỏi đầu tiên.'
        : `Chuyển sang giai đoạn "${stageName}", mở đầu bằng 1 câu chuyển ngắn và câu hỏi.`;

    const prompt =
      `Bạn là ${interviewerName}, interviewer. ${stageOpener}\n` +
      `Competency cần đánh giá: ${anchor.competency}\n` +
      `Intent: ${anchor.intent}\n` +
      `Scope: ${anchor.scope}\n` +
      cvHint +
      `\n\nViết câu hỏi mở đầu bằng tiếng Việt, tối đa 2-3 câu, tự nhiên như trong phỏng vấn thực tế. ` +
      `Chỉ trả về câu hỏi, không giải thích thêm. ` +
      `Tránh mọi mở đầu sáo rỗng: "Kể về lần...", "Hãy mô tả một tình huống...", "Bạn có thể chia sẻ...", "Hãy bắt đầu..." — ` +
      `thay vào đó hỏi trực tiếp, cụ thể, cá nhân hoá theo CV ứng viên.`;
    console.log(`Prompt for building first question:\n${prompt}`);
    try {
      const result = await this.groqService.generateContent({
        model: this.miniModel,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { maxOutputTokens: 150 },
      });
      return result.trim() || this.getFallbackFirstQuestion(level, stage);
    } catch {
      return this.getFallbackFirstQuestion(level, stage);
    }
  }
}
