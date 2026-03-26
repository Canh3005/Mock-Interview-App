import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

export interface GroqMessage {
  role: 'user' | 'model' | 'system';
  parts: { text: string }[];
}

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

  constructor(private configService: ConfigService) {
    this.client = new Groq({
      apiKey: this.configService.get<string>('GROQ_API_KEY'),
    });
  }

  async generateContent(params: {
    model: string;
    contents: GroqMessage[];
    config?: { systemInstruction?: string; maxOutputTokens?: number };
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
    return completion.choices[0]?.message?.content ?? '';
  }

  async *generateContentStream(params: {
    model: string;
    contents: GroqMessage[];
    config?: { systemInstruction?: string; maxOutputTokens?: number };
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
      yield { text };
    }
  }
}
