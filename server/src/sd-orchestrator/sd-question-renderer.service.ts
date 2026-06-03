import { Injectable, Logger } from '@nestjs/common';
import { GroqService } from '../ai/groq.service';
import type {
  SDClarificationIntent,
  SDStage,
  SDWalkthroughIntent,
  SDDeepDiveIntent,
  SDWrapUpIntent,
} from './types/sd-orchestrator.types';
import { LANGUAGE_NAMES } from './constants/sd-renderer.constants';
import { SD_QUESTION_RENDERER_GROQ_MODEL } from './constants/sd-renderer-model.constants';

@Injectable()
export class SDQuestionRendererService {
  private readonly logger = new Logger(SDQuestionRendererService.name);

  constructor(private readonly groq: GroqService) {}

  // ─── Validator ──────────────────────────────────────────────────────────────

  private passesValidator(
    text: string,
    intent: { forbiddenHints: string[]; maxSentences: number },
    options?: { allowQuestions?: boolean },
  ): boolean {
    if (options?.allowQuestions === false && /[?？]/.test(text)) {
      return false;
    }
    const lower = text.toLowerCase();
    for (const hint of intent.forbiddenHints) {
      if (lower.includes(hint.toLowerCase())) return false;
    }
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    if (sentences.length > intent.maxSentences) return false;
    return true;
  }

  private enforceSentenceLimit(text: string, maxSentences: number): string {
    const sentences = text.split(/(?<=[.!?])\s+/);
    return sentences.slice(0, maxSentences).join(' ').trim();
  }

  // ─── Render helpers ─────────────────────────────────────────────────────────

  private async renderWithFallback(
    promptTemplate: string,
    systemInstruction: string,
    intent: { forbiddenHints: string[]; maxSentences: number },
    fallbackText: string,
    options?: { allowQuestions?: boolean },
  ): Promise<string> {
    try {
      const rendered = await this.groq.generateContent({
        model: SD_QUESTION_RENDERER_GROQ_MODEL,
        contents: [{ role: 'user', parts: [{ text: promptTemplate }] }],
        config: {
          systemInstruction,
          maxOutputTokens: 200,
        },
      });
      const trimmed = rendered.trim();
      if (this.passesValidator(trimmed, intent, options)) {
        return trimmed;
      }
      this.logger.warn('Renderer validator failed, using fallback');
    } catch (err) {
      this.logger.warn(`Renderer LLM error: ${(err as Error).message}`);
    }
    return this.enforceSentenceLimit(fallbackText, intent.maxSentences);
  }

  buildRedirectFallback(language: 'vi' | 'en' | 'ja'): string {
    const fallbacks: Record<'vi' | 'en' | 'ja', string> = {
      vi: 'Hãy dành thêm thời gian làm rõ yêu cầu trước khi đi vào thiết kế.',
      en: "Let's spend a bit more time clarifying requirements before diving into the design.",
      ja: '設計に入る前に、もう少し要件を整理しましょう。',
    };
    return fallbacks[language] ?? fallbacks.en;
  }

  buildClarificationNudgeFallback(language: 'vi' | 'en' | 'ja'): string {
    const fallbacks: Record<'vi' | 'en' | 'ja', string> = {
      vi: 'bạn có thể đưa câu hỏi cụ thể hơn để làm rõ yêu cầu trước khi bắt đầu thiết kế không ?',
      en: 'Could you ask a more specific question to clarify the requirements before starting the design?',
      ja: '設計を始める前に、要件を明確にするためにもう少し具体的な質問をしていただけますか？',
    };
    return fallbacks[language] ?? fallbacks.en;
  }

  // ─── Stage 1 — Clarification ────────────────────────────────────────────────

