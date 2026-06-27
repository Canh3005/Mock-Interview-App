import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class GeminiService {
  private readonly ai: GoogleGenAI;

  constructor(private configService: ConfigService) {
    this.ai = new GoogleGenAI({
      apiKey: this.configService.get<string>('GEMINI_API_KEY'),
    });
  }

  async generateContent(params: {
    model: string;
    contents: any;
    config?: any;
  }): Promise<string> {
    const response = await this.ai.models.generateContent(params);
    return response.text ?? '';
  }

  async embedContent(params: {
    model: string;
    contents: any;
    config?: any;
  }): Promise<number[]> {
    const response = await this.ai.models.embedContent(params);
    const values = response.embeddings?.[0]?.values ?? [];
    return values.map((value: number) => Number(value));
  }

  async embedContents(params: {
    model: string;
    contents: string[];
    config?: any;
  }): Promise<number[][]> {
    const response = await this.ai.models.embedContent(params);
    const embeddings = response.embeddings ?? [];
    return embeddings.map((embedding) =>
      (embedding.values ?? []).map((value: number) => Number(value)),
    );
  }

  generateContentStream(params: {
    model: string;
    contents: any;
    config?: any;
  }) {
    return this.ai.models.generateContentStream(params);
  }
}
