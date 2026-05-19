import { Injectable, Logger } from '@nestjs/common';
import { GroqService } from '../ai/groq.service';
import type {
  QuestionProbeFollowUpTrigger,
  QuestionProbeLanguage,
} from '../question-bank/constants/question-bank-taxonomy.constants';
import type { QuestionProbeLocalizedContent } from '../question-bank/entities/question-probe.entity';
import type { PersonaPolicy } from '../session-planning/types/session-plan.types';
import type { RenderedFollowUpsMap } from './types/behavior-session.types';

@Injectable()
export class ProbeRendererService {
  private readonly logger = new Logger(ProbeRendererService.name);

  constructor(private readonly groqService: GroqService) {}

  /**
   * Render probe question tự nhiên theo persona.
   * Dùng tại session init (pre-render toàn bộ), chạy song song qua Promise.allSettled.
   *
   * @param displayQuestion - Câu hỏi gốc từ probe.localizedContent
   * @param stageName - Tên stage để LLM có context
   * @param personaPolicy - Persona + tone của interviewer
   * @param language - Ngôn ngữ phỏng vấn
   * @returns Câu hỏi đã được phrase theo persona, fallback về displayQuestion nếu LLM fail
   */
  async renderProbeQuestion({
    displayQuestion,
    stageName,
    personaPolicy,
    language,
  }: {
    displayQuestion: string;
    stageName: string;
    personaPolicy: PersonaPolicy;
    language: QuestionProbeLanguage;
  }): Promise<string> {
    try {
      const result: string = await this.groqService.generateContent({
        model: 'llama-3.1-8b-instant',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: this._questionRenderPrompt({
                  displayQuestion,
                  stageName,
                  personaPolicy,
                  language,
                }),
              },
            ],
          },
        ],
        config: { maxOutputTokens: 200 },
      });
      return result.trim() || displayQuestion;
    } catch (error: unknown) {
      this.logger.warn(
        `Question render failed, using raw: ${this._errorMessage(error)}`,
      );
      return displayQuestion;
    }
  }

  /**
   * Pre-render tất cả follow-ups của một probe ngay khi probe bắt đầu (lazy, background).
   * Kết quả lưu vào RenderedFollowUpsMap với key `${probeId}:${trigger}`.
   *
   * @param probeId - ID của probe
   * @param followUps - Danh sách follow-up từ probe.followUps
   * @param stageName - Tên stage
   * @param personaPolicy - Persona + tone của interviewer
   * @param language - Ngôn ngữ phỏng vấn
   * @returns Map trigger → rendered text (bỏ qua các trigger render fail)
   */
  async renderProbeFollowUps({
    probeId,
    followUps,
    stageName,
    personaPolicy,
    language,
  }: {
    probeId: string;
    followUps: { trigger: QuestionProbeFollowUpTrigger; question: string }[];
    stageName: string;
    personaPolicy: PersonaPolicy;
    language: QuestionProbeLanguage;
  }): Promise<RenderedFollowUpsMap> {
    const results: RenderedFollowUpsMap = {};

    const renderResults = await Promise.allSettled(
      followUps.map(async (followUp) => {
        const rendered: string = await this._renderFollowUpText({
          followUpText: followUp.question,
          stageName,
          personaPolicy,
          language,
        });
        return { trigger: followUp.trigger, rendered };
      }),
    );

    renderResults.forEach((result, index) => {
      const trigger: QuestionProbeFollowUpTrigger = followUps[index].trigger;
      const key: string = `${probeId}:${trigger}`;
      if (result.status === 'fulfilled') {
        results[key] = result.value.rendered;
      } else {
        // Fallback về text gốc khi render fail
        results[key] = followUps[index].question;
        this.logger.warn(`Follow-up render failed for ${key}, using raw text`);
      }
    });

    return results;
  }

  /**
   * Lấy rendered text của follow-up từ map. Nếu chưa có (render chưa xong),
   * thực hiện on-demand render.
   *
   * @returns Rendered follow-up text
   */
  async getOrRenderFollowUp({
    probeId,
    trigger,
    rawFollowUpText,
    stageName,
    personaPolicy,
    language,
    renderedFollowUps,
  }: {
    probeId: string;
    trigger: QuestionProbeFollowUpTrigger;
    rawFollowUpText: string;
    stageName: string;
    personaPolicy: PersonaPolicy;
    language: QuestionProbeLanguage;
    renderedFollowUps: RenderedFollowUpsMap;
  }): Promise<string> {
    const key: string = `${probeId}:${trigger}`;
    if (renderedFollowUps[key]) {
      return renderedFollowUps[key];
    }
    // On-demand fallback: lazy pre-render chưa hoàn tất
    return this._renderFollowUpText({
      followUpText: rawFollowUpText,
      stageName,
      personaPolicy,
      language,
    });
  }

  /** Redirect text là canned response — không cần LLM render */
  buildRedirectText(language: QuestionProbeLanguage): string {
    const redirectTexts: Record<QuestionProbeLanguage, string> = {
      vi: 'Bạn có thể chia sẻ một tình huống cụ thể liên quan đến câu hỏi không?',
      en: 'Could you share a specific situation that relates to the question?',
      ja: '質問に関連する具体的な状況を共有していただけますか？',
    };
    return redirectTexts[language];
  }

  private async _renderFollowUpText({
    followUpText,
    stageName,
    personaPolicy,
    language,
  }: {
    followUpText: string;
    stageName: string;
    personaPolicy: PersonaPolicy;
    language: QuestionProbeLanguage;
  }): Promise<string> {
    try {
      const result: string = await this.groqService.generateContent({
        model: 'llama-3.1-8b-instant',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: this._followUpRenderPrompt({
                  followUpText,
                  stageName,
                  personaPolicy,
                  language,
                }),
              },
            ],
          },
        ],
        config: { maxOutputTokens: 150 },
      });
      return result.trim() || followUpText;
    } catch (error: unknown) {
      this.logger.warn(
        `Follow-up render failed, using raw: ${this._errorMessage(error)}`,
      );
      return followUpText;
    }
  }

  private _questionRenderPrompt({
    displayQuestion,
    stageName,
    personaPolicy,
    language,
  }: {
    displayQuestion: string;
    stageName: string;
    personaPolicy: PersonaPolicy;
    language: QuestionProbeLanguage;
  }): string {
    return `You are ${personaPolicy.name}. Tone: ${personaPolicy.tone}.
You are interviewing a candidate. Do NOT give feedback. Ask exactly one question. Language: ${language}.

Rephrase this question naturally for your persona:
"${displayQuestion}"

Stage context: ${stageName}`;
  }

  private _followUpRenderPrompt({
    followUpText,
    stageName,
    personaPolicy,
    language,
  }: {
    followUpText: string;
    stageName: string;
    personaPolicy: PersonaPolicy;
    language: QuestionProbeLanguage;
  }): string {
    return `You are ${personaPolicy.name}. Tone: ${personaPolicy.tone}.
You are continuing an interview. Do NOT give feedback or hints. Ask exactly one question. Language: ${language}.

Rephrase this follow-up naturally for your persona:
"${followUpText}"

Context: candidate just answered a question about ${stageName}.`;
  }

  /** Build opening contract text — scripted, no LLM */
  buildOpeningContract({
    targetRole,
    targetLevel,
    language,
  }: {
    targetRole: string;
    targetLevel: string;
    personaPolicy: PersonaPolicy;
    language: QuestionProbeLanguage;
  }): string {
    const profiles: Record<
      QuestionProbeLanguage,
      Record<string, { name: string; title: string }>
    > = {
      vi: {
        junior: { name: 'Linh', title: 'Engineering Manager' },
        mid: { name: 'Hằng', title: 'Senior Engineering Manager' },
        senior: { name: 'Lan', title: 'Director of Engineering' },
      },
      en: {
        junior: { name: 'Gavin', title: 'Engineering Manager' },
        mid: { name: 'Gavin', title: 'Senior Engineering Manager' },
        senior: { name: 'Ashley', title: 'Director of Engineering' },
      },
      ja: {
        junior: { name: '中村ゆき', title: 'エンジニアリングマネージャー' },
        mid: { name: '中村ゆき', title: 'シニアエンジニアリングマネージャー' },
        senior: { name: '山本音弥', title: 'エンジニアリングディレクター' },
      },
    };
    const { name, title } = profiles[language]?.[targetLevel] ?? {
      name: 'Alex',
      title: 'Engineering Manager',
    };

    const texts: Record<QuestionProbeLanguage, string> = {
      vi: `Xin chào bạn, tôi là ${name}, ${title} ở đây. Hôm nay tôi sẽ phỏng vấn bạn cho vị trí ${targetRole} level ${targetLevel}. Tôi sẽ hỏi qua nhiều chủ đề khác nhau và có thể đi sâu thêm ở một số câu hỏi. Bạn sẵn sàng chưa?`,
      en: `Hi, I'm ${name}, ${title} here. Today I'll be interviewing you for the ${targetRole} role at ${targetLevel} level. I'll ask across a few different areas and may dig deeper in some spots. I won't be giving feedback during the interview itself. Ready to get started?`,
      ja: `こんにちは、${title}の${name}です。本日は${targetRole}の${targetLevel}ポジションの面接を担当します。いくつかのテーマにわたって質問し、一部は深掘りすることもあります。面接中はフィードバックはお伝えしません。準備はよろしいですか？`,
    };
    return texts[language];
  }

  /** Build stage intro text — scripted, no LLM */
  buildStageIntro({
    stageName,
    language,
  }: {
    stageName: string;
    language: QuestionProbeLanguage;
  }): string {
    const texts: Record<QuestionProbeLanguage, string> = {
      vi: `Bây giờ chúng ta sẽ đến với phần ${stageName}.`,
      en: `Now let's move on to ${stageName}.`,
      ja: `次に、${stageName}のセクションに移ります。`,
    };
    return texts[language];
  }

  /** Build probe transition text — scripted, no LLM */
  buildProbeTransition({
    language,
  }: {
    language: QuestionProbeLanguage;
  }): string {
    const texts: Record<QuestionProbeLanguage, string> = {
      vi: 'Cảm ơn bạn. Hãy chuyển sang câu hỏi tiếp theo.',
      en: "Thank you. Let's move on to the next question.",
      ja: 'ありがとうございます。次の質問に移りましょう。',
    };
    return texts[language];
  }

  /** Build stage transition text — scripted, no LLM */
  buildStageTransition({
    nextStageName,
    language,
  }: {
    nextStageName: string;
    language: QuestionProbeLanguage;
  }): string {
    const texts: Record<QuestionProbeLanguage, string> = {
      vi: `Tốt. Bây giờ chúng ta chuyển sang phần tiếp theo: ${nextStageName}.`,
      en: `Good. Now let's shift to the next section: ${nextStageName}.`,
      ja: `了解しました。では次のセクション「${nextStageName}」に移ります。`,
    };
    return texts[language];
  }

  /** Build localized content cho probe theo ngôn ngữ với fallback về en */
  resolveLocalizedContent({
    localizedContent,
    language,
  }: {
    localizedContent: Partial<
      Record<QuestionProbeLanguage, QuestionProbeLocalizedContent>
    >;
    language: QuestionProbeLanguage;
  }): QuestionProbeLocalizedContent | null {
    return localizedContent[language] ?? localizedContent['en'] ?? null;
  }

  private _errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
