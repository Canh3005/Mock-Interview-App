import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CombatSessionAggregate } from './entities/combat-session-aggregate.entity';
import { BehavioralStageLog } from '../behavioral/entities/behavioral-stage-log.entity';
import { ProctoringEvent } from './entities/proctoring-event.entity';

@Injectable()
export class CorrelationQueryService {
  constructor(
    @InjectRepository(CombatSessionAggregate)
    private aggRepo: Repository<CombatSessionAggregate>,
    @InjectRepository(BehavioralStageLog)
    private logRepo: Repository<BehavioralStageLog>,
  ) {}

  async getSessionGazePercent(behavioralSessionId: string): Promise<number> {
    const agg = await this.aggRepo.findOneBy({ behavioralSessionId });
    if (!agg || agg.eyeTotalFrames === 0) return -1;
    return Math.round((agg.eyeScreenFrames / agg.eyeTotalFrames) * 100);
  }

  async getSessionDominantExpression(
    behavioralSessionId: string,
  ): Promise<'confident' | 'stressed' | 'neutral' | null> {
    const agg = await this.aggRepo.findOneBy({ behavioralSessionId });
    if (!agg || agg.exprTotalValid === 0) return null;

    const neutralCount = Math.max(
      0,
      agg.exprTotalValid - agg.exprConfidentCount - agg.exprStressedCount,
    );

    const counts: Record<string, number> = {
      confident: agg.exprConfidentCount,
      stressed: agg.exprStressedCount,
      neutral: neutralCount,
    };

    return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      null) as 'confident' | 'stressed' | 'neutral' | null;
  }

  async getRelevanceScoreNear(
    behavioralSessionId: string,
    ts: number,
    direction: 'before' | 'after',
  ): Promise<number | null> {
    const logs = await this.logRepo.find({
      where: { behavioralSessionId, role: 'AI_FACILITATOR' },
      order: { timestamp: direction === 'before' ? 'DESC' : 'ASC' },
    });

    const tsDate = new Date(ts);
    const match =
      direction === 'before'
        ? logs.find((l) => l.timestamp <= tsDate && l.relevanceScore != null)
        : logs.find((l) => l.timestamp >= tsDate && l.relevanceScore != null);

    return match?.relevanceScore ?? null;
  }

  groupEventsIntoWindows(
    events: ProctoringEvent[],
    windowMs: number,
  ): ProctoringEvent[][] {
    if (events.length === 0) return [];

    const sorted = [...events].sort((a, b) => a.ts - b.ts);
    const windows: ProctoringEvent[][] = [];
    let windowStart = sorted[0].ts;
    let currentWindow: ProctoringEvent[] = [];

    for (const e of sorted) {
      if (e.ts - windowStart > windowMs) {
        if (currentWindow.length) windows.push(currentWindow);
        currentWindow = [];
        windowStart = e.ts;
      }
      currentWindow.push(e);
    }

    if (currentWindow.length) windows.push(currentWindow);
    return windows;
  }
}