  async renderClarification(
    intent: SDClarificationIntent,
    factAnswer?: string,
    candidateAnswer?: string,
  ): Promise<string> {
    if (intent.type === 'OPENING') {
      return this.enforceSentenceLimit(
        intent.promptTemplate,
        intent.maxSentences,
      );
    }
    if (intent.type === 'ANSWER_FACT' && factAnswer) {
      const langName = LANGUAGE_NAMES[intent.language] ?? intent.language;
      const system = `You are an interviewer answering a candidate's clarification question.
Answer concisely using ONLY the provided fact. Do not add extra requirements, do not mention architecture/implementation details. Return a declarative answer only; do not ask the candidate any question.
You MUST respond in ${langName}. Max ${intent.maxSentences} sentences.`;
      const prompt = intent.promptTemplate.replace('{answer}', factAnswer);
      return this.renderWithFallback(prompt, system, intent, factAnswer, {
        allowQuestions: false,
      });
    }
    if (intent.type === 'NUDGE') {
      const langName = LANGUAGE_NAMES[intent.language] ?? intent.language;
      const system = `You are a system design interviewer. The candidate has not covered all required dimensions yet.
Give a short, natural open-ended nudge — like a real interviewer would say in conversation.
Do NOT name or hint at the missing dimension. Do NOT ask two questions at once. Do NOT lead the candidate to a specific topic.
You MUST respond in ${langName}. Max ${intent.maxSentences} sentences.`;
      return this.renderWithFallback(
        intent.promptTemplate,
        system,
        intent,
        this.buildClarificationNudgeFallback(intent.language),
      );
    }
    if (intent.type === 'REDIRECT') {
      const langName = LANGUAGE_NAMES[intent.language] ?? intent.language;
      const system = `You are an interviewer redirecting a candidate who jumped to implementation too early.
Bring them back to requirements gathering without hinting at missing requirements.
You MUST respond in ${langName}. Max ${intent.maxSentences} sentences.`;
      const context = candidateAnswer
        ? `Candidate said: "${candidateAnswer}"\n\n${intent.promptTemplate}`
        : intent.promptTemplate;
      return this.renderWithFallback(
        context,
        system,
        intent,
        this.buildRedirectFallback(intent.language),
      );
    }
    return this.enforceSentenceLimit(
      intent.promptTemplate,
      intent.maxSentences,
    );
  }

  // ─── Stage 2 — Walkthrough ──────────────────────────────────────────────────

  async renderWalkthrough(intent: SDWalkthroughIntent): Promise<string> {
    const langName = LANGUAGE_NAMES[intent.language] ?? intent.language;
    const system = `You are a system design interviewer asking the candidate to explain their diagram.
Be concise and direct. Do not reveal answers. You MUST respond in ${langName}. Max ${intent.maxSentences} sentences.`;
    return this.renderWithFallback(
      intent.promptTemplate,
      system,
      intent,
      intent.promptTemplate,
    );
  }

  // ─── Stage 3 — Deep Dive ────────────────────────────────────────────────────

  async renderDeepDive(intent: SDDeepDiveIntent): Promise<string> {
    const langName = LANGUAGE_NAMES[intent.language] ?? intent.language;
    const system = `You are a system design interviewer probing technical depth on ${intent.target?.probeDimension ?? 'a specific area'}.
Ask focused questions. Do not reveal expected signals or answers.
You MUST respond in ${langName}. Max ${intent.maxSentences} sentences.`;
    return this.renderWithFallback(
      intent.promptTemplate,
      system,
      intent,
      intent.promptTemplate,
    );
  }

  // ─── Stage 4 — Wrap-Up ──────────────────────────────────────────────────────

  async renderWrapUp(intent: SDWrapUpIntent): Promise<string> {
    const langName = LANGUAGE_NAMES[intent.language] ?? intent.language;
    const system = `You are a system design interviewer presenting a failure or scaling scenario.
Deliver the scenario naturally. Do not pre-reveal mitigations or expected answers.
You MUST respond in ${langName}. Max ${intent.maxSentences} sentences.`;
    return this.renderWithFallback(
      intent.promptTemplate,
      system,
      intent,
      intent.promptTemplate,
    );
  }

  // ─── Transition text ────────────────────────────────────────────────────────

