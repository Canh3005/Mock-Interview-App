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
}
