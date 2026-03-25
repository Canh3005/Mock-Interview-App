import { Injectable } from '@nestjs/common';
import { CandidateLevel } from './entities/behavioral-session.entity';

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

@Injectable()
export class PromptBuilderService {
  buildSystemPrompt(
    level: CandidateLevel,
    cvSnapshot: string,
    jdSnapshot: string,
    stage: number,
    truncationNote?: string,
  ): string {
    const persona = PERSONA[level];
    const stageInstruction = STAGE_INSTRUCTIONS[stage]?.[level] ?? '';
    const truncationBlock = truncationNote
      ? `\n[Lưu ý hệ thống: ${truncationNote}]`
      : '';

    return `${persona}

CV của ứng viên: ${cvSnapshot}
Vị trí ứng tuyển: ${jdSnapshot}
Hãy cá nhân hóa câu hỏi dựa trên kinh nghiệm thực tế trong CV này.

${stageInstruction}
${STAR_ENFORCEMENT}${truncationBlock}`;
  }

  buildFirstQuestion(level: CandidateLevel, stage: number): string {
    const openings: Record<number, Record<CandidateLevel, string>> = {
      1: {
        junior:
          'Chào bạn! Hãy kể cho mình nghe về lần bạn phải học một công nghệ mới trong thời gian ngắn nhất?',
        mid: 'Chào bạn! Khi bạn không đồng ý với một quyết định kỹ thuật trong team, bạn thường xử lý như thế nào?',
        senior:
          'Chào bạn! Hãy chia sẻ về một lần bạn chủ động thay đổi văn hóa làm việc hay quy trình kỹ thuật trong team của mình.',
      },
      2: {
        junior:
          'Bây giờ mình sẽ hỏi về tech stack bạn đang dùng. Bạn có thể giải thích sự khác biệt giữa useEffect và useMemo trong React không?',
        mid: 'Tiếp theo, mình muốn đi sâu vào tech stack. Hãy kể về một quyết định kỹ thuật liên quan đến state management mà bạn đã phải đánh đổi giữa các giải pháp khác nhau?',
        senior:
          'Chuyển sang phần tech stack. Bạn đã từng phải quyết định kiến trúc cho một hệ thống lớn chưa? Hãy mô tả trade-offs bạn đã cân nhắc.',
      },
      3: {
        junior:
          'Bây giờ mình muốn hiểu cách bạn tư duy về hệ thống. Bạn sẽ thiết kế database schema như thế nào để lưu trữ các phiên phỏng vấn và câu trả lời?',
        mid: 'Phần tiếp theo về domain knowledge. Nếu hệ thống có hàng nghìn phiên phỏng vấn đồng thời, bạn sẽ tối ưu write operations như thế nào?',
        senior:
          'Về mặt kiến trúc hệ thống – nếu cần xây dựng một nền tảng mock interview scalable, bạn sẽ thiết kế event-driven architecture như thế nào?',
      },
      4: {
        junior:
          'Mình đã xem qua CV của bạn. Hãy kể chi tiết hơn về một tính năng cụ thể bạn đã implement trong dự án gần nhất?',
        mid: 'Nhìn vào CV của bạn, mình thấy có một số dự án thú vị. Trong đó, bạn đã gặp bug hay performance issue khó nhất nào và xử lý ra sao?',
        senior:
          'Từ kinh nghiệm trong CV, hãy kể về một quyết định kiến trúc hoặc kỹ thuật có tầm ảnh hưởng lớn nhất mà bạn đã chủ trì?',
      },
      5: {
        junior:
          'Câu hỏi về kỹ năng làm việc nhóm: Kể về lần bạn nhận feedback tiêu cực từ một senior dev. Bạn đã phản ứng và xử lý như thế nào?',
        mid: 'Về kỹ năng cross-functional: Hãy mô tả một tình huống bạn cần thuyết phục Product Owner về một vấn đề kỹ thuật quan trọng.',
        senior:
          'Về leadership: Bạn đã từng phải quản lý một tình huống khủng hoảng kỹ thuật chưa? Ví dụ khi một thành viên trong team liên tục gây ra vấn đề production?',
      },
      6: {
        junior:
          'Đây là phần cuối – bây giờ đến lượt bạn hỏi chúng tôi! Bạn muốn biết gì về vị trí này hoặc công ty?',
        mid: 'Phần cuối là Reverse Interview – bạn có thể hỏi bất cứ điều gì về team, quy trình, hoặc hướng phát triển kỹ thuật của chúng tôi.',
        senior:
          'Cuối cùng – Reverse Interview. Đây là cơ hội để bạn đánh giá chúng tôi. Bạn muốn hiểu gì về chiến lược kỹ thuật và tổ chức của công ty?',
      },
    };

    return openings[stage]?.[level] ?? `Hãy bắt đầu ${STAGE_NAMES[stage]}.`;
  }
}
