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
    lastCandidateAnswer,
  }: {
    probeId: string;
    trigger: QuestionProbeFollowUpTrigger;
    rawFollowUpText: string;
    stageName: string;
    personaPolicy: PersonaPolicy;
    language: QuestionProbeLanguage;
    renderedFollowUps: RenderedFollowUpsMap;
    lastCandidateAnswer?: string;
  }): Promise<string> {
    const key: string = `${probeId}:${trigger}`;
    if (renderedFollowUps[key] && !lastCandidateAnswer) {
      return renderedFollowUps[key];
    }
    return this._renderFollowUpText({
      followUpText: renderedFollowUps[key] ?? rawFollowUpText,
      stageName,
      personaPolicy,
      language,
      lastCandidateAnswer,
    });
  }

  async buildRedirectText({
    language,
    lastCandidateAnswer,
    personaPolicy,
  }: {
    language: QuestionProbeLanguage;
    lastCandidateAnswer?: string;
    personaPolicy: PersonaPolicy;
  }): Promise<string> {
    const fallbacks: Record<QuestionProbeLanguage, string[]> = {
      vi: [
        'Bạn có thể cho tôi một ví dụ cụ thể không?',
        'Bạn có thể kể một tình huống thực tế bạn đã gặp không?',
        'Tôi muốn nghe một trường hợp cụ thể — bạn có thể chia sẻ không?',
        'Bạn có thể nói rõ hơn với một ví dụ từ công việc thực tế không?',
      ],
      en: [
        'Can you give me a concrete example?',
        'Could you walk me through a specific situation where this happened?',
        "Can you tell me about a real case you've dealt with?",
        "I'd love to hear a specific example — can you share one?",
      ],
      ja: [
        '具体的な例を教えていただけますか？',
        '実際に経験した状況を教えていただけますか？',
        '具体的なケースを共有していただけますか？',
      ],
    };

    if (lastCandidateAnswer) {
      try {
        const result: string = await this.groqService.generateContent({
          model: 'llama-3.1-8b-instant',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: this._redirectRenderPrompt({
                    lastCandidateAnswer,
                    personaPolicy,
                    language,
                  }),
                },
              ],
            },
          ],
          config: { maxOutputTokens: 80 },
        });
        if (result.trim()) return result.trim();
      } catch (error: unknown) {
        this.logger.warn(
          `Redirect render failed: ${this._errorMessage(error)}`,
        );
      }
    }

    const pool = fallbacks[language];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private async _renderFollowUpText({
    followUpText,
    stageName,
    personaPolicy,
    language,
    lastCandidateAnswer,
  }: {
    followUpText: string;
    stageName: string;
    personaPolicy: PersonaPolicy;
    language: QuestionProbeLanguage;
    lastCandidateAnswer?: string;
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
                  lastCandidateAnswer,
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

Stage context: ${stageName}

ABSOLUTE RULES:
- Output only the question itself — no preamble, no lead-in sentence, no "I understand...", no recap of what you are about to ask.
- Start directly with the question.`;
  }

  private _followUpRenderPrompt({
    followUpText,
    stageName,
    personaPolicy,
    language,
    lastCandidateAnswer,
  }: {
    followUpText: string;
    stageName: string;
    personaPolicy: PersonaPolicy;
    language: QuestionProbeLanguage;
    lastCandidateAnswer?: string;
  }): string {
    const answerContext = lastCandidateAnswer
      ? `\nCandidate's last answer: "${lastCandidateAnswer.slice(0, 300)}"`
      : '';
    return `You are ${personaPolicy.name}. Tone: ${personaPolicy.tone}.
You are continuing an interview. Do NOT give feedback or hints. Ask exactly one question. Language: ${language}.${answerContext}

Rephrase this follow-up naturally for your persona, referencing the candidate's answer if relevant:
"${followUpText}"

Context: candidate just answered a question about ${stageName}.

ABSOLUTE RULES:
- Output only the question itself — no preamble, no lead-in sentence, no "I understand...", no recap of what you are about to ask.
- Start directly with the question.`;
  }

  private _redirectRenderPrompt({
    lastCandidateAnswer,
    personaPolicy,
    language,
  }: {
    lastCandidateAnswer: string;
    personaPolicy: PersonaPolicy;
    language: QuestionProbeLanguage;
  }): string {
    return `You are ${personaPolicy.name}. Tone: ${personaPolicy.tone}.
The candidate just said: "${lastCandidateAnswer.slice(0, 300)}"
Their answer was too vague or generic. Ask them for a specific real example or situation. Language: ${language}.
One sentence only. No feedback, no hints. Natural, conversational.`;
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

  async buildProbeTransition({
    language,
    lastCandidateAnswer,
    personaPolicy,
  }: {
    language: QuestionProbeLanguage;
    lastCandidateAnswer?: string;
    personaPolicy: PersonaPolicy;
  }): Promise<string> {
    const fallbacks: Record<QuestionProbeLanguage, string[]> = {
      vi: [
        'Được rồi, cảm ơn bạn.',
        'Tôi hiểu ý bạn.',
        'Cảm ơn bạn đã chia sẻ.',
        'Được, cảm ơn.',
      ],
      en: [
        'Got it, thanks.',
        'Okay, I appreciate that.',
        'Thanks for sharing.',
        'Alright, thank you.',
      ],
      ja: [
        'ありがとうございます。',
        'なるほど、ありがとう。',
        'わかりました、ありがとうございます。',
      ],
    };

    if (lastCandidateAnswer) {
      try {
        const result: string = await this.groqService.generateContent({
          model: 'llama-3.1-8b-instant',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: this._probeTransitionPrompt({
                    lastCandidateAnswer,
                    personaPolicy,
                    language,
                  }),
                },
              ],
            },
          ],
          config: { maxOutputTokens: 60 },
        });
        const trimmed = result.trim();
        if (trimmed && !this._containsQuestion(trimmed)) return trimmed;
      } catch (error: unknown) {
        this.logger.warn(
          `Probe transition render failed: ${this._errorMessage(error)}`,
        );
      }
    }

    const pool = fallbacks[language];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  async buildStageTransition({
    prevStageName,
    nextStageName,
    personaPolicy,
    targetRole,
    language,
  }: {
    prevStageName: string;
    nextStageName: string;
    personaPolicy: PersonaPolicy;
    targetRole: string;
    language: QuestionProbeLanguage;
  }): Promise<string> {
    const fallbacks: Record<QuestionProbeLanguage, string[]> = {
      vi: [
        `Được rồi. Tiếp theo chúng ta chuyển sang phần ${nextStageName}.`,
        `Cảm ơn bạn. Chúng ta cùng chuyển qua ${nextStageName} nhé.`,
        `Phần tiếp theo sẽ là ${nextStageName}.`,
      ],
      en: [
        `Okay. Let's move on to ${nextStageName}.`,
        `Thanks. Now let's shift to ${nextStageName}.`,
        `Next up, we'll cover ${nextStageName}.`,
      ],
      ja: [
        `ありがとうございます。次は「${nextStageName}」に移りましょう。`,
        `では「${nextStageName}」のセクションに入ります。`,
      ],
    };

    try {
      const result: string = await this.groqService.generateContent({
        model: 'llama-3.1-8b-instant',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: this._stageTransitionPrompt({
                  prevStageName,
                  nextStageName,
                  personaPolicy,
                  targetRole,
                  language,
                }),
              },
            ],
          },
        ],
        config: { maxOutputTokens: 100 },
      });
      const trimmed = result.trim();
      if (trimmed && !this._containsQuestion(trimmed)) return trimmed;
    } catch (error: unknown) {
      this.logger.warn(
        `Stage transition render failed, using fallback: ${this._errorMessage(error)}`,
      );
    }

    const pool = fallbacks[language];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  async buildRephraseText({
    originalQuestion,
    language,
    personaPolicy,
  }: {
    originalQuestion: string;
    language: QuestionProbeLanguage;
    personaPolicy: PersonaPolicy;
  }): Promise<string> {
    try {
      const result: string = await this.groqService.generateContent({
        model: 'llama-3.1-8b-instant',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are ${personaPolicy.name}. Tone: ${personaPolicy.tone}.
The candidate asked for clarification. Rephrase this question in a clearer, more specific way. Language: ${language}.
Ask exactly one question. Do NOT give the answer or hints.

Original question: "${originalQuestion}"`,
              },
            ],
          },
        ],
        config: { maxOutputTokens: 150 },
      });
      return result.trim() || originalQuestion;
    } catch (error: unknown) {
      this.logger.warn(
        `Rephrase render failed, using original: ${this._errorMessage(error)}`,
      );
      return originalQuestion;
    }
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

  private _probeTransitionPrompt({
    lastCandidateAnswer,
    personaPolicy,
    language,
  }: {
    lastCandidateAnswer: string;
    personaPolicy: PersonaPolicy;
    language: QuestionProbeLanguage;
  }): string {
    return `You are ${personaPolicy.name}. Tone: ${personaPolicy.tone}.
The candidate just answered: "${lastCandidateAnswer.slice(0, 300)}"
Write a brief natural acknowledgment (1 sentence) before moving to the next question. Language: ${language}.
STRICT RULES — violating any rule means output is discarded and fallback is used:
- Output must be a statement, NOT a question. Do NOT end with "?" or use question words (what, how, why, can you, could you, hãy, bạn có thể, như thế nào, tại sao).
- Do NOT ask the candidate to continue, elaborate, or say more about their answer.
- Do NOT give feedback or evaluation.
- One sentence only.`;
  }

  private _stageTransitionPrompt({
    prevStageName,
    nextStageName,
    personaPolicy,
    targetRole,
    language,
  }: {
    prevStageName: string;
    nextStageName: string;
    personaPolicy: PersonaPolicy;
    targetRole: string;
    language: QuestionProbeLanguage;
  }): string {
    return `You are ${personaPolicy.name}. Tone: ${personaPolicy.tone}.
You are interviewing a candidate for a ${targetRole} position.
The "${prevStageName}" section has just finished. Now transition naturally to the "${nextStageName}" section.
Write 1-2 sentences. Language: ${language}.
STRICT RULES — violating any rule means output is discarded and fallback is used:
- Output must be statements only, NOT questions. Do NOT end any sentence with "?" or use question words (what, how, why, can you, could you, hãy, bạn có thể, như thế nào, tại sao).
- Do NOT ask anything — only announce the transition to the next section.
- Natural, not robotic. One to two sentences max.`;
  }

  private _containsQuestion(text: string): boolean {
    if (text.includes('?')) return true;
    const lower = text.toLowerCase();
    const questionStarters = [
      'hãy cho',
      'bạn có thể',
      'bạn hãy',
      'như thế nào',
      'tại sao',
      'vì sao',
      'can you',
      'could you',
      'would you',
      'please tell',
      'please describe',
      'please explain',
      'how do',
      'how did',
      'what is',
      'what are',
      'why did',
      'あなたは',
      'どのように',
      'なぜ',
      'できますか',
    ];
    return questionStarters.some((starter) => lower.includes(starter));
  }

  private _errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
