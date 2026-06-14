import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { InterviewSession } from './entities/interview-session.entity';
import { LiveCodingSession } from '../live-coding/entities/live-coding-session.entity';
import { NSDSession } from '../nsd-session/entities/nsd-session.entity';
import { RedisService } from '../common/redis.service';
import type { BehaviorScorecardData } from '../behavior-session/types/session-synthesis.types';

export interface OverviewData {
  totalCompleted: number;
  averageScore: number | null;
  currentStreak: number;
  improvementDelta: number | null;
}

export interface ScoreTrendEntry {
  date: string;
  score: number;
  mode: string;
  band: string;
}

export interface CompetencyBreakdownEntry {
  competencyKey: string;
  label: string;
  averageScore: number;
}

export interface RoundBreakdown {
  behavioral: { averageScore: number | null; sessionCount: number } | null;
  liveCoding: { averageScore: number | null; sessionCount: number } | null;
  systemDesign: { averageScore: number | null; sessionCount: number } | null;
}

export interface AnalyticsResponse {
  overview: OverviewData;
  scoreTrend: ScoreTrendEntry[];
  competencyBreakdown: CompetencyBreakdownEntry[];
  roundBreakdown: RoundBreakdown;
  weaknesses: CompetencyBreakdownEntry[];
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly CACHE_PREFIX = 'interview_analytics';
  private readonly CACHE_TTL = 1800;

  constructor(
    @InjectRepository(InterviewSession)
    private readonly sessionRepo: Repository<InterviewSession>,
    @InjectRepository(LiveCodingSession)
    private readonly lcSessionRepo: Repository<LiveCodingSession>,
    @InjectRepository(NSDSession)
    private readonly nsdSessionRepo: Repository<NSDSession>,
    private readonly redisService: RedisService,
  ) {}

  private get redis() {
    return this.redisService.redis;
  }

  async getAnalytics(userId: string): Promise<AnalyticsResponse> {
    const key = `${this.CACHE_PREFIX}:${userId}`;
    try {
      const cached = await this.redis.get(key);
      if (cached) return JSON.parse(cached) as AnalyticsResponse;
    } catch (err: unknown) {
      this.logger.warn(
        `Analytics cache read failed for ${userId}: ${String(err)}`,
      );
    }

    const result = await this._computeAnalytics(userId);

    try {
      await this.redis.set(key, JSON.stringify(result), 'EX', this.CACHE_TTL);
    } catch (err: unknown) {
      this.logger.warn(
        `Analytics cache write failed for ${userId}: ${String(err)}`,
      );
    }

    return result;
  }

  async refreshCache(userId: string): Promise<void> {
    const key = `${this.CACHE_PREFIX}:${userId}`;
    await this.redis.del(key);
    const result = await this._computeAnalytics(userId);
    await this.redis.set(key, JSON.stringify(result), 'EX', this.CACHE_TTL);
  }

  private async _computeAnalytics(userId: string): Promise<AnalyticsResponse> {
    const sessions = await this.sessionRepo.find({
      where: { userId, status: 'COMPLETED' },
      order: { finishedAt: 'DESC' },
    });

    const [overview, scoreTrend, competencyBreakdown, roundBreakdown] =
      await Promise.all([
        Promise.resolve(this._computeOverview(sessions)),
        Promise.resolve(this._computeScoreTrend(sessions)),
        Promise.resolve(this._computeCompetencyBreakdown(sessions)),
        this._computeRoundBreakdown(sessions),
      ]);

    const weaknesses = competencyBreakdown
      .slice()
      .sort((a, b) => a.averageScore - b.averageScore)
      .slice(0, 3);

    return {
      overview,
      scoreTrend,
      competencyBreakdown,
      roundBreakdown,
      weaknesses,
    };
  }

  private _getBehavioralScore(session: InterviewSession): number | null {
    const sc = session.finalScorecard;
    if (!sc) return null;
    const behavioral = sc['behavioral'] as BehaviorScorecardData | undefined;
    const score = behavioral?.readiness?.finalScore;
    return typeof score === 'number' ? score : null;
  }

  private _computeOverview(sessions: InterviewSession[]): OverviewData {
    const behavioralScores = sessions
      .map((s) => this._getBehavioralScore(s))
      .filter((n): n is number => n !== null);

    const averageScore =
      behavioralScores.length > 0
        ? Math.round(
            (behavioralScores.reduce((a, b) => a + b, 0) /
              behavioralScores.length) *
              10,
          ) / 10
        : null;

    return {
      totalCompleted: sessions.length,
      averageScore,
      currentStreak: this._computeStreak(sessions),
      improvementDelta: this._computeImprovementDelta(sessions),
    };
  }

  private _computeStreak(sessions: InterviewSession[]): number {
    if (sessions.length === 0) return 0;

    const activeDays = new Set(
      sessions
        .filter((s) => s.finishedAt)
        .map((s) => {
          const d = new Date(s.finishedAt);
          return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
        }),
    );

    let streak = 0;
    const check = new Date();
    check.setUTCHours(0, 0, 0, 0);

    while (true) {
      const key = `${check.getUTCFullYear()}-${check.getUTCMonth()}-${check.getUTCDate()}`;
      if (!activeDays.has(key)) break;
      streak++;
      check.setUTCDate(check.getUTCDate() - 1);
    }

    return streak;
  }

