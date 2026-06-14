import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NSD_EVALUATION_QUEUE } from '../jobs/jobs.constants';
import { NSDSessionService } from '../nsd-session/nsd-session.service';
import { NSDTurnPersisterService } from '../nsd-orchestrator/services/nsd-turn-persister.service';
import type {
  NSDInterviewPhase,
  NSDSkillTag,
  NSDSkillGapEntry,
  NSDAdvancedSignal,
  NSDDesignIssue,
  NSDEvaluationResult,
  NSDDimensionScore,
  NSDPhaseSummaryRecord,
} from '../nsd-orchestrator/types/nsd.types';

@Injectable()
export class NSDEvaluatorService {
  private readonly logger = new Logger(NSDEvaluatorService.name);

  constructor(
    @InjectQueue(NSD_EVALUATION_QUEUE) private readonly evalQueue: Queue,
    private readonly sessions: NSDSessionService,
    private readonly persister: NSDTurnPersisterService,
  ) {}

  async enqueueEvaluation(sessionId: string): Promise<{ queued: boolean }> {
    const session = await this.sessions.findOne(sessionId);
    if (session.status === 'COMPLETED') {
      return { queued: false };
    }
    await this.evalQueue.add('evaluate', { sessionId });
    return { queued: true };
  }

  async getStatus(sessionId: string) {
    const session = await this.sessions.findOne(sessionId);
    if (session.status === 'COMPLETED' && session.evaluationResult) {
      return { status: 'completed', result: session.evaluationResult };
    }
    return {
      status: session.status === 'IN_PROGRESS' ? 'pending' : session.status,
    };
  }

  /**
   * 3-tier aggregation:
   * Tier 1: NSDTurnRecordEntity[] (already persisted per turn)
   * Tier 2: NSDPhaseSummaryRecord[] (persisted at each phase end; read here)
   * Tier 3: skill gap map + overall grade (computed here)
   */
  async processEvaluation(sessionId: string): Promise<void> {
    this.logger.log(`Processing NSD evaluation for session ${sessionId}`);

    const session = await this.sessions.findOne(sessionId);
    if (!session)
      throw new NotFoundException(`NSDSession ${sessionId} not found`);

    const [turnRecords, phaseSummaryEntities] = await Promise.all([
      this.persister.getTurnRecords(sessionId),
      this.persister.getPhaseSummaries(sessionId),
    ]);

    const tier2Phases: NSDPhaseSummaryRecord[] = phaseSummaryEntities.map(
      (e) => e.summary,
    );

    // Tier 3 — build skill gap map from turn records
    const gaps = this._buildSkillGaps(tier2Phases, turnRecords);
    const designIssues: NSDDesignIssue[] = [];
    const advancedSignals: NSDAdvancedSignal[] = [];

    for (const turn of turnRecords) {
      for (const ev of turn.extraNodeEvents) {
        if (ev.outcome === 'valid_advanced') {
          advancedSignals.push({
            nodeKey: ev.nodeKey,
            questionKey: turn.questionKey ?? '',
            phase: turn.phase,
            context: '',
          });
        } else {
          designIssues.push({
            nodeKey: ev.nodeKey,
            questionKey: turn.questionKey ?? '',
            phase: turn.phase,
            in_known_extra_nodes: ev.in_known_extra_nodes,
            candidate_justified: ev.candidate_justified,
            outcome: ev.outcome,
            skill_tag: ev.skill_tag,
          });
        }
      }
    }

    const overallGrade = this._computeOverallGrade(tier2Phases);

    const result: NSDEvaluationResult = {
      tier2_phases: tier2Phases,
      tier3_skill_gaps: {
        gaps,
        design_issues: designIssues,
        advanced_signals: advancedSignals,
      },
      overallGrade,
      completedAt: new Date(),
    };

    await this.sessions.saveEvaluationResult(sessionId, result);
    this.logger.log(
      `NSD evaluation complete for ${sessionId}: ${overallGrade}`,
    );
  }

  private _buildSkillGaps(
    phaseSummaries: NSDPhaseSummaryRecord[],
    turnRecords: {
      fillEvents: Array<{
        skill_tag?: string;
        itemKey?: string;
        phase?: string;
      }>;
      extraNodeEvents: Array<{
        outcome: string;
        skill_tag?: string;
        nodeKey?: string;
        phase?: string;
      }>;
    }[],
  ): NSDSkillGapEntry[] {
    const gapMap = new Map<NSDSkillTag, NSDSkillGapEntry>();

    const ensureGap = (tag: NSDSkillTag): NSDSkillGapEntry => {
      if (!gapMap.has(tag)) {
        gapMap.set(tag, { skill_tag: tag, severity: 'minor', evidence: [] });
      }
      return gapMap.get(tag)!;
    };

    // Fill events → critical
    for (const turn of turnRecords) {
      for (const fill of turn.fillEvents) {
        if (!fill.skill_tag) continue;
        const tag = fill.skill_tag as NSDSkillTag;
        const entry = ensureGap(tag);
        entry.severity = 'critical';
        entry.evidence.push({
          type: 'fill_event',
          phase: (fill.phase ?? 'PHASE_1_FR') as NSDInterviewPhase,
          itemKey: fill.itemKey ?? undefined,
        });
      }

      // Misunderstanding extra nodes → critical
      for (const ev of turn.extraNodeEvents) {
        if (ev.outcome === 'misunderstanding' && ev.skill_tag) {
          const tag = ev.skill_tag as NSDSkillTag;
          const entry = ensureGap(tag);
          entry.severity = 'critical';
          entry.evidence.push({
            type: 'misunderstanding',
            phase: (ev.phase ?? 'PHASE_1_FR') as NSDInterviewPhase,
            nodeKey: ev.nodeKey ?? undefined,
          });
        }
      }
    }

    // Phase summaries → attention/minor from dimension scores
    void phaseSummaries;

    return Array.from(gapMap.values());
  }

  private _computeOverallGrade(
    phaseSummaries: NSDPhaseSummaryRecord[],
  ): NSDDimensionScore {
    if (phaseSummaries.length === 0) return 'needs_improvement';
    const order: NSDDimensionScore[] = [
      'poor',
      'needs_improvement',
      'pass',
      'good',
    ];
    let worst: NSDDimensionScore = 'good';
    for (const ps of phaseSummaries) {
      if (order.indexOf(ps.phaseScore) < order.indexOf(worst)) {
        worst = ps.phaseScore;
      }
    }
    return worst;
  }
}
