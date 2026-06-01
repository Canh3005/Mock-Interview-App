import { Injectable, Logger } from '@nestjs/common';
import { GroqService } from '../ai/groq.service';
import type {
  SDClarificationIntent,
  SDWalkthroughIntent,
  SDDeepDiveIntent,
  SDWrapUpIntent,
} from './types/sd-orchestrator.types';

const GROQ_MODEL = 'llama-3.1-8b-instant';

@Injectable()
export class SDQuestionRendererService {
  private readonly logger = new Logger(SDQuestionRendererService.name);

  constructor(private readonly groq: GroqService) {}

  // ─── Validator ──────────────────────────────────────────────────────────────

  private passesValidator(
    text: string,
    intent: { forbiddenHints: string[]; maxSentences: number },
  ): boolean {
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
  ): Promise<string> {
    try {
      const rendered = await this.groq.generateContent({
        model: GROQ_MODEL,
        contents: [{ role: 'user', parts: [{ text: promptTemplate }] }],
        config: {
          systemInstruction,
          maxOutputTokens: 200,
        },
      });
      const trimmed = rendered.trim();
      if (this.passesValidator(trimmed, intent)) {
        return trimmed;
      }
      this.logger.warn('Renderer validator failed, using fallback');
    } catch (err) {
      this.logger.warn(`Renderer LLM error: ${(err as Error).message}`);
    }
    return this.enforceSentenceLimit(fallbackText, intent.maxSentences);
  }

  // ─── Stage 1 — Clarification ────────────────────────────────────────────────

  async renderClarification(
    intent: SDClarificationIntent,
    factAnswer?: string,
  ): Promise<string> {
    if (intent.type === 'OPENING') {
      return this.enforceSentenceLimit(
        intent.promptTemplate,
        intent.maxSentences,
      );
    }
    if (intent.type === 'ANSWER_FACT' && factAnswer) {
      const system = `You are an interviewer answering a candidate's clarification question.
Answer concisely using ONLY the provided fact. Do not add extra requirements, do not mention architecture/implementation details.
Language: ${intent.language}. Max ${intent.maxSentences} sentences.`;
      const prompt = intent.promptTemplate.replace('{answer}', factAnswer);
      return this.renderWithFallback(prompt, system, intent, factAnswer);
    }
    if (intent.type === 'NUDGE') {
      const system = `You are an interviewer nudging a candidate to ask about requirements they haven't covered yet.
Do NOT reveal what dimension is missing. Be natural and brief.
Language: ${intent.language}. Max ${intent.maxSentences} sentences.`;
      return this.renderWithFallback(
        intent.promptTemplate,
        system,
        intent,
        intent.promptTemplate,
      );
    }
    if (intent.type === 'REDIRECT') {
      const system = `You are an interviewer redirecting a candidate who jumped to implementation too early.
Bring them back to requirements gathering without hinting at missing requirements.
Language: ${intent.language}. Max ${intent.maxSentences} sentences.`;
      return this.renderWithFallback(
        intent.promptTemplate,
        system,
        intent,
        intent.promptTemplate,
      );
    }
    return this.enforceSentenceLimit(
      intent.promptTemplate,
      intent.maxSentences,
    );
  }

  // ─── Stage 2 — Walkthrough ──────────────────────────────────────────────────

  async renderWalkthrough(intent: SDWalkthroughIntent): Promise<string> {
    const system = `You are a system design interviewer asking the candidate to explain their diagram.
Be concise and direct. Do not reveal answers. Language: ${intent.language}. Max ${intent.maxSentences} sentences.`;
    return this.renderWithFallback(
      intent.promptTemplate,
      system,
      intent,
      intent.promptTemplate,
    );
  }

  // ─── Stage 3 — Deep Dive ────────────────────────────────────────────────────

  async renderDeepDive(intent: SDDeepDiveIntent): Promise<string> {
    const system = `You are a system design interviewer probing technical depth on ${intent.target?.probeDimension ?? 'a specific area'}.
Ask focused questions. Do not reveal expected signals or answers.
Language: ${intent.language}. Max ${intent.maxSentences} sentences.`;
    return this.renderWithFallback(
      intent.promptTemplate,
      system,
      intent,
      intent.promptTemplate,
    );
  }

  // ─── Stage 4 — Wrap-Up ──────────────────────────────────────────────────────

  async renderWrapUp(intent: SDWrapUpIntent): Promise<string> {
    const system = `You are a system design interviewer presenting a failure or scaling scenario.
Deliver the scenario naturally. Do not pre-reveal mitigations or expected answers.
Language: ${intent.language}. Max ${intent.maxSentences} sentences.`;
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
}
