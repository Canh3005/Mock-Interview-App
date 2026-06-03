import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { SDSession } from '../sd-session/entities/sd-session.entity';
import { CurveBallScenario } from '../sd-problem/entities/sd-problem.entity';
import { SDStageSummary } from '../sd-orchestrator/entities/sd-stage-summary.entity';
import { SDGraphSnapshotEntity } from '../sd-orchestrator/entities/sd-graph-snapshot.entity';
import { SDTurnRecord } from '../sd-orchestrator/entities/sd-turn-record.entity';
import { GroqService } from '../ai/groq.service';
import {
  SD_EVALUATION_QUEUE,
  SdEvaluationJobName,
} from '../jobs/jobs.constants';
import {
  buildScalabilityPrompt,
  buildTradeoffPrompt,
  buildCommunicationPrompt,
  buildCurveballPrompt,
  buildAnnotationPrompt,
  buildSuggestionsPrompt,
} from './prompts/evaluation-prompts';
import {
  AI_TIMEOUT_MS,
  FAST_MODEL,
  NO_CURVEBALL_MAX,
  CLARIFICATION_SCORE_KEYS,
  WALKTHROUGH_ARCH_KEYS,
  WALKTHROUGH_COMM_KEYS,
  DEEP_DIVE_SCORE_KEYS,
  WRAP_UP_SCORE_KEYS,
  GRAPH_METRIC_KEYS,
  ARCH_WALKTHROUGH_WEIGHT,
  ARCH_GRAPH_WEIGHT,
  CONSTRAINT_REUSE_MAX_BONUS,
  GRAPH_DELTA_BONUS_MAX,
  WRAP_UP_QUALITY_SIGNAL_MAX_BONUS,
  UNCOVERED_DIMENSION_PENALTY_PER_DIM,
  UNCOVERED_DIMENSION_MAX_PENALTY,
  DIMENSION_WEIGHTS_WITH_CURVEBALL,
  DIMENSION_WEIGHTS_NO_CURVEBALL,
} from './constants/sd-evaluator.constants';
import type {
  DimensionResult,
  EvaluationProgress,
  EvaluationStatusResponse,
  SDStructuredEvalInput,
  SDGraphMetricsFlat,
  GraphDelta,
} from './types/sd-evaluator.types';

@Injectable()
export class SDEvaluatorService {
  private readonly logger = new Logger(SDEvaluatorService.name);

  constructor(
    @InjectRepository(SDSession)
    private readonly sdSessionRepo: Repository<SDSession>,
    @InjectRepository(SDStageSummary)
    private readonly stageSummaryRepo: Repository<SDStageSummary>,
    @InjectRepository(SDGraphSnapshotEntity)
    private readonly graphSnapshotRepo: Repository<SDGraphSnapshotEntity>,
    @InjectRepository(SDTurnRecord)
    private readonly sdTurnRepo: Repository<SDTurnRecord>,
    @InjectQueue(SD_EVALUATION_QUEUE)
    private readonly sdEvaluationQueue: Queue,
    private readonly groqService: GroqService,
  ) {}

  async enqueueEvaluation(sessionId: string): Promise<{ queued: boolean }> {
    const session: SDSession | null = await this.sdSessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.phase !== 'COMPLETED' && session.phase !== 'EVALUATING')
      throw new BadRequestException('Session not completed');
    if (session.evaluationResult !== null)
      throw new BadRequestException('Already evaluated');

