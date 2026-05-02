import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { SDSession } from '../sd-session/entities/sd-session.entity';
import { CurveBallScenario } from '../sd-problem/entities/sd-problem.entity';
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
} from './prompts/evaluation-prompts';

const FAST_MODEL = 'llama-3.1-8b-instant';
const AI_TIMEOUT_MS = 30_000;

interface DimensionResult {
  dimension: string;
  score: number;
  maxScore: number;
  data: Record<string, unknown>;
}

interface EvaluationProgress {
  completedDimensions: DimensionResult[];
}

export interface EvaluationStatusResponse {
  status: 'idle' | 'processing' | 'completed' | 'failed';
  progress: EvaluationProgress | null;
  result?: Record<string, unknown>;
}

const NO_CURVEBALL_MAX: Record<string, number> = {
  componentCoverage: 31,
  scalabilityFit: 25,
  tradeoffArticulation: 25,
  communicationClarity: 19,
};

@Injectable()
export class SDEvaluatorService {
  private readonly logger = new Logger(SDEvaluatorService.name);

  constructor(
    @InjectRepository(SDSession)
    private readonly sdSessionRepo: Repository<SDSession>,
    @InjectQueue(SD_EVALUATION_QUEUE)
    private readonly sdEvaluationQueue: Queue,
    private readonly groqService: GroqService,
  ) {}

  async enqueueEvaluation(sessionId: string): Promise<{ queued: boolean }> {
    const session: SDSession | null = await this.sdSessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.phase !== 'COMPLETED')
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
    const hasCurveball: boolean =
      session.curveballArchitectureSnapshot !== null;

    const pushAndUpdate = async (result: DimensionResult): Promise<void> => {
      completedDimensions.push(result);
      await job.updateProgress({
        completedDimensions: [...completedDimensions],
      });
    };

    await pushAndUpdate(this._computeComponentCoverage(session));
    await this._runAiDimensions({ session, hasCurveball, pushAndUpdate });

    const evaluationResult: Record<string, unknown> = this._computeFinalScore(
      completedDimensions,
      session.hintsUsed,
      hasCurveball,
    ) as unknown as Record<string, unknown>;

    const update: DeepPartial<SDSession> = { id: sessionId, evaluationResult };
    await this.sdSessionRepo.save(update);
    this.logger.log(`Evaluation completed for session ${sessionId}`);
  }

  private async _runAiDimensions({
    session,
    hasCurveball,
    pushAndUpdate,
  }: {
    session: SDSession;
    hasCurveball: boolean;
    pushAndUpdate: (r: DimensionResult) => Promise<void>;
  }): Promise<void> {
    await Promise.allSettled([
      this._evaluateScalability(session).then(pushAndUpdate),
      this._evaluateTradeoff(session).then(pushAndUpdate),
      this._evaluateCommunication(session).then(pushAndUpdate),
      hasCurveball
        ? this._evaluateCurveball(session).then(pushAndUpdate)
        : Promise.resolve(),
    ]);
  }

  private _computeComponentCoverage(session: SDSession): DimensionResult {
    const nodes = (session.architectureJSON?.nodes ?? []) as {
      type?: string;
    }[];
    const drawn: Set<string> = new Set(
      nodes.map((n) => (n.type ?? '').toLowerCase()).filter(Boolean),
    );
    const expected: string[] = session.problem.expectedComponents ?? [];
    const matched: string[] = expected.filter((c) =>
      drawn.has(c.toLowerCase()),
    );
    const missing: string[] = expected.filter(
      (c) => !drawn.has(c.toLowerCase()),
    );
    const score: number =
      expected.length > 0
        ? Math.round((matched.length / expected.length) * 25)
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
    });
    try {
      const raw: string = await this._callWithTimeout(prompt);
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
    const prompt: string = buildTradeoffPrompt({
      problemTitle: session.problem.title,
      transcriptHistory: transcript,
    });
    try {
      const raw: string = await this._callWithTimeout(prompt);
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
    const prompt: string = buildCommunicationPrompt({
      problemTitle: session.problem.title,
      transcriptHistory: transcript,
    });
    try {
      const raw: string = await this._callWithTimeout(prompt);
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
    const beforeTypes: string[] = beforeNodes
      .map((n) => n.type ?? '')
      .filter(Boolean);
    const afterTypes: string[] = afterNodes
      .map((n) => n.type ?? '')
      .filter(Boolean);
    const diff: Record<string, string[]> = {
      addedNodes: afterTypes.filter((t) => !beforeTypes.includes(t)),
      removedNodes: beforeTypes.filter((t) => !afterTypes.includes(t)),
    };
    const prompt: string = buildCurveballPrompt({
      problemTitle: session.problem.title,
      curveballScenarioPrompt: scenario.prompt,
      expectedAdaptation: scenario.expectedAdaptation,
      beforeNodeTypes: beforeTypes,
      afterNodeTypes: afterTypes,
      curveballAdaptation: diff,
    });
    try {
      const raw: string = await this._callWithTimeout(prompt);
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

  private _computeFinalScore(
    completedDimensions: DimensionResult[],
    hintsUsed: number,
    hasCurveball: boolean,
  ): object {
    const dims: DimensionResult[] = hasCurveball
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
      dimensions: dims,
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
}