  private _computeImprovementDelta(
    sessions: InterviewSession[],
  ): number | null {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const cutoff30 = new Date(now - thirtyDaysMs);
    const cutoff60 = new Date(now - 2 * thirtyDaysMs);

    const last30 = sessions
      .filter((s) => s.finishedAt && new Date(s.finishedAt) >= cutoff30)
      .map((s) => this._getBehavioralScore(s))
      .filter((n): n is number => n !== null);

    const prev30 = sessions
      .filter(
        (s) =>
          s.finishedAt &&
          new Date(s.finishedAt) >= cutoff60 &&
          new Date(s.finishedAt) < cutoff30,
      )
      .map((s) => this._getBehavioralScore(s))
      .filter((n): n is number => n !== null);

    if (last30.length === 0 || prev30.length === 0) return null;

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    return Math.round((avg(last30) - avg(prev30)) * 10) / 10;
  }

  private _computeScoreTrend(sessions: InterviewSession[]): ScoreTrendEntry[] {
    return sessions
      .filter((s) => this._getBehavioralScore(s) !== null)
      .slice(0, 30)
      .map((s) => {
        const behavioral = s.finalScorecard[
          'behavioral'
        ] as BehaviorScorecardData;
        return {
          date: new Date(s.finishedAt).toISOString().split('T')[0],
          score: behavioral.readiness.finalScore,
          mode: s.mode,
          band: behavioral.readiness.band,
        };
      })
      .reverse();
  }

  private _computeCompetencyBreakdown(
    sessions: InterviewSession[],
  ): CompetencyBreakdownEntry[] {
    const map = new Map<string, { label: string; scores: number[] }>();

    for (const session of sessions
      .filter((s) => this._getBehavioralScore(s) !== null)
      .slice(0, 10)) {
      const behavioral = session.finalScorecard[
        'behavioral'
      ] as BehaviorScorecardData;
      for (const entry of behavioral.competencyScores ?? []) {
        const existing = map.get(entry.competencyKey);
        if (existing) {
          existing.scores.push(entry.score);
        } else {
          map.set(entry.competencyKey, {
            label: entry.label,
            scores: [entry.score],
          });
        }
      }
    }

    return Array.from(map.entries()).map(
      ([competencyKey, { label, scores }]) => ({
        competencyKey,
        label,
        averageScore:
          Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) /
          10,
      }),
    );
  }

  private async _computeRoundBreakdown(
    sessions: InterviewSession[],
  ): Promise<RoundBreakdown> {
    if (sessions.length === 0) {
      return { behavioral: null, liveCoding: null, systemDesign: null };
    }

    const behavioralScores = sessions
      .map((s) => this._getBehavioralScore(s))
      .filter((n): n is number => n !== null);

    const behavioral =
      behavioralScores.length > 0
        ? {
            averageScore:
              Math.round(
                (behavioralScores.reduce((a, b) => a + b, 0) /
                  behavioralScores.length) *
                  10,
              ) / 10,
            sessionCount: behavioralScores.length,
          }
        : null;

    const sessionIds = sessions.map((s) => s.id);

    const [lcSessions, nsdSessions] = await Promise.all([
      this.lcSessionRepo.find({
        where: { interviewSessionId: In(sessionIds) },
      }),
      this.nsdSessionRepo.find({
        where: { interviewSessionId: In(sessionIds) },
      }),
    ]);

    const lcScores = lcSessions
      .map((lc) => {
        if (!lc.finalScore) return null;
        const entries = Object.values(
          lc.finalScore as Record<string, { score?: { total?: number } }>,
        );
        const totals = entries
          .map((e) => e?.score?.total)
          .filter((n): n is number => typeof n === 'number');
        return totals.length > 0
          ? totals.reduce((a, b) => a + b, 0) / totals.length
          : null;
      })
      .filter((n): n is number => n !== null);

    const liveCoding =
      lcScores.length > 0
        ? {
            averageScore:
              Math.round(
                (lcScores.reduce((a, b) => a + b, 0) / lcScores.length) * 10,
              ) / 10,
            sessionCount: lcScores.length,
          }
        : null;

    const nsdScores = nsdSessions
      .map((session) => {
        if (!session.evaluationResult) return null;
        return this._mapNSDGradeToScore(session.evaluationResult.overallGrade);
      })
      .filter((n): n is number => n !== null);

    const systemDesign =
      nsdScores.length > 0
        ? {
            averageScore:
              Math.round(
                (nsdScores.reduce((a, b) => a + b, 0) / nsdScores.length) * 10,
              ) / 10,
            sessionCount: nsdScores.length,
          }
        : null;

    return { behavioral, liveCoding, systemDesign };
  }

  private _mapNSDGradeToScore(grade: string | undefined): number | null {
    switch (grade) {
      case 'good':
        return 90;
      case 'pass':
        return 75;
      case 'needs_improvement':
        return 50;
      case 'poor':
        return 25;
      default:
        return null;
    }
  }
}
