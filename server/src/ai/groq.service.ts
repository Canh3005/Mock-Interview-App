import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import type { GroqMessage } from './types/groq.types';
import { LlmTrackingService } from './llm-tracking.service';

function toOpenAIMessages(
  contents: GroqMessage[],
  systemInstruction?: string,
): Groq.Chat.ChatCompletionMessageParam[] {
  const msgs: Groq.Chat.ChatCompletionMessageParam[] = [];
  if (systemInstruction) {
    msgs.push({ role: 'system', content: systemInstruction });
  }
  for (const c of contents) {
    const role =
      c.role === 'model'
        ? 'assistant'
        : c.role === 'system'
          ? 'system'
          : 'user';
    msgs.push({ role, content: c.parts.map((p) => p.text).join('') });
  }
  return msgs;
}

@Injectable()
export class GroqService {
  private readonly client: Groq;

  constructor(
    private configService: ConfigService,
    private trackingService: LlmTrackingService,
  ) {
    this.client = new Groq({
      apiKey: this.configService.get<string>('GROQ_API_KEY'),
    });
  }

  async generateContent(params: {
    model: string;
    contents: GroqMessage[];
    config?: { systemInstruction?: string; maxOutputTokens?: number };
    feature?: string;
  }): Promise<string> {
    const messages = toOpenAIMessages(
      params.contents,
      params.config?.systemInstruction,
    );
    const completion = await this.client.chat.completions.create({
      model: params.model,
      messages,
      max_tokens: params.config?.maxOutputTokens ?? 1024,
    });

    this.trackingService.track({
      model: params.model,
      feature: params.feature ?? 'unknown',
      inputTokens: completion.usage?.prompt_tokens ?? null,
      outputTokens: completion.usage?.completion_tokens ?? null,
    });

    return completion.choices[0]?.message?.content ?? '';
  }

  async generateJsonContent(params: {
    model: string;
    contents: GroqMessage[];
    config?: {
      systemInstruction?: string;
      maxOutputTokens?: number;
      temperature?: number;
    };
    feature?: string;
  }): Promise<string> {
    const messages: Groq.Chat.ChatCompletionMessageParam[] = toOpenAIMessages(
      params.contents,
      params.config?.systemInstruction,
    );
    const completion: Groq.Chat.ChatCompletion =
      await this.client.chat.completions.create({
        model: params.model,
        messages,
        max_tokens: params.config?.maxOutputTokens ?? 1024,
        temperature: params.config?.temperature,
        response_format: { type: 'json_object' },
      });

    this.trackingService.track({
      model: params.model,
      feature: params.feature ?? 'unknown',
      inputTokens: completion.usage?.prompt_tokens ?? null,
      outputTokens: completion.usage?.completion_tokens ?? null,
    });

    return completion.choices[0]?.message?.content ?? '';
  }

  async *generateContentStream(params: {
    model: string;
    contents: GroqMessage[];
    config?: { systemInstruction?: string; maxOutputTokens?: number };
    feature?: string;
  }): AsyncIterable<{ text: string }> {
    const messages = toOpenAIMessages(
      params.contents,
      params.config?.systemInstruction,
    );
    const stream = await this.client.chat.completions.create({
      model: params.model,
      messages,
      max_tokens: params.config?.maxOutputTokens ?? 1024,
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? '';
      if (text) yield { text };
    }

    // Token counts not available for streaming in current SDK version;
    // call count is still tracked for anomaly detection via Redis INCR.
    this.trackingService.track({
      model: params.model,
      feature: params.feature ?? 'unknown',
      inputTokens: null,
      outputTokens: null,
    });
  }
}
