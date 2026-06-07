import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClsService } from 'nestjs-cls';
import Redis from 'ioredis';
import { LlmUsageLog } from './entities/llm-usage-log.entity';
import { LlmAnomalyAlert } from './entities/llm-anomaly-alert.entity';
import { REDIS_CLIENT } from '../redis/redis.module';

const COST_PER_1K_TOKENS: Record<string, number> = {
  'llama-3.3-70b-versatile': 0.00059,
  'llama-3.1-8b-instant': 0.00005,
  'llama3-70b-8192': 0.00059,
  'llama3-8b-8192': 0.00005,
};

const LLM_THRESHOLDS: Record<string, number> = {
  'sd-assessor': 40,
  'behavior-probe': 35,
  'live-coding': 20,
  documents: 10,
  'question-scoring': 5,
};
const DEFAULT_THRESHOLD = 25;

const SESSION_TTL_SECONDS = 4 * 60 * 60;

@Injectable()
export class LlmTrackingService {
  private readonly logger = new Logger(LlmTrackingService.name);

  constructor(
    @InjectRepository(LlmUsageLog)
    private readonly usageLogRepo: Repository<LlmUsageLog>,
    @InjectRepository(LlmAnomalyAlert)
    private readonly anomalyRepo: Repository<LlmAnomalyAlert>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly cls: ClsService,
  ) {}

  track(params: {
    model: string;
    feature: string;
    inputTokens: number | null;
    outputTokens: number | null;
  }): void {
    // Fire-and-forget — không block caller
    this._doTrack(params).catch((err) =>
      this.logger.error('LLM tracking failed', err),
    );
  }

  private async _doTrack(params: {
    model: string;
    feature: string;
    inputTokens: number | null;
    outputTokens: number | null;
  }): Promise<void> {
    const userId = this.cls.get<string>('userId') ?? null;
    const sessionId = this.cls.get<string>('sessionId') ?? null;

    const costUsd = this._calcCost(
      params.model,
      params.inputTokens,
      params.outputTokens,
    );

    await this.usageLogRepo.save(
      this.usageLogRepo.create({
        model: params.model,
        feature: params.feature,
        userId,
        sessionId,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        costUsd,
      }),
    );

    if (sessionId) {
      await this._checkAnomaly({
        userId,
        sessionId,
        feature: params.feature,
      });
    }
  }

  private async _checkAnomaly(params: {
    userId: string | null;
    sessionId: string;
    feature: string;
  }): Promise<void> {
    const key = `llm:session:${params.sessionId}:${params.feature}`;
    const count = await this.redis.incr(key);
    await this.redis.expire(key, SESSION_TTL_SECONDS);

    const threshold = LLM_THRESHOLDS[params.feature] ?? DEFAULT_THRESHOLD;
    if (count !== threshold + 1) return; // Chỉ trigger đúng lần vượt ngưỡng, không spam

    const existing = await this.anomalyRepo.findOne({
      where: {
        sessionId: params.sessionId,
        feature: params.feature,
      },
    });
    if (existing) return;

    const alert = await this.anomalyRepo.save(
      this.anomalyRepo.create({
        userId: params.userId ?? 'unknown',
        sessionId: params.sessionId,
        feature: params.feature,
        callCount: count,
        threshold,
        notifiedAt: new Date(),
      }),
    );

    if (params.userId) {
      const payload = JSON.stringify({
        type: 'llm_anomaly',
        alertId: alert.id,
        feature: params.feature,
        callCount: count,
        threshold,
        sessionId: params.sessionId,
      });
      await this.redis.publish(`notify:${params.userId}`, payload);
    }
  }

  private _calcCost(
    model: string,
    inputTokens: number | null,
    outputTokens: number | null,
  ): number | null {
    const rate = COST_PER_1K_TOKENS[model];
    if (!rate || inputTokens == null || outputTokens == null) return null;
    return ((inputTokens + outputTokens) / 1000) * rate;
  }
}
