import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BehavioralSession } from '../behavioral/entities/behavioral-session.entity';
import { BehavioralStageLog } from '../behavioral/entities/behavioral-stage-log.entity';
import { QuestionProbe } from '../question-bank/entities/question-probe.entity';
import { SessionPlan } from '../session-planning/entities/session-plan.entity';
import type { StageProbeAllocation } from '../session-planning/types/session-plan.types';
import type {
  QuestionProbeLanguage,
  QuestionProbeStage,
} from '../question-bank/constants/question-bank-taxonomy.constants';
import type {
  OverallBand,
  ProbeCvClaimResult,
  ProbeRedFlagResult,
  ProbeSignalResult,
} from '../question-bank/types/question-practice-scoring.types';
import type {
  ProbeRunSummary,
  StageProgress,
} from './types/behavior-session.types';
import type {
  BehaviorScorecardData,
  CommunicationSummary,
  CompetencyScoreEntry,
  ConsistencyCheck,
  ConsistencyFlag,
  ProbeAuditEntry,
  ProbeResilienceEntry,
  ProbeResilienceSummary,
  ProbeResilienceResult,
  ReadinessBand,
  ReadinessSummary,
  SessionRiskSummary,
} from './types/session-synthesis.types';
import {
  COMPETENCY_LABELS,
  STAGE_LABELS,
} from './constants/session-synthesis.constants';
import type {
  LogGroup,
  ProbeRunWithStage,
} from './types/session-synthesis-internal.types';

@Injectable()
export class SessionSynthesisService {
  private readonly logger = new Logger(SessionSynthesisService.name);

  constructor(
    @InjectRepository(QuestionProbe)
    private readonly probeRepo: Repository<QuestionProbe>,
    @InjectRepository(BehavioralStageLog)
    private readonly logRepo: Repository<BehavioralStageLog>,
  ) {}

  /**
   * Tổng hợp kết quả session thành BehaviorScorecardData.
   * Toàn bộ deterministic — không gọi LLM.
   *
   * @param session - BehavioralSession với stageProgress đầy đủ
   * @param plan - SessionPlan tương ứng
   * @returns BehaviorScorecardData sẵn sàng persist vào session.finalScore
   */
  async run({
    session,
    plan,
  }: {
    session: BehavioralSession;
    plan: SessionPlan;
  }): Promise<BehaviorScorecardData> {
    const probeRunsWithStage: ProbeRunWithStage[] = this._collectProbeRuns(
      session.stageProgress ?? [],
    );
    const probeIds: string[] = [
      ...new Set(probeRunsWithStage.map(({ run }) => run.questionProbeId)),
    ];

    const probeMap: Map<string, QuestionProbe> =
      await this._loadProbes(probeIds);
    const logsMap: Map<string, LogGroup> = await this._loadAnswerLogs({
      sessionId: session.id,
      probeIds,
    });

    const probeAuditTrail: ProbeAuditEntry[] = probeRunsWithStage.map(
      ({ run, stage }) =>
        this._buildProbeAuditEntry({
          run,
          stage,
          probe: probeMap.get(run.questionProbeId),
          logGroup: logsMap.get(run.questionProbeId),
          language: plan.language,
        }),
    );

    const consistencyCheck: ConsistencyCheck = this._buildConsistencyCheck({
      stageProgress: session.stageProgress ?? [],
      stageAllocations: plan.stageAllocations,
      probeAuditTrail,
    });
    const probeResilience: ProbeResilienceSummary =
      this._buildProbeResilience(probeAuditTrail);
    const riskSummary: SessionRiskSummary =
      this._buildRiskSummary(probeAuditTrail);
    const communication: CommunicationSummary = this._buildCommunicationSummary(
      {
        probeAuditTrail,
      },
    );
    const competencyScores: CompetencyScoreEntry[] =
      this._buildCompetencyScores({
        probeAuditTrail,
        probeMap,
      });

    this._backfillScoreContributions({
      probeAuditTrail,
      competencyScores,
      probeMap,
    });

    const competencyAggregate: number =
      this._computeCompetencyAggregate(competencyScores);
    const readiness: ReadinessSummary = this._buildReadiness({
      competencyAggregate,
      resilienceScore: probeResilience.resilienceScore,
      communicationScore: communication.score,
      riskPenalty: riskSummary.riskPenalty,
    });

    const stageProgress: StageProgress[] = session.stageProgress ?? [];
    const stagesCompleted: QuestionProbeStage[] = stageProgress
      .filter((s) => s.status === 'completed')
      .map((s) => s.stage);
    const stagesSkipped: QuestionProbeStage[] = stageProgress
      .filter((s) => s.status === 'skipped')
      .map((s) => s.stage);

    return {
      scorecardVersion: '1.0',
      sessionId: session.id,
      synthesizedAt: new Date().toISOString(),
      probeAuditTrail,
      probeResilience,
      competencyScores,
      riskSummary,
      communication,
      consistencyCheck,
      readiness,
      stagesCompleted,
      stagesSkipped,
    };
  }

