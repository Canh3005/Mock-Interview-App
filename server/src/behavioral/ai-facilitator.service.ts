import { Injectable, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { GroqService } from '../ai/groq.service';
import {
  PromptBuilderService,
  EvaluationMode,
  STAGE_EVALUATION_MODE,
} from './prompt-builder.service';

export interface StarStatus {
  situation: boolean;
  task: boolean;
  action: boolean;
  result: boolean;
}

export interface TurnContext {
  role: 'user' | 'model';
  parts: { text: string }[];
}

// Rule-based pre-filter patterns
const CLEARLY_IRRELEVANT_PATTERNS = [
  /^(.)\1{10,}$/,
  /^[^a-zA-ZÀ-ỹ0-9\s]{5,}$/,
  /lorem ipsum/i,
  /test\s*test\s*test/i,
];

const MAX_INPUT_CHARS = 2000;

@Injectable()
export class AIFacilitatorService {
  private readonly logger = new Logger(AIFacilitatorService.name);
  private readonly mainModel = 'llama-3.3-70b-versatile';
  private readonly miniModel = 'llama-3.1-8b-instant';

  constructor(
    private groqService: GroqService,
    private promptBuilder: PromptBuilderService,
  ) {}

  // ─── Input Quality Guard ──────────────────────────────────────────────────

  truncateAndFlag(content: string): { content: string; truncated: boolean } {
    if (content.length > MAX_INPUT_CHARS) {
      return { content: content.slice(0, MAX_INPUT_CHARS), truncated: true };
    }
    return { content, truncated: false };
  }

  isObviouslyIrrelevant(input: string): boolean {
    if (input.trim().length < 5) return true;
    return CLEARLY_IRRELEVANT_PATTERNS.some((p) => p.test(input));
  }

  async checkRelevance(
    currentQuestion: string,
    userMessage: string,
  ): Promise<{ relevant: boolean; reason: string }> {
    const prompt = `Câu hỏi phỏng vấn: "${currentQuestion}"
Câu trả lời ứng viên: "${userMessage}"

Trả về JSON một dòng: {"relevant": true/false, "reason": "brief"}
Chỉ đánh dấu false nếu câu trả lời HOÀN TOÀN không liên quan đến câu hỏi.`;

    try {
      const raw = (
        await this.groqService.generateContent({
          model: this.miniModel,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { maxOutputTokens: 60 },
        })
      ).trim();
      const jsonStr = raw.startsWith('{') ? raw : raw.replace(/^[^{]*/, '');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return JSON.parse(jsonStr);
    } catch {
      return { relevant: true, reason: 'parse_error' };
    }
  }

  // ─── STAR Completeness Detector ───────────────────────────────────────────

  async checkStarCompleteness(userMessage: string): Promise<StarStatus> {
    const prompt = `Phân tích câu trả lời sau và cho biết ứng viên đã đề cập đủ các yếu tố STAR chưa.
Trả về JSON: {"situation": true/false, "task": true/false, "action": true/false, "result": true/false}
Câu trả lời: "${userMessage}"`;

    try {
      const raw = (
        await this.groqService.generateContent({
          model: this.miniModel,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { maxOutputTokens: 80 },
        })
      ).trim();
      const jsonStr = raw.startsWith('{') ? raw : raw.replace(/^[^{]*/, '');
      return JSON.parse(jsonStr) as StarStatus;
    } catch {
      return { situation: true, task: true, action: true, result: true };
    }
  }

  // ─── Context compression ─────────────────────────────────────────────────

  async summarizePreviousTurns(turns: TurnContext[]): Promise<string> {
    if (turns.length <= 4) return '';
    const toSummarize = turns.slice(0, turns.length - 4);
    const transcript = toSummarize
      .map(
        (t) => `${t.role === 'user' ? 'Ứng viên' : 'AI'}: ${t.parts[0].text}`,
      )
      .join('\n');
    const prompt = `Tóm tắt ngắn gọn (tối đa 200 từ) đoạn hội thoại sau để giữ ngữ cảnh:\n${transcript}`;
    try {
      const summary = await this.groqService.generateContent({
        model: this.miniModel,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { maxOutputTokens: 300 },
      });
      return `[Tóm tắt các lượt trước: ${summary}]`;
    } catch {
      return '';
    }
  }

  // ─── Streaming main facilitator ──────────────────────────────────────────

  async streamFacilitatorResponse(params: {
    res: Response;
    systemPrompt: string;
    history: TurnContext[];
    userMessage: string;
    stage?: number;
    extraMeta?: Record<string, unknown>;
  }): Promise<{ fullText: string; starStatus: StarStatus }> {
    const {
      res,
      systemPrompt,
      history,
      userMessage,
      stage = 1,
      extraMeta,
    } = params;

    // Compress old turns if needed
    let contextPrefix = '';
    if (history.length > 4) {
      contextPrefix = await this.summarizePreviousTurns(history);
    }
    const recentHistory = history.slice(-4);

    // Build contents array
    const contents: TurnContext[] = [
      ...recentHistory,
      { role: 'user', parts: [{ text: userMessage }] },
    ];

    if (contextPrefix) {
      // Prepend summary as first user message for context
      contents.unshift({
        role: 'user',
        parts: [{ text: contextPrefix }],
      });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let fullText = '';

    try {
      const stream = this.groqService.generateContentStream({
        model: this.mainModel,
        contents,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 1024,
        },
      });

      for await (const chunk of stream) {
        const token = chunk.text ?? '';
        if (token) {
          fullText += token;
          res.write(`data: ${JSON.stringify({ token, done: false })}\n\n`);
        }
      }

      // Run STAR check — skip for technical/reverse-interview stages
      const mode =
        STAGE_EVALUATION_MODE[stage] ?? EvaluationMode.STAR_BEHAVIORAL;
      const starStatus =
        mode === EvaluationMode.STAR_BEHAVIORAL
          ? await this.checkStarCompleteness(userMessage)
          : { situation: true, task: true, action: true, result: true };

      res.write(
        `data: ${JSON.stringify({ done: true, meta: { starStatus, ...(extraMeta ?? {}) } })}\n\n`,
      );
      res.end();

      return { fullText, starStatus };
    } catch (err) {
      this.logger.error('Streaming error', err);
      res.write(
        `data: ${JSON.stringify({ done: true, error: 'LLM error', meta: { starStatus: { situation: true, task: true, action: true, result: true }, ...(extraMeta ?? {}) } })}\n\n`,
      );
      res.end();
      return {
        fullText,
        starStatus: { situation: true, task: true, action: true, result: true },
      };
    }
  }
}