    await this.sdEvaluationQueue.add(
      SdEvaluationJobName.EVALUATE_SESSION,
      { sessionId },
      { jobId: sessionId, attempts: 1 },
    );
    return { queued: true };
  }

  async getStatus(sessionId: string): Promise<EvaluationStatusResponse> {
    const session: SDSession | null = await this.sdSessionRepo.findOne({
      where: { id: sessionId },
      select: ['id', 'evaluationResult'],
    });
    if (!session) throw new NotFoundException('Session not found');

    if (session.evaluationResult !== null) {
      return {
        status: 'completed',
        result: session.evaluationResult,
        progress: null,
      };
    }

    const job: Job | undefined = await this.sdEvaluationQueue.getJob(sessionId);
    if (!job) return { status: 'idle', progress: null };

    const state: string = await job.getState();
    if (state === 'failed') return { status: 'failed', progress: null };

    const progress: EvaluationProgress | null =
      (job.progress as EvaluationProgress) ?? null;
    return { status: 'processing', progress };
  }

  async processEvaluation(sessionId: string, job: Job): Promise<void> {
    const session: SDSession | null = await this.sdSessionRepo.findOne({
      where: { id: sessionId },
      relations: ['problem'],
    });
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const completedDimensions: DimensionResult[] = [];

    const pushAndUpdate = async (result: DimensionResult): Promise<void> => {
      completedDimensions.push(result);
      await job.updateProgress({
        completedDimensions: [...completedDimensions],
      });
    };

    const input = await this._loadStructuredInput(sessionId, session);
    let scoringDimensions: DimensionResult[];

    if (input.hasStageSummaries) {
      scoringDimensions = this._computeStructuredDimensions(input);
    } else {
      scoringDimensions = await this._runLegacyEvaluation(session);
    }

    for (const dim of scoringDimensions) {
      await pushAndUpdate(dim);
    }

    await Promise.allSettled([
      this._annotateTranscript(session).then(pushAndUpdate),
      this._generateSuggestions({ session, scoringDimensions }).then(
        pushAndUpdate,
      ),
    ]);

    const evaluationResult: Record<string, unknown> = this._computeFinalScore(
      scoringDimensions,
      session.hintsUsed,
      input.hasCurveball,
      input.hasStageSummaries,
    ) as unknown as Record<string, unknown>;

    const enrichedResult: Record<string, unknown> = {
      ...evaluationResult,
      dimensions: completedDimensions,
      ...(input.hasStageSummaries
        ? {
            stageSummaries: {
              stageScores: Object.fromEntries(
                input.summaries.map((s) => [
                  s.stage,
                  this._avgScores(s.scores),
                ]),
              ),
              redFlags: input.allRedFlags,
              totalStages: input.summaries.length,
            },
            graphDeltaAfterCurveball: input.graphDeltaAfterCurveball,
          }
        : await this._legacyEnrichment(sessionId)),
    };

    const update: DeepPartial<SDSession> = {
      id: sessionId,
      evaluationResult: enrichedResult,
      phase: 'COMPLETED',
    };
    await this.sdSessionRepo.save(update);
    this.logger.log(`Evaluation completed for session ${sessionId}`);
  }

  // ─── Structured path ─────────────────────────────────────────────────────────

  private async _loadStructuredInput(
    sessionId: string,
    session: SDSession,
  ): Promise<SDStructuredEvalInput> {
    const summaries = await this.stageSummaryRepo.find({
      where: { sessionId },
    });

    const snapshot = await this.graphSnapshotRepo.findOne({
      where: { sessionId, stage: 'DESIGN_WALKTHROUGH' },
      order: { capturedAt: 'DESC' },
    });

    const turns = await this.sdTurnRepo.find({
      where: { sessionId, stage: In(['DEEP_DIVE', 'WRAP_UP']) },
    });

    const clarificationSummary = summaries.find(
      (s) => s.stage === 'CLARIFICATION',
    );
    const clarificationLeftover = clarificationSummary?.leftoverJson as
      | { uncoveredDimensions?: string[] }
      | null
      | undefined;

    const wrapUpSummary = summaries.find((s) => s.stage === 'WRAP_UP');
    const wrapUpLeftover = wrapUpSummary?.leftoverJson as
      | { graphDeltaAfterCurveball?: GraphDelta }
      | null
      | undefined;

    const finalGraphMetrics: SDGraphMetricsFlat | null = snapshot?.metrics
      ? (snapshot.metrics as unknown as SDGraphMetricsFlat)
      : null;

    return {
      sessionId,
      hasStageSummaries: summaries.length >= 1,
      hasCurveball: session.curveballArchitectureSnapshot !== null,
      hintsUsed: session.hintsUsed,
      summaries: summaries.map((s) => ({
        stage: s.stage,
        scores: s.scores ?? {},
        redFlags: s.redFlags ?? [],
        leftoverJson: s.leftoverJson as Record<string, unknown> | null,
      })),
      finalGraphMetrics,
      graphDeltaAfterCurveball:
        wrapUpLeftover?.graphDeltaAfterCurveball ?? null,
      constraintReuseCount: this._computeConstraintReuse(turns),
      wrapUpQualitySignalCount: this._computeWrapUpQualitySignals(turns),
      uncoveredRequiredDimensions:
        clarificationLeftover?.uncoveredDimensions ?? [],
      allRedFlags: summaries.flatMap((s) => s.redFlags ?? []),
    };
  }

  private _computeConstraintReuse(turns: SDTurnRecord[]): number {
    return turns.filter((t) => t.signalsJson?.constraintLinked === true).length;
  }

  private _computeWrapUpQualitySignals(turns: SDTurnRecord[]): number {
    return turns.filter((t) => {
      if (t.stage !== 'WRAP_UP') return false;
      const s = t.signalsJson;
      return (
        s?.tradeoffMentioned === true ||
        s?.costOrLatencyImpactMentioned === true
      );
    }).length;
  }

  private _computeStructuredDimensions(
    input: SDStructuredEvalInput,
  ): DimensionResult[] {
    const findSummary = (stage: string) =>
      input.summaries.find((s) => s.stage === stage);

    return [
      this._computeRequirementElicitation(
        findSummary('CLARIFICATION'),
        input.uncoveredRequiredDimensions,
      ),
      this._computeArchitectureAndCoverage(
        findSummary('DESIGN_WALKTHROUGH'),
        input.finalGraphMetrics,
        input.hasCurveball,
      ),
      this._computeTechnicalDepth(
        findSummary('DEEP_DIVE'),
        input.constraintReuseCount,
      ),
      this._computeAdaptationAndResilience(
        findSummary('WRAP_UP'),
        input.graphDeltaAfterCurveball,
        input.wrapUpQualitySignalCount,
        input.hasCurveball,
      ),
      this._computeCommunicationAndStructure(
        findSummary('DESIGN_WALKTHROUGH'),
        findSummary('CLARIFICATION'),
      ),
    ];
  }

  private _computeRequirementElicitation(
    summary: { scores: Record<string, number> } | undefined,
    uncoveredDims: string[],
  ): DimensionResult {
    const maxScore = DIMENSION_WEIGHTS_WITH_CURVEBALL.requirementElicitation;
    const avg = this._avgKeys(summary?.scores ?? {}, CLARIFICATION_SCORE_KEYS);
    const penalty = Math.min(
      uncoveredDims.length * UNCOVERED_DIMENSION_PENALTY_PER_DIM,
      UNCOVERED_DIMENSION_MAX_PENALTY,
    );
    const score = Math.max(Math.round(avg * maxScore) - penalty, 0);
    return {
      dimension: 'requirementElicitation',
      score,
      maxScore,
      data: {
        avgRaw: avg,
        uncoveredDimensions: uncoveredDims,
        penalty,
        perKey: this._pickKeys(summary?.scores ?? {}, CLARIFICATION_SCORE_KEYS),
      },
    };
  }

  private _computeArchitectureAndCoverage(
    walkthroughSummary: { scores: Record<string, number> } | undefined,
    graphMetrics: SDGraphMetricsFlat | null,
    hasCurveball: boolean,
  ): DimensionResult {
    const weights = hasCurveball
      ? DIMENSION_WEIGHTS_WITH_CURVEBALL
      : DIMENSION_WEIGHTS_NO_CURVEBALL;
    const maxScore = weights.architectureAndCoverage;

    const walkthroughAvg = this._avgKeys(
      walkthroughSummary?.scores ?? {},
      WALKTHROUGH_ARCH_KEYS,
    );
    const graphAvg = graphMetrics
      ? this._avgKeys(
          graphMetrics as unknown as Record<string, number>,
          GRAPH_METRIC_KEYS,
        )
      : 0;

    const blended =
      walkthroughAvg * ARCH_WALKTHROUGH_WEIGHT + graphAvg * ARCH_GRAPH_WEIGHT;
    const score = Math.round(blended * maxScore);

    return {
      dimension: 'architectureAndCoverage',
      score,
      maxScore,
      data: {
        walkthroughAvg,
        graphAvg,
        blended,
        graphMetrics,
      },
    };
  }

  private _computeTechnicalDepth(
    summary: { scores: Record<string, number> } | undefined,
    constraintReuseCount: number,
  ): DimensionResult {
    const maxScore = DIMENSION_WEIGHTS_WITH_CURVEBALL.technicalDepth;
    const avg = this._avgKeys(summary?.scores ?? {}, DEEP_DIVE_SCORE_KEYS);
    const bonus = Math.min(constraintReuseCount, CONSTRAINT_REUSE_MAX_BONUS);
    const score = Math.min(Math.round(avg * maxScore) + bonus, maxScore);
    return {
      dimension: 'technicalDepth',
      score,
      maxScore,
      data: {
        avgRaw: avg,
        constraintReuseCount,
        bonus,
        perKey: this._pickKeys(summary?.scores ?? {}, DEEP_DIVE_SCORE_KEYS),
      },
    };
  }

  private _computeAdaptationAndResilience(
    summary: { scores: Record<string, number> } | undefined,
    graphDelta: GraphDelta | null,
    qualitySignalCount: number,
    hasCurveball: boolean,
  ): DimensionResult {
    const weights = hasCurveball
      ? DIMENSION_WEIGHTS_WITH_CURVEBALL
      : DIMENSION_WEIGHTS_NO_CURVEBALL;
    const maxScore = weights.adaptationAndResilience;

    const baseAvg = this._avgKeys(summary?.scores ?? {}, WRAP_UP_SCORE_KEYS);
    const deltaBonus =
      graphDelta && graphDelta.nodesAdded + graphDelta.edgesAdded > 0
        ? Math.min(
            (graphDelta.nodesAdded + graphDelta.edgesAdded) * 0.05,
            GRAPH_DELTA_BONUS_MAX,
          )
        : 0;
    const scaledBase = Math.round(
      Math.min(baseAvg + deltaBonus, 1.0) * maxScore,
    );
    const qualityBonus = Math.min(
      qualitySignalCount,
      WRAP_UP_QUALITY_SIGNAL_MAX_BONUS,
    );
    const score = Math.min(scaledBase + qualityBonus, maxScore);

    return {
      dimension: 'adaptationAndResilience',
      score,
      maxScore,
      data: {
        baseAvg,
        deltaBonus,
        qualitySignalCount,
        qualityBonus,
        graphDelta,
        perKey: this._pickKeys(summary?.scores ?? {}, WRAP_UP_SCORE_KEYS),
      },
    };
  }

  private _computeCommunicationAndStructure(
    walkthroughSummary: { scores: Record<string, number> } | undefined,
    clarificationSummary: { scores: Record<string, number> } | undefined,
  ): DimensionResult {
    const maxScore = DIMENSION_WEIGHTS_WITH_CURVEBALL.communicationAndStructure;
    const commStructure =
      walkthroughSummary?.scores?.[WALKTHROUGH_COMM_KEYS[0]] ?? 0;
    const prioritization =
      clarificationSummary?.scores?.['prioritization'] ?? 0;
    const avg = (commStructure + prioritization) / 2;
    const score = Math.round(avg * maxScore);
    return {
      dimension: 'communicationAndStructure',
      score,
      maxScore,
      data: { communicationStructure: commStructure, prioritization, avg },
    };
  }

  // ─── Legacy path (old LLM-based scoring) ─────────────────────────────────────

  private async _runLegacyEvaluation(
    session: SDSession,
  ): Promise<DimensionResult[]> {
    const hasCurveball = session.curveballArchitectureSnapshot !== null;
    const results: DimensionResult[] = [];

    results.push(this._computeComponentCoverage(session));

    await Promise.allSettled([
      this._evaluateScalability(session).then((r) => results.push(r)),
      this._evaluateTradeoff(session).then((r) => results.push(r)),
      this._evaluateCommunication(session).then((r) => results.push(r)),
      hasCurveball
        ? this._evaluateCurveball(session).then((r) => results.push(r))
        : Promise.resolve(),
    ]);

    return results;
  }

  private _computeComponentCoverage(session: SDSession): DimensionResult {
    const candidateNodes = (session.architectureJSON?.nodes ?? []) as {
      type?: string;
    }[];
    const drawn: Set<string> = new Set(
      candidateNodes.map((n) => (n.type ?? '').toLowerCase()).filter(Boolean),
    );
    const refNodes = (session.problem.referenceArchitecture?.nodes ?? []) as {
      type?: string;
    }[];
    const expectedTypes: string[] = [
      ...new Set(
        refNodes.map((n) => (n.type ?? '').toLowerCase()).filter(Boolean),
      ),
    ];
    const matched: string[] = expectedTypes.filter((t) => drawn.has(t));
    const missing: string[] = expectedTypes.filter((t) => !drawn.has(t));
    const score: number =
      expectedTypes.length > 0
        ? Math.round((matched.length / expectedTypes.length) * 25)
        : 0;
    return {
      dimension: 'componentCoverage',
      score,
      maxScore: 25,
      data: { missingComponents: missing },
    };
  }

  private async _callWithTimeout(prompt: string): Promise<string> {
    return Promise.race([
      this.groqService.generateContent({
        model: FAST_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { maxOutputTokens: 512 },
      }),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('AI call timeout')), AI_TIMEOUT_MS),
      ),
    ]);
  }

  private _parseAiJson({
    raw,
    dimension,
    maxScore,
  }: {
    raw: string;
    dimension: string;
    maxScore: number;
  }): DimensionResult {
    try {
      const parsed: Record<string, unknown> = JSON.parse(raw.trim()) as Record<
        string,
        unknown
      >;
      const rawScore: number = Number(parsed.score) || 0;
      const score: number = Math.min(
        Math.max(Math.round(rawScore), 0),
        maxScore,
      );
      const { score: _s, ...rest } = parsed;
      void _s;
      return {
        dimension,
        score,
        maxScore,
        data: rest as Record<string, unknown>,
      };
    } catch {
      return {
        dimension,
        score: 0,
        maxScore,
        data: { error: 'Invalid AI response format' },
      };
    }
  }

  private async _evaluateScalability(
    session: SDSession,
  ): Promise<DimensionResult> {
    const nodes = (session.architectureJSON?.nodes ?? []) as {
      type?: string;
    }[];
    const edges: unknown[] = (session.architectureJSON?.edges ??
      []) as unknown[];
    const nodeTypes: string[] = nodes.map((n) => n.type ?? '').filter(Boolean);
    const prompt: string = buildScalabilityPrompt({
      problemTitle: session.problem.title,
      scalingConstraints: session.problem.scalingConstraints,
      nodeTypes,
      edges,
      language: session.language,
    });
    try {
      const raw = await this._callWithTimeout(prompt);
      return this._parseAiJson({
        raw,
        dimension: 'scalabilityFit',
        maxScore: 20,
      });
    } catch {
      return {
        dimension: 'scalabilityFit',
        score: 0,
        maxScore: 20,
        data: { error: 'Evaluation failed' },
      };
    }
  }

  private async _evaluateTradeoff(
    session: SDSession,
  ): Promise<DimensionResult> {
    const transcript: unknown[] = (session.transcriptHistory ??
      []) as unknown[];
    const prompt = buildTradeoffPrompt({
      problemTitle: session.problem.title,
      transcriptHistory: transcript,
      language: session.language,
    });
    try {
      const raw = await this._callWithTimeout(prompt);
      return this._parseAiJson({
        raw,
        dimension: 'tradeoffArticulation',
        maxScore: 20,
      });
    } catch {
      return {
        dimension: 'tradeoffArticulation',
        score: 0,
        maxScore: 20,
        data: { error: 'Evaluation failed' },
      };
    }
  }

  private async _evaluateCommunication(
    session: SDSession,
  ): Promise<DimensionResult> {
    const transcript: unknown[] = (session.transcriptHistory ??
      []) as unknown[];
    const prompt = buildCommunicationPrompt({
      problemTitle: session.problem.title,
      transcriptHistory: transcript,
      language: session.language,
    });
    try {
      const raw = await this._callWithTimeout(prompt);
      return this._parseAiJson({
        raw,
        dimension: 'communicationClarity',
        maxScore: 15,
      });
    } catch {
      return {
        dimension: 'communicationClarity',
        score: 0,
        maxScore: 15,
        data: { error: 'Evaluation failed' },
      };
    }
  }

  private async _evaluateCurveball(
    session: SDSession,
  ): Promise<DimensionResult> {
    const scenario: CurveBallScenario | undefined =
      session.problem.curveBallScenarios?.[0];
    if (!scenario) {
      return {
        dimension: 'curveballAdaptation',
        score: 0,
        maxScore: 20,
        data: { error: 'No curveball scenario found' },
      };
    }
    const beforeNodes = (session.curveballArchitectureSnapshot?.nodes ??
      []) as { type?: string }[];
    const afterNodes = (session.architectureJSON?.nodes ?? []) as {
      type?: string;
    }[];
    const beforeTypes = beforeNodes.map((n) => n.type ?? '').filter(Boolean);
    const afterTypes = afterNodes.map((n) => n.type ?? '').filter(Boolean);
    const diff = {
      addedNodes: afterTypes.filter((t) => !beforeTypes.includes(t)),
      removedNodes: beforeTypes.filter((t) => !afterTypes.includes(t)),
    };
    const prompt = buildCurveballPrompt({
      problemTitle: session.problem.title,
      curveballScenarioPrompt: scenario.prompt,
      expectedAdaptation: scenario.expectedAdaptation,
      beforeNodeTypes: beforeTypes,
      afterNodeTypes: afterTypes,
      curveballAdaptation: diff,
      language: session.language,
    });
    try {
      const raw = await this._callWithTimeout(prompt);
      return this._parseAiJson({
        raw,
        dimension: 'curveballAdaptation',
        maxScore: 20,
      });
    } catch {
      return {
        dimension: 'curveballAdaptation',
        score: 0,
        maxScore: 20,
        data: { error: 'Evaluation failed' },
      };
    }
  }

  // ─── Final score ──────────────────────────────────────────────────────────────

  private _computeFinalScore(
    completedDimensions: DimensionResult[],
    hintsUsed: number,
    hasCurveball: boolean,
    isStructured: boolean,
  ): object {
    const dims: DimensionResult[] = isStructured
      ? completedDimensions
      : hasCurveball
        ? completedDimensions
        : completedDimensions.map((d) => {
            const newMax: number = NO_CURVEBALL_MAX[d.dimension] ?? d.maxScore;
            const scaledScore: number =
              d.maxScore > 0 ? Math.round((d.score / d.maxScore) * newMax) : 0;
            return { ...d, score: scaledScore, maxScore: newMax };
          });

    const rawScore: number = dims.reduce((sum, d) => sum + d.score, 0);
    const hintPenalty: number = Math.min(hintsUsed * 5, 15);
    const finalScore: number = Math.max(rawScore - hintPenalty, 0);

    return {
      rawScore,
      hintPenalty,
      finalScore,
      gradeBand: this._gradeBand(finalScore),
      hasCurveball,
    };
  }

  private _gradeBand(score: number): string {
    if (score >= 90) return 'Exceptional';
    if (score >= 75) return 'Strong';
    if (score >= 60) return 'Good';
    if (score >= 45) return 'Developing';
    return 'Needs Work';
  }

  // ─── Annotation + suggestions (both paths) ───────────────────────────────────

  private async _annotateTranscript(
    session: SDSession,
  ): Promise<DimensionResult> {
    const transcript = (session.transcriptHistory ?? []) as Array<{
      role: string;
    }>;
    const filtered = transcript.filter(
      (e) => e.role === 'user' || e.role === 'ai',
    );
    const candidateEntries = filtered
      .map((entry, idx) => ({ ...entry, entryIndex: idx }))
      .filter((e) => e.role === 'user');
    if (candidateEntries.length === 0) {
      return {
        dimension: 'annotations',
        score: 0,
        maxScore: 0,
        data: { annotations: [] },
      };
    }
    try {
      const raw = await this._callWithTimeout(
        buildAnnotationPrompt({
          problemTitle: session.problem.title,
          transcriptHistory: candidateEntries,
          language: session.language,
        }),
      );
      let annotations: unknown[] = [];
      try {
        annotations = JSON.parse(raw.trim()) as unknown[];
      } catch {
        /* fallback: empty */
      }
      return {
        dimension: 'annotations',
        score: 0,
        maxScore: 0,
        data: { annotations },
      };
    } catch {
      return {
        dimension: 'annotations',
        score: 0,
        maxScore: 0,
        data: { annotations: [] },
      };
    }
  }

  private async _generateSuggestions({
    session,
    scoringDimensions,
  }: {
    session: SDSession;
    scoringDimensions: DimensionResult[];
  }): Promise<DimensionResult> {
    try {
      const raw = await this._callWithTimeout(
        buildSuggestionsPrompt({
          problemTitle: session.problem.title,
          dimensions: scoringDimensions,
          language: session.language,
        }),
      );
      const parsed = JSON.parse(raw.trim()) as { suggestions?: unknown[] };
      const suggestions: unknown[] = Array.isArray(parsed.suggestions)
        ? parsed.suggestions
        : [];
      return {
        dimension: 'suggestions',
        score: 0,
        maxScore: 0,
        data: { suggestions },
      };
    } catch {
      return {
        dimension: 'suggestions',
        score: 0,
        maxScore: 0,
        data: { suggestions: [] },
      };
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private _avgKeys(
    scores: Record<string, number>,
    keys: readonly string[],
  ): number {
    const values = keys.map((k) => scores[k] ?? 0);
    return values.reduce((a, b) => a + b, 0) / keys.length;
  }

  private _avgScores(scores: Record<string, number>): number {
    const vals = Object.values(scores);
    if (vals.length === 0) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  private _pickKeys(
    scores: Record<string, number>,
    keys: readonly string[],
  ): Record<string, number> {
    return Object.fromEntries(keys.map((k) => [k, scores[k] ?? 0]));
  }

  private async _legacyEnrichment(
    sessionId: string,
  ): Promise<Record<string, unknown>> {
    try {
      const summaries = await this.stageSummaryRepo.find({
        where: { sessionId },
      });
      if (summaries.length === 0) return {};
      const stageScores: Record<string, number> = {};
      const allRedFlags: string[] = [];
      for (const s of summaries) {
        const avg = this._avgScores(s.scores ?? {});
        stageScores[s.stage] = avg;
        allRedFlags.push(...(s.redFlags ?? []));
      }
      const wrapUpSummary = summaries.find((s) => s.stage === 'WRAP_UP');
      const leftover = wrapUpSummary?.leftoverJson;
      const graphDeltaAfterCurveball =
        leftover && 'graphDeltaAfterCurveball' in leftover
          ? leftover.graphDeltaAfterCurveball
          : null;
      return {
        stageSummaries: {
          stageScores,
          redFlags: allRedFlags,
          totalStages: summaries.length,
        },
        ...(graphDeltaAfterCurveball ? { graphDeltaAfterCurveball } : {}),
      };
    } catch {
      return {};
    }
  }
}