  private _collectProbeRuns(
    stageProgress: StageProgress[],
  ): ProbeRunWithStage[] {
    const result: ProbeRunWithStage[] = [];
    for (const sp of stageProgress) {
      for (const run of sp.probeRuns) {
        result.push({ run, stage: sp.stage });
      }
    }
    return result;
  }

  private async _loadProbes(
    probeIds: string[],
  ): Promise<Map<string, QuestionProbe>> {
    if (probeIds.length === 0) return new Map();
    const probes: QuestionProbe[] = await this.probeRepo.findBy({
      id: In(probeIds),
    });
    const map: Map<string, QuestionProbe> = new Map();
    probes.forEach((p) => map.set(p.id, p));
    return map;
  }

  private async _loadAnswerLogs({
    sessionId,
    probeIds,
  }: {
    sessionId: string;
    probeIds: string[];
  }): Promise<Map<string, LogGroup>> {
    if (probeIds.length === 0) return new Map();
    const logs: BehavioralStageLog[] = await this.logRepo.find({
      where: { behavioralSessionId: sessionId, probeId: In(probeIds) },
      order: { globalTurnIndex: 'ASC' },
    });
    const result: Map<string, LogGroup> = new Map();
    for (const log of logs) {
      if (!log.probeId) continue;
      const existing: LogGroup = result.get(log.probeId) ?? {
        candidateAnswerQuotes: [],
        followUpReasons: [],
      };
      if (log.role === 'USER') {
        existing.candidateAnswerQuotes.push(log.content);
      } else if (log.turnType === 'follow_up' || log.turnType === 'challenge') {
        const reason: string =
          log.followUpTrigger ?? log.challengeReason ?? log.turnType;
        existing.followUpReasons.push(reason);
      }
      result.set(log.probeId, existing);
    }
    return result;
  }

  private _buildProbeAuditEntry({
    run,
    stage,
    probe,
    logGroup,
    language,
  }: {
    run: ProbeRunSummary;
    stage: QuestionProbeStage;
    probe: QuestionProbe | undefined;
    logGroup: LogGroup | undefined;
    language: QuestionProbeLanguage;
  }): ProbeAuditEntry {
    const signalResults: ProbeSignalResult[] =
      run.finalScoringResult?.signalResults ?? [];
    const redFlags: ProbeRedFlagResult[] =
      run.finalScoringResult?.redFlags ?? [];
    const cvClaimResults: ProbeCvClaimResult[] =
      run.finalScoringResult?.cvClaimResults ?? [];
    const score: number = this._computeProbeScore({
      band: run.finalBand,
      signalResults,
    });

    return {
      questionProbeId: run.questionProbeId,
      stage,
      stageLabel: this._stageLabel(stage, language),
      primaryQuestion: this._primaryQuestion(probe, language),
      band: run.finalBand,
      score,
      scoreContribution: 0,
      candidateTurnCount: run.candidateTurnCount,
      challengeCount: run.challengeCount,
      followUpCount: run.followUpCount,
      closeReason: run.closeReason,
      isFallback: run.isFallback,
      candidateAnswerQuotes: logGroup?.candidateAnswerQuotes ?? [],
      followUpReasons: logGroup?.followUpReasons ?? [],
      signalResults,
      redFlags,
      cvClaimResults,
      improvementSuggestions:
        run.finalScoringResult?.improvementSuggestions ?? [],
      summary: run.finalScoringResult?.summary ?? '',
    };
  }