  buildTransitionText(
    fromStage: string,
    toStage: string,
    language: 'vi' | 'en' | 'ja',
  ): string {
    const map: Record<string, Record<string, string>> = {
      CLARIFICATION_to_DESIGN_DRAWING: {
        vi: 'Tốt rồi. Hãy vẽ kiến trúc của bạn — bạn có thể nêu assumptions trong khi vẽ.',
        en: 'Good. Go ahead and draw your architecture — feel free to state your assumptions as you start.',
        ja: 'よし、アーキテクチャを描いてください。描きながら前提条件を述べても構いません。',
      },
      DESIGN_DRAWING_to_DESIGN_WALKTHROUGH: {
        vi: 'Tốt. Hãy trình bày thiết kế của bạn.',
        en: 'Good. Walk me through your design.',
        ja: '良いです。設計を説明してください。',
      },
      DESIGN_WALKTHROUGH_to_DEEP_DIVE: {
        vi: 'Tổng quan tốt. Hãy đi sâu vào một số khía cạnh.',
        en: 'Good overview. Let me dig deeper into a few areas.',
        ja: '良い概要です。いくつかの点をより深く掘り下げましょう。',
      },
      DEEP_DIVE_to_WRAP_UP: {
        vi: 'Tốt. Bây giờ hãy xem xét một số tình huống.',
        en: "Good. Now let's look at some scenarios.",
        ja: 'よし。いくつかのシナリオを見てみましょう。',
      },
    };
    const key = `${fromStage}_to_${toStage}`;
    return (
      map[key]?.[language] ??
      map[key]?.['en'] ??
      `Moving from ${fromStage} to ${toStage}.`
    );
  }

  buildEmptyCanvasNudge(language: 'vi' | 'en' | 'ja'): string {
    const texts: Record<string, string> = {
      vi: 'Canvas đang trống — hãy phác thảo thiết kế của bạn trước.',
      en: 'Looks like the canvas is empty — go ahead and sketch your design first.',
      ja: 'キャンバスが空です — まず設計を描いてください。',
    };
    return texts[language] ?? texts['en'];
  }

  buildStageStatusText(stage: SDStage, language: 'vi' | 'en' | 'ja'): string {
    const texts: Record<SDStage, Record<'vi' | 'en' | 'ja', string>> = {
      CLARIFICATION: {
        vi: 'Phiên đang ở phần làm rõ yêu cầu. Hãy tiếp tục đặt câu hỏi để chốt phạm vi bài toán.',
        en: 'The session is currently in requirements clarification. Please continue asking questions to clarify the problem scope.',
        ja: 'セッションは要件確認の段階です。問題の範囲を明確にするため、質問を続けてください。',
      },
      DESIGN_DRAWING: {
        vi: 'Phiên đang ở phần vẽ kiến trúc. Hãy tiếp tục hoàn thiện sơ đồ thiết kế của bạn.',
        en: 'The session is currently in the architecture drawing stage. Please continue working on your design diagram.',
        ja: 'セッションはアーキテクチャ図の作成段階です。設計図の作成を続けてください。',
      },
      DESIGN_WALKTHROUGH: {
        vi: 'Phiên đang ở phần trình bày thiết kế. Hãy tiếp tục giải thích kiến trúc và luồng chính của bạn.',
        en: 'The session is currently in the design walkthrough stage. Please continue explaining your architecture and main flows.',
        ja: 'セッションは設計説明の段階です。アーキテクチャと主要なフローの説明を続けてください。',
      },
      DEEP_DIVE: {
        vi: 'Phiên đang ở phần đào sâu kỹ thuật. Hãy tiếp tục trả lời các câu hỏi chi tiết về thiết kế của bạn.',
        en: 'The session is currently in the technical deep-dive stage. Please continue answering detailed questions about your design.',
        ja: 'セッションは技術的な深掘りの段階です。設計に関する詳細な質問への回答を続けてください。',
      },
      WRAP_UP: {
        vi: 'Phiên đang ở phần tình huống mở rộng. Hãy tiếp tục xử lý các kịch bản và thay đổi yêu cầu được đưa ra.',
        en: 'The session is currently in the wrap-up scenario stage. Please continue handling the proposed scenarios and requirement changes.',
        ja: 'セッションはまとめのシナリオ段階です。提示されたシナリオや要件変更への対応を続けてください。',
      },
      EVALUATING: {
        vi: 'Phiên đang được đánh giá. Vui lòng chờ kết quả tổng hợp.',
        en: 'The session is currently being evaluated. Please wait for the final summary.',
        ja: 'セッションは評価中です。最終サマリーをお待ちください。',
      },
      COMPLETED: {
        vi: 'Phiên đã hoàn tất. Bạn có thể xem lại kết quả đánh giá.',
        en: 'The session has been completed. You can review the evaluation results.',
        ja: 'セッションは完了しました。評価結果を確認できます。',
      },
    };

    return texts[stage]?.[language] ?? texts[stage]?.en ?? texts.EVALUATING.en;
  }
}
