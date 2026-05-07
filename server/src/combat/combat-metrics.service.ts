import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CombatSessionAggregate } from './entities/combat-session-aggregate.entity';
import { IngestMetricsDto } from './dto/ingest-metrics.dto';
import { ProctoringEventDto } from './dto/proctoring-event.dto';
import { ProctoringEvent } from './entities/proctoring-event.entity';
import { ProctoringSession } from './entities/proctoring-session.entity';

@Injectable()
export class CombatMetricsService {
  private readonly logger = new Logger(CombatMetricsService.name);

  constructor(
    @InjectRepository(CombatSessionAggregate)
    private aggRepo: Repository<CombatSessionAggregate>,
    @InjectRepository(ProctoringEvent)
    private eventRepo: Repository<ProctoringEvent>,
    @InjectRepository(ProctoringSession)
    private proctoringSessionRepo: Repository<ProctoringSession>,
  ) {}

  async ingest(
    interviewSessionId: string,
    dto: IngestMetricsDto,
  ): Promise<void> {
    let agg: CombatSessionAggregate | null = await this.aggRepo.findOneBy({
      interviewSessionId,
    });

    if (!agg) {
      agg = this.aggRepo.create({
        interviewSessionId,
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
      const minute: number = Math.floor(
        (dto.batchStartTs - Number(agg.sessionStartTs)) / 60_000,
      );
      if (!agg.stressPeakMinutes.includes(minute)) {
        agg.stressPeakMinutes = [...agg.stressPeakMinutes, minute];
      }
    }

    await this.aggRepo.save(agg);

    this.logger.debug(
      `Aggregate updated for interview session ${interviewSessionId} ` +
        `[eye: ${agg.eyeTotalFrames}, filler: ${agg.fillerFrameCount}, expr: ${agg.exprTotalValid}]`,
    );
  }

  async ingestProctoringEvent(
    interviewSessionId: string,
    dto: ProctoringEventDto,
  ): Promise<void> {
    const normalized = this._normalizeEventDto(dto);
    const session: ProctoringSession =
      await this._ensureProctoringSession(interviewSessionId);

    const existing: ProctoringEvent | null = await this.eventRepo.findOneBy({
      clientEventId: normalized.clientEventId,
    });
    if (existing) return;

    await this.eventRepo.save({
      clientEventId: normalized.clientEventId,
      proctoringSessionId: session.id,
      ts: normalized.ts,
      eventType: normalized.eventType,
      severity: normalized.severity,
      durationMs: normalized.durationMs ?? null,
      metadata: normalized.metadata ?? null,
    });

    await this._incrementCounters(session, normalized.severity);
  }

  async ingestProctoringEventBatch(
    interviewSessionId: string,
    events: ProctoringEventDto[],
  ): Promise<void> {
    if (!events?.length) return;
    for (const event of events) {
      await this.ingestProctoringEvent(interviewSessionId, event);
    }
  }

  private _normalizeEventDto(dto: ProctoringEventDto): {
    clientEventId: string;
    ts: number;
    eventType: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    durationMs?: number;
    metadata?: Record<string, unknown>;
  } {
    const eventType: string = dto.eventType ?? dto.type;
    const severity: 'LOW' | 'MEDIUM' | 'HIGH' = dto.severity ?? 'LOW';
    const clientEventId: string =
      dto.clientEventId ?? this._buildFallbackClientEventId(dto);
    return {
      clientEventId,
      ts: dto.ts,
      eventType,
      severity,
      durationMs: dto.durationMs,
      metadata: dto.metadata,
    };
  }

  private _buildFallbackClientEventId(dto: ProctoringEventDto): string {
    const eventType: string = dto.eventType ?? dto.type;
    return `${eventType}:${dto.ts}:${dto.durationMs ?? 0}`;
  }

  private async _ensureProctoringSession(
    interviewSessionId: string,
  ): Promise<ProctoringSession> {
    let session: ProctoringSession | null =
      await this.proctoringSessionRepo.findOne({
        where: { interviewSessionId },
      });

    if (!session) {
      session = await this.proctoringSessionRepo.save(
        this.proctoringSessionRepo.create({
          interviewSessionId,
          highFlagCount: 0,
          mediumFlagCount: 0,
          lowFlagCount: 0,
          integrityScore: 100,
          summary: null,
        }),
      );
    }

    return session;
  }

  private async _incrementCounters(
    session: ProctoringSession,
    severity: 'LOW' | 'MEDIUM' | 'HIGH',
  ): Promise<void> {
    if (severity === 'HIGH') session.highFlagCount += 1;
    else if (severity === 'MEDIUM') session.mediumFlagCount += 1;
    else session.lowFlagCount += 1;

    await this.proctoringSessionRepo.save(session);
  }
}
