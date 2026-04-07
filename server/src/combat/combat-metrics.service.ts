import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CombatSessionAggregate } from './entities/combat-session-aggregate.entity';
import { IngestMetricsDto } from './dto/ingest-metrics.dto';

@Injectable()
export class CombatMetricsService {
  private readonly logger = new Logger(CombatMetricsService.name);

  constructor(
    @InjectRepository(CombatSessionAggregate)
    private aggRepo: Repository<CombatSessionAggregate>,
  ) {}

  async ingest(
    behavioralSessionId: string,
    dto: IngestMetricsDto,
  ): Promise<void> {
    let agg = await this.aggRepo.findOneBy({ behavioralSessionId });

    if (!agg) {
      agg = this.aggRepo.create({
        behavioralSessionId,
        sessionStartTs: dto.batchStartTs,
        eyeTotalFrames: 0,
        eyeScreenFrames: 0,
        fillerRateSum: 0,
        fillerFrameCount: 0,
        fillerWordCounts: {},
        exprConfidentCount: 0,
        exprStressedCount: 0,
        exprTotalValid: 0,
        stressPeakMinutes: [],
      });
    }

    // ── Eye tracking ──────────────────────────────────────────────────────────
    const eyeFrames = dto.eyeTracking ?? [];
    agg.eyeTotalFrames += eyeFrames.length;
    agg.eyeScreenFrames += eyeFrames.filter((f) => f.gaze === 'screen').length;

    // ── Filler words ──────────────────────────────────────────────────────────
    if (dto.fillerWords) {
      agg.fillerRateSum += dto.fillerWords.fillerRate;
      agg.fillerFrameCount += 1;
      for (const word of dto.fillerWords.detectedFillers ?? []) {
        agg.fillerWordCounts[word] = (agg.fillerWordCounts[word] ?? 0) + 1;
      }
    }

    // ── Expressions ───────────────────────────────────────────────────────────
    const validExprs = (dto.expressions ?? []).filter(
      (f) => f.confidence >= 0.6,
    );
    agg.exprTotalValid += validExprs.length;
    agg.exprConfidentCount += validExprs.filter(
      (f) => f.expression === 'confident',
    ).length;
    agg.exprStressedCount += validExprs.filter(
      (f) => f.expression === 'stressed',
    ).length;

    // ── Stress peak minutes ───────────────────────────────────────────────────
    const hasStress = validExprs.some((f) => f.expression === 'stressed');
    if (hasStress && agg.sessionStartTs) {
      const minute = Math.floor(
        (dto.batchStartTs - Number(agg.sessionStartTs)) / 60_000,
      );
      if (!agg.stressPeakMinutes.includes(minute)) {
        agg.stressPeakMinutes = [...agg.stressPeakMinutes, minute];
      }
    }

    await this.aggRepo.save(agg);

    this.logger.debug(
      `Aggregate updated for session ${behavioralSessionId} ` +
        `[eye: ${agg.eyeTotalFrames}, filler: ${agg.fillerFrameCount}, expr: ${agg.exprTotalValid}]`,
    );
  }
}