  private _buildConsistencyCheck({
    stageProgress,
    stageAllocations,
    probeAuditTrail,
  }: {
    stageProgress: StageProgress[];
    stageAllocations: StageProbeAllocation[];
    probeAuditTrail: ProbeAuditEntry[];
  }): ConsistencyCheck {
    const flags: ConsistencyFlag[] = [];

    stageProgress.forEach((sp, i) => {
      if (
        sp.status === 'skipped' &&
        stageAllocations[i]?.priority === 'must_include'
      ) {
        flags.push({
          type: 'must_include_stage_skipped',
          affectedStage: sp.stage,
          detail: `Stage ${sp.stage} is must_include but was skipped`,
        });
      }
    });

    probeAuditTrail
      .filter((e) => e.closeReason === 'no_relevant_story')
      .forEach((e) => {
        flags.push({
          type: 'no_story_for_probe',
          affectedProbeId: e.questionProbeId,
          detail: 'Probe closed: candidate had no relevant story',
        });
      });

    probeAuditTrail
      .filter((e) => {
        const presentFlags: number = e.redFlags.filter((f) => f.present).length;
        const nonMissing: number = e.signalResults.filter(
          (s) => s.status !== 'missing',
        ).length;
        return presentFlags >= 2 && nonMissing === 0;
      })
      .forEach((e) => {
        flags.push({
          type: 'high_risk_low_signal',
          affectedProbeId: e.questionProbeId,
          detail: 'Multiple red flags with no covered or unclear signals',
        });
      });

    if (
      probeAuditTrail.length > 0 &&
      probeAuditTrail.every((e) => e.challengeCount === 0)
    ) {
      flags.push({
        type: 'all_probes_unchallenged',
        detail: 'No probe was challenged in this session',
      });
    }

    return {
      flags,
      hasHighRiskPattern: flags.some((f) => f.type === 'high_risk_low_signal'),
      hasCoverageGap: flags.some(
        (f) =>
          f.type === 'must_include_stage_skipped' ||
          f.type === 'no_story_for_probe',
      ),
    };
  }

  private _buildProbeResilience(
    probeAuditTrail: ProbeAuditEntry[],
  ): ProbeResilienceSummary {
    const entries: ProbeResilienceEntry[] = probeAuditTrail.map((e) => {
      let result: ProbeResilienceResult;
      if (e.challengeCount === 0) {
        result = 'unchallenged';
      } else if (e.band === 'strong' || e.band === 'solid') {
        result = 'resilient';
      } else {
        result = 'collapsed';
      }
      return {
        questionProbeId: e.questionProbeId,
        challengeCount: e.challengeCount,
        finalBand: e.band,
        result,
      };
    });

    const challenged: ProbeResilienceEntry[] = entries.filter(
      (e) => e.result !== 'unchallenged',
    );
    const resilientCount: number = challenged.filter(
      (e) => e.result === 'resilient',
    ).length;
    const collapsedCount: number = challenged.filter(
      (e) => e.result === 'collapsed',
    ).length;
    const challengedProbeCount: number = challenged.length;
    const resilienceScore: number =
      challengedProbeCount === 0 ? 0.5 : resilientCount / challengedProbeCount;

    return {
      entries,
      challengedProbeCount,
      resilientCount,
      collapsedCount,
      resilienceScore,
    };
  }

