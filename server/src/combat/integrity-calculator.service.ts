import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProctoringSession } from './entities/proctoring-session.entity';
import { ProctoringEvent } from './entities/proctoring-event.entity';
import { CorrelationQueryService } from './correlation-query.service';

type AdjustmentType = 'mitigation' | 'aggravation';

interface CorrelationAdjustment {
  type: AdjustmentType;
  points: number;
  reason: string;
}

@Injectable()
export class IntegrityCalculatorService {
  constructor(
    @InjectRepository(ProctoringSession)
    private sessionRepo: Repository<ProctoringSession>,
    @InjectRepository(ProctoringEvent)
    private eventRepo: Repository<ProctoringEvent>,
    private correlationQuery: CorrelationQueryService,
  ) {}

  async calculateIntegrity(
    interviewSessionId: string,
    behavioralSessionId: string,
  ): Promise<Record<string, unknown>> {
    let proctoringSession = await this.sessionRepo.findOne({
      where: { interviewSessionId },
    });

    if (!proctoringSession) {
      proctoringSession = this.sessionRepo.create({
        interviewSessionId,
        highFlagCount: 0,
        mediumFlagCount: 0,
        lowFlagCount: 0,
        integrityScore: 100,
        summary: null,
      });
      proctoringSession = await this.sessionRepo.save(proctoringSession);
    }

    const events = await this.eventRepo.find({
      where: { proctoringSessionId: proctoringSession.id },
      order: { ts: 'ASC' },
    });

    const baseDeductions = this.calculateBaseDeductions(events);
    const adjustments = await this.calculateCorrelations(
      behavioralSessionId,
      events,
    );
    const finalScore = this.calculateFinalIntegrityScore(
      baseDeductions,
      adjustments,
    );
    const verdict = this.getVerdict(finalScore);

    const summary = {
      integrity_score: finalScore,
      verdict,
      base_deductions: baseDeductions,
      correlation_adjustments: adjustments,
      final_adjusted_score: finalScore,
      events_timeline: events.map((e) => ({
        ts: e.ts,
        type: e.eventType,
        duration_ms: e.durationMs,
        severity: e.severity,
        orchestrator_state:
          (e.metadata?.orchestratorState as string | undefined) ?? null,
      })),
      flag_counts: {
        high: proctoringSession.highFlagCount,
        medium: proctoringSession.mediumFlagCount,
        low: proctoringSession.lowFlagCount,
      },
      hr_notes: this.buildHrNotes(verdict, events.length),
    };

    proctoringSession.integrityScore = finalScore;
    proctoringSession.summary = summary;
    await this.sessionRepo.save(proctoringSession);

    return summary;
  }

  async getIntegrity(
    interviewSessionId: string,
  ): Promise<Record<string, unknown> | null> {
    const session = await this.sessionRepo.findOne({
      where: { interviewSessionId },
    });
    return session?.summary ?? null;
  }

  private calculateBaseDeductions(events: ProctoringEvent[]): number {
    return events.reduce((sum, e) => {
      if (e.severity === 'HIGH') return sum + 15;
      if (e.severity === 'MEDIUM') return sum + 7;
      return sum + 2;
    }, 0);
  }

