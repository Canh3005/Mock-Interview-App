import { Global, Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { GroqService } from './groq.service';

@Global()
@Module({
  providers: [GeminiService, GroqService],
  exports: [GeminiService, GroqService],
})
export class AiModule {}
