import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CombatSessionAggregate } from './entities/combat-session-aggregate.entity';
import { IngestMetricsDto } from './dto/ingest-metrics.dto';
import { ProctoringEventDto } from './dto/proctoring-event.dto';
import { ProctoringEvent } from './entities/proctoring-event.entity';
import { ProctoringSession } from './entities/proctoring-session.entity';
import { BehavioralSession } from '../behavioral/entities/behavioral-session.entity';

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
    @InjectRepository(BehavioralSession)
    private behavioralSessionRepo: Repository<BehavioralSession>,
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

  async ingestProctoringEvent(
    behavioralSessionId: string,
    dto: ProctoringEventDto,
  ): Promise<void> {
    const normalized = this.normalizeEventDto(dto);
    const session = await this.ensureProctoringSession(behavioralSessionId);
    const insertResult: unknown = await this.eventRepo.query(
      `
        INSERT INTO proctoring_events (
          client_event_id,
          proctoring_session_id,
          ts,
          event_type,
          severity,
          duration_ms,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
        ON CONFLICT (client_event_id) DO NOTHING
        RETURNING id
      `,
      [
        normalized.clientEventId,
        session.id,
        normalized.ts,
        normalized.eventType,
        normalized.severity,
        normalized.durationMs ?? null,
        normalized.metadata != null
          ? JSON.stringify(normalized.metadata)
          : null,
      ],
    );

    if (!Array.isArray(insertResult) || insertResult.length === 0) return;

    await this.incrementCounters(session, normalized.severity);
  }

  async ingestProctoringEventBatch(
    behavioralSessionId: string,
    events: ProctoringEventDto[],
  ): Promise<void> {
    if (!events?.length) return;
    for (const event of events) {
      await this.ingestProctoringEvent(behavioralSessionId, event);
    }
  }

  private normalizeEventDto(dto: ProctoringEventDto): {
    clientEventId: string;
    ts: number;
    eventType: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    durationMs?: number;
    metadata?: Record<string, unknown>;
  } {
    const eventType = dto.eventType ?? dto.type;
    const severity = dto.severity ?? 'LOW';
    const clientEventId =
      dto.clientEventId ?? this.buildFallbackClientEventId(dto);
    return {
      clientEventId,
      ts: dto.ts,
      eventType,
      severity,
      durationMs: dto.durationMs,
      metadata: dto.metadata,
    };
  }

  private buildFallbackClientEventId(dto: ProctoringEventDto): string {
    const eventType = dto.eventType ?? dto.type;
    return `${eventType}:${dto.ts}:${dto.durationMs ?? 0}`;
  }

  private async ensureProctoringSession(
    behavioralSessionId: string,
  ): Promise<ProctoringSession> {
    const behavioralSession = await this.behavioralSessionRepo.findOne({
      where: { id: behavioralSessionId },
    });

    if (!behavioralSession) {
      throw new Error(`Behavioral session not found: ${behavioralSessionId}`);
    }

    const interviewSessionId = behavioralSession.interviewSessionId;
    let session = await this.proctoringSessionRepo.findOne({
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

  private async incrementCounters(
    session: ProctoringSession,
    severity: 'LOW' | 'MEDIUM' | 'HIGH',
  ): Promise<void> {
    if (severity === 'HIGH') session.highFlagCount += 1;
    else if (severity === 'MEDIUM') session.mediumFlagCount += 1;
    else session.lowFlagCount += 1;

    await this.proctoringSessionRepo.save(session);
  }
}