  private _buildRiskSummary(
    probeAuditTrail: ProbeAuditEntry[],
  ): SessionRiskSummary {
    const presentFlagKeys: string[] = [];
    let cvClaimInflatedCount: number = 0;
    let cvClaimNotVerifiedCount: number = 0;

    for (const entry of probeAuditTrail) {
      entry.redFlags
        .filter((f) => f.present)
        .forEach((f) => {
          presentFlagKeys.push(f.key);
        });
      for (const claim of entry.cvClaimResults) {
        if (claim.verification === 'inflated_risk') cvClaimInflatedCount++;
        if (claim.verification === 'not_verified') cvClaimNotVerifiedCount++;
      }
    }

    const riskPenalty: number = Math.min(
      1.0,
      presentFlagKeys.length * 0.05 + cvClaimInflatedCount * 0.08,
    );

    return {
      totalRedFlagsPresent: presentFlagKeys.length,
      presentFlagKeys,
      cvClaimInflatedCount,
      cvClaimNotVerifiedCount,
      riskPenalty,
    };
  }

  private _buildCommunicationSummary({
    probeAuditTrail,
  }: {
    probeAuditTrail: ProbeAuditEntry[];
  }): CommunicationSummary {
    const totalProbes: number = probeAuditTrail.length;
    if (totalProbes === 0)
      return { genericAnswerCount: 0, avgRedFlagRate: 0, score: 100 };

    const genericAnswerCount: number = probeAuditTrail.filter(
      (e) => e.band === 'needs_work' || e.band === 'insufficient_evidence',
    ).length;

    const avgRedFlagRate: number =
      probeAuditTrail.reduce((sum, e) => {
        const total: number = e.redFlags.length;
        const present: number = e.redFlags.filter((f) => f.present).length;
        return sum + (total === 0 ? 0 : present / total);
      }, 0) / totalProbes;

    const genericRate: number = genericAnswerCount / totalProbes;
    const score: number = Math.round(
      Math.max(
        0,
        Math.min(100, 100 * (1 - avgRedFlagRate * 0.6 - genericRate * 0.4)),
      ),
    );

    return {
      genericAnswerCount,
      avgRedFlagRate: Math.round(avgRedFlagRate * 100) / 100,
      score,
    };
  }

  private _buildCompetencyScores({
    probeAuditTrail,
    probeMap,
  }: {
    probeAuditTrail: ProbeAuditEntry[];
    probeMap: Map<string, QuestionProbe>;
  }): CompetencyScoreEntry[] {
    const data: Map<string, { scores: number[]; ratios: number[] }> = new Map();

    for (const entry of probeAuditTrail) {
      const probe: QuestionProbe | undefined = probeMap.get(
        entry.questionProbeId,
      );
      if (!probe?.competencies.length) continue;
      for (const comp of probe.competencies) {
        const existing = data.get(comp) ?? { scores: [], ratios: [] };
        existing.scores.push(entry.score);
        existing.ratios.push(
          this._computeSignalCoverageRatio(entry.signalResults),
        );
        data.set(comp, existing);
      }
    }

    const result: CompetencyScoreEntry[] = [];
    for (const [key, { scores, ratios }] of data.entries()) {
      const avgScore: number = Math.round(
        scores.reduce((a, b) => a + b, 0) / scores.length,
      );
      const avgRatio: number =
        ratios.reduce((a, b) => a + b, 0) / ratios.length;
      result.push({
        competencyKey: key,
        label: this._competencyLabel(key),
        probeCount: scores.length,
        avgSignalCoverageRatio: Math.round(avgRatio * 100) / 100,
        score: avgScore,
      });
    }

    return result.sort((a, b) => b.score - a.score);
  }

