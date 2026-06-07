import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeminiService } from './gemini.service';
import { GroqService } from './groq.service';
import { LlmTrackingService } from './llm-tracking.service';
import { LlmUsageLog } from './entities/llm-usage-log.entity';
import { LlmAnomalyAlert } from './entities/llm-anomaly-alert.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([LlmUsageLog, LlmAnomalyAlert])],
  providers: [GeminiService, GroqService, LlmTrackingService],
  exports: [GeminiService, GroqService, LlmTrackingService],
})
export class AiModule {}