  private async calculateCorrelations(
    behavioralSessionId: string,
    events: ProctoringEvent[],
  ): Promise<CorrelationAdjustment[]> {
    const adjustments: CorrelationAdjustment[] = [];

    const tabHiddenEvents = events.filter((e) => e.eventType === 'TAB_HIDDEN');
    if (tabHiddenEvents.length > 0) {
      const screenPct =
        await this.correlationQuery.getSessionGazePercent(behavioralSessionId);
      if (screenPct >= 70) {
        adjustments.push({
          type: 'mitigation',
          points: +5,
          reason: `${tabHiddenEvents.length} TAB_HIDDEN event(s) nhưng gaze on-screen ${screenPct}% toàn phiên`,
        });
      }
    }

    const eventsByType = Object.entries(
      events.reduce(
        (acc, e) => {
          (acc[e.eventType] ??= []).push(e);
          return acc;
        },
        {} as Record<string, ProctoringEvent[]>,
      ),
    );

    for (const [type, typeEvents] of eventsByType) {
      if (typeEvents.length === 1 && typeEvents[0].severity !== 'HIGH') {
        adjustments.push({
          type: 'mitigation',
          points: +3,
          reason: `${type} xảy ra 1 lần duy nhất`,
        });
      }
    }

    for (const event of events.filter(
      (e) => e.eventType === 'TAB_HIDDEN' && (e.durationMs ?? 0) > 5000,
    )) {
      const scoreBefore = await this.correlationQuery.getRelevanceScoreNear(
        behavioralSessionId,
        event.ts,
        'before',
      );
      const scoreAfter = await this.correlationQuery.getRelevanceScoreNear(
        behavioralSessionId,
        event.ts + (event.durationMs ?? 0),
        'after',
      );
      if (
        scoreBefore != null &&
        scoreAfter != null &&
        scoreAfter > scoreBefore + 0.3
      ) {
        adjustments.push({
          type: 'aggravation',
          points: -10,
          reason: `Response quality spike ${scoreBefore.toFixed(2)}→${scoreAfter.toFixed(2)} sau TAB_HIDDEN`,
        });
      }
    }

    const secondVoiceEvents = events.filter(
      (e) => e.eventType === 'SECOND_VOICE',
    );
    if (secondVoiceEvents.length > 0) {
      const dominant =
        await this.correlationQuery.getSessionDominantExpression(
          behavioralSessionId,
        );
      if (dominant === 'stressed') {
        adjustments.push({
          type: 'aggravation',
          points: -5,
          reason: `${secondVoiceEvents.length} SECOND_VOICE event(s) + expression dominant stressed`,
        });
      }
    }

    const windows = this.correlationQuery.groupEventsIntoWindows(
      events,
      30_000,
    );
    for (const w of windows) {
      const uniqueTypes = new Set(w.map((e) => e.eventType));
      if (uniqueTypes.size >= 3) {
        adjustments.push({
          type: 'aggravation',
          points: -10,
          reason: `${uniqueTypes.size} flag types trong 30s window`,
        });
      }
    }

    const totalPoints = adjustments.reduce((sum, a) => sum + a.points, 0);
    if (totalPoints > 20) {
      adjustments.push({
        type: 'mitigation',
        points: 20 - totalPoints,
        reason: 'cap +20',
      });
    }
    if (totalPoints < -20) {
      adjustments.push({
        type: 'aggravation',
        points: -20 - totalPoints,
        reason: 'cap -20',
      });
    }

    return adjustments;
  }

  private calculateFinalIntegrityScore(
    baseDeductions: number,
    adjustments: CorrelationAdjustment[],
  ): number {
    let score = 100 - baseDeductions;
    for (const a of adjustments) score += a.points;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private getVerdict(
    score: number,
  ): 'CLEAN' | 'MINOR_FLAGS' | 'SUSPICIOUS' | 'HIGHLY_SUSPICIOUS' {
    if (score >= 85) return 'CLEAN';
    if (score >= 70) return 'MINOR_FLAGS';
    if (score >= 50) return 'SUSPICIOUS';
    return 'HIGHLY_SUSPICIOUS';
  }

  private buildHrNotes(verdict: string, eventCount: number): string {
    if (eventCount === 0) {
      return 'Không ghi nhận sự kiện bất thường trong phiên.';
    }
    if (verdict === 'CLEAN') {
      return 'Có sự kiện bất thường nhỏ, nhưng không có dấu hiệu gian lận nghiêm trọng.';
    }
    if (verdict === 'MINOR_FLAGS') {
      return 'Có một số sự kiện bất thường, cần xem timeline để hậu kiểm.';
    }
    if (verdict === 'SUSPICIOUS') {
      return 'Nhiều sự kiện bất thường xuất hiện theo pattern, khuyến nghị hậu kiểm kỹ.';
    }
    return 'Nhiều dấu hiệu bất thường nghiêm trọng, cần review toàn bộ phiên.';
  }
}