  private _backfillScoreContributions({
    probeAuditTrail,
    competencyScores,
    probeMap,
  }: {
    probeAuditTrail: ProbeAuditEntry[];
    competencyScores: CompetencyScoreEntry[];
    probeMap: Map<string, QuestionProbe>;
  }): void {
    const totalWeight: number = competencyScores.length;
    if (totalWeight === 0) return;

    for (const entry of probeAuditTrail) {
      const probe: QuestionProbe | undefined = probeMap.get(
        entry.questionProbeId,
      );
      if (!probe?.competencies.length) {
        entry.scoreContribution = 0;
        continue;
      }
      const matchCount: number = competencyScores.filter((c) =>
        (probe.competencies as string[]).includes(c.competencyKey),
      ).length;
      entry.scoreContribution =
        Math.round((matchCount / totalWeight) * 100) / 100;
    }
  }

  private _computeCompetencyAggregate(
    competencyScores: CompetencyScoreEntry[],
  ): number {
    if (competencyScores.length === 0) return 0;
    const total: number = competencyScores.reduce((sum, c) => sum + c.score, 0);
    return Math.round(total / competencyScores.length);
  }

  private _buildReadiness({
    competencyAggregate,
    resilienceScore,
    communicationScore,
    riskPenalty,
  }: {
    competencyAggregate: number;
    resilienceScore: number;
    communicationScore: number;
    riskPenalty: number;
  }): ReadinessSummary {
    const subTotal: number =
      competencyAggregate * 0.7 +
      resilienceScore * 20 +
      communicationScore * 0.1;
    const riskMultiplier: number = Math.max(
      0.7,
      Math.min(1.0, 1.0 - riskPenalty * 0.3),
    );
    const finalScore: number = Math.round(
      Math.max(0, Math.min(100, subTotal * riskMultiplier)),
    );

    return {
      competencyAggregate,
      resilienceScore,
      communicationScore,
      riskPenalty,
      riskMultiplier: Math.round(riskMultiplier * 100) / 100,
      subTotal: Math.round(subTotal),
      finalScore,
      band: this._readinessBand(finalScore),
    };
  }

  private _computeProbeScore({
    band,
    signalResults,
  }: {
    band: OverallBand;
    signalResults: ProbeSignalResult[];
  }): number {
    const bandBase: number = this._bandToScore(band);
    const ratio: number = this._computeSignalCoverageRatio(signalResults);
    return Math.round(bandBase * 0.7 + ratio * 100 * 0.3);
  }

  private _computeSignalCoverageRatio(
    signalResults: ProbeSignalResult[],
  ): number {
    if (signalResults.length === 0) return 0;
    const covered: number = signalResults.filter(
      (s) => s.status === 'covered',
    ).length;
    const unclear: number = signalResults.filter(
      (s) => s.status === 'unclear',
    ).length;
    return (covered + unclear * 0.5) / signalResults.length;
  }

  private _bandToScore(band: OverallBand): number {
    const map: Record<OverallBand, number> = {
      strong: 90,
      solid: 72,
      needs_work: 45,
      insufficient_evidence: 20,
    };
    return map[band] ?? 20;
  }

  private _readinessBand(score: number): ReadinessBand {
    if (score >= 80) return 'ready';
    if (score >= 65) return 'almost_ready';
    if (score >= 45) return 'needs_practice';
    return 'not_ready';
  }

  private _primaryQuestion(
    probe: QuestionProbe | undefined,
    language: QuestionProbeLanguage,
  ): string {
    if (!probe) return '';
    return (
      probe.localizedContent?.[language]?.displayQuestion ??
      probe.primaryQuestion ??
      ''
    );
  }

  private _stageLabel(
    stage: QuestionProbeStage,
    language: QuestionProbeLanguage,
  ): string {
    return STAGE_LABELS[stage]?.[language] ?? stage;
  }

  private _competencyLabel(key: string): string {
    return COMPETENCY_LABELS[key] ?? key;
  }
}
