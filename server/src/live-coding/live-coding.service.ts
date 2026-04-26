import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  LiveCodingSession,
  RunResult,
} from './entities/live-coding-session.entity';
import { LiveCodingSessionProblem } from './entities/live-coding-session-problem.entity';
import { InterviewSession } from '../interview/entities/interview-session.entity';
import {
  Problem,
  ProblemDifficulty,
  ProblemStatus,
} from '../problems/entities/problem.entity';
import { ProblemTemplate } from '../problems/entities/problem-template.entity';
import { TestCase } from '../test-cases/entities/test-case.entity';
import { JudgeService, JudgeSubmissionResult } from '../judge/judge.service';
import { LiveCodingAiService } from './live-coding-ai.service';
import { LiveCodingScoringService } from './live-coding-scoring.service';
import { RoundOrchestratorService } from '../interview/round-orchestrator.service';
import { DSA_DEBRIEF_QUEUE, DsaDebriefJobName } from '../jobs/jobs.constants';

@Injectable()
export class LiveCodingService {
  private readonly logger = new Logger(LiveCodingService.name);

  constructor(
    @InjectRepository(LiveCodingSession)
    private readonly sessionRepo: Repository<LiveCodingSession>,
    @InjectRepository(LiveCodingSessionProblem)
    private readonly sessionProblemRepo: Repository<LiveCodingSessionProblem>,
    @InjectRepository(InterviewSession)
    private readonly interviewSessionRepo: Repository<InterviewSession>,
    @InjectRepository(Problem)
    private readonly problemRepo: Repository<Problem>,
    @InjectRepository(ProblemTemplate)
    private readonly templateRepo: Repository<ProblemTemplate>,
    @InjectRepository(TestCase)
    private readonly testCaseRepo: Repository<TestCase>,
    private readonly judgeService: JudgeService,
    private readonly aiService: LiveCodingAiService,
    private readonly scoringService: LiveCodingScoringService,
    private readonly orchestrator: RoundOrchestratorService,
    @InjectQueue(DSA_DEBRIEF_QUEUE) private readonly debriefQueue: Queue,
  ) {}

  // ─── Session Creation ────────────────────────────────────────────────────

  async createSession(dto: {
    interviewSessionId: string;
    mode: 'practice' | 'combat';
    problemCount: number;
  }): Promise<LiveCodingSession> {
    const interviewSession = await this.interviewSessionRepo.findOne({
      where: { id: dto.interviewSessionId },
    });
    if (!interviewSession)
      throw new NotFoundException('InterviewSession not found');

    const problemIds = await this.assignProblems(
      interviewSession,
      dto.problemCount,
    );

    const session = this.sessionRepo.create({
      interviewSessionId: dto.interviewSessionId,
      mode: dto.mode,
      status: 'IN_PROGRESS',
      aiConversation: [],
      idleEvents: [],
    });
    await this.sessionRepo.save(session);

    const sessionProblems = problemIds.map((problemId, idx) =>
      this.sessionProblemRepo.create({
        sessionId: session.id,
        problemId,
        order: idx,

        phase: 'READ',
        approachText: null,
        finalCode: null,
        approachSubmittedAt: null,
        submittedAt: null,
        hasTLE: false,
        lastRunAt: null,
        runHistory: [],
      }),
    );
    await this.sessionProblemRepo.save(sessionProblems);

    session.sessionProblems = sessionProblems;
    return session;
  }

  private async assignProblems(
    interviewSession: InterviewSession,
    count: number,
  ): Promise<string[]> {
    const level = interviewSession.candidateLevel ?? 'mid';
    const difficultyMap: Record<string, ProblemDifficulty[]> = {
      junior: [ProblemDifficulty.EASY],
      mid: [ProblemDifficulty.MEDIUM],
      senior: [ProblemDifficulty.HARD, ProblemDifficulty.MEDIUM],
    };
    const difficulties = difficultyMap[level] ?? [ProblemDifficulty.MEDIUM];
    const eligibleStatuses = [ProblemStatus.PUBLISHED, ProblemStatus.VERIFIED];

    const problems = await this.problemRepo
      .createQueryBuilder('p')
      .where('p.difficulty IN (:...difficulties)', { difficulties })
      .andWhere('p.status IN (:...statuses)', { statuses: eligibleStatuses })
      .orderBy('RANDOM()')
      .limit(count)
      .getMany();

    if (problems.length < count) {
      const existingIds = problems.map((p) => p.id);
      const fallback = await this.problemRepo
        .createQueryBuilder('p')
        .where('p.status IN (:...statuses)', { statuses: eligibleStatuses })
        .andWhere(
          existingIds.length ? 'p.id NOT IN (:...existingIds)' : '1=1',
          { existingIds },
        )
        .orderBy('RANDOM()')
        .limit(count - problems.length)
        .getMany();
      problems.push(...fallback);
    }

    return problems.map((p) => p.id);
  }

  // ─── Session Retrieval ───────────────────────────────────────────────────

  async getSession(sessionId: string) {
    const session = await this.getSessionOrThrow(sessionId);

    const sessionProblems = await this.sessionProblemRepo.find({
      where: { sessionId },
      order: { order: 'ASC' },
    });

    const problemIds = sessionProblems.map((sp) => sp.problemId);
    const problems = problemIds.length
      ? await this.problemRepo.findBy({ id: In(problemIds) })
      : [];

    const templates: Record<
      string,
      { languageId: string; starterCode: string }[]
    > = {};
    if (problemIds.length) {
      const rows = await this.templateRepo.find({
        where: { problemId: In(problemIds), isEnabled: true },
        select: ['problemId', 'languageId', 'starterCode', 'isEnabled'],
      });
      for (const row of rows) {
        if (!templates[row.problemId]) templates[row.problemId] = [];
        templates[row.problemId].push({
          languageId: row.languageId,
          starterCode: row.starterCode,
        });
      }
      console.log('Fetched templates for session retrieval:', templates);
    }

    const allTestCases = problemIds.length
      ? await this.testCaseRepo.find({
          where: { problemId: In(problemIds), isHidden: false },
          select: ['id', 'inputData', 'expectedOutput', 'problemId'],
          order: { createdAt: 'ASC' },
        })
      : [];

    const testCases: Record<
      string,
      { id: string; inputData: string; expectedOutput: string }[]
    > = {};
    for (const tc of allTestCases) {
      if (!testCases[tc.problemId]) testCases[tc.problemId] = [];
      testCases[tc.problemId].push({
        id: tc.id,
        inputData: tc.inputData,
        expectedOutput: tc.expectedOutput,
      });
    }

    return { session, sessionProblems, problems, templates, testCases };
  }

  // ─── Approach ───────────────────────────────────────────────────────────

  async submitApproach(
    sessionId: string,
    problemId: string,
    approachText: string,
  ): Promise<LiveCodingSessionProblem> {
    const sp = await this.getSessionProblemOrThrow(sessionId, problemId);
    sp.approachText = approachText;
    sp.phase = 'CODE';
    sp.approachSubmittedAt = new Date();
    return this.sessionProblemRepo.save(sp);
  }

  // ─── Run Code ───────────────────────────────────────────────────────────

  async runCode(
    sessionId: string,
    problemId: string,
    code: string,
    language: string,
  ): Promise<{ results: RunResult[]; hasTLE: boolean }> {
    console.log('Running code with params:', {
      sessionId,
      problemId,
      language,
    });
    const session = await this.getSessionOrThrow(sessionId);
    const sp = await this.getSessionProblemOrThrow(sessionId, problemId);

    const problem = await this.problemRepo.findOne({
      where: { id: problemId },
    });
    if (!problem) throw new NotFoundException('Problem not found');

    const template = await this.templateRepo.findOne({
      where: { problemId, languageId: language },
    });
    if (!template)
      throw new NotFoundException(`No template for language: ${language}`);

    const testCases = await this.testCaseRepo.findBy({ problemId });
    const fullSource = template.driverCode.replace('{{USER_CODE}}', code);

    const judgeResults: JudgeSubmissionResult[] =
      await this.judgeService.runBatchTests(
        language,
        fullSource,
        testCases.map((tc) => ({
          input: tc.inputData,
          expectedOutput: tc.expectedOutput,
        })),
        Number(problem.timeLimitMultiplier),
      );

    const results: RunResult[] = testCases.map((tc, idx) => {
      const jr = judgeResults[idx];
      const statusId = jr.status.id;
      let status: RunResult['status'];
      if (statusId === 3) status = 'AC';
      else if (statusId === 4) status = 'WA';
      else if (statusId === 5) status = 'TLE';
      else if (statusId === 6) status = 'CE';
      else status = 'RE';
      const r: RunResult = {
        testCaseId: tc.id,
        isHidden: tc.isHidden,
        status,
        timeMs: jr.time ? Math.round(parseFloat(jr.time) * 1000) : null,
      };
      if (!tc.isHidden) {
        r.input = tc.inputData;
        r.stdout = jr.stdout?.trim() || undefined;
        r.output = jr.output ?? undefined;
        r.expectedOutput = tc.expectedOutput;
        if (jr.compile_output) r.compileError = jr.compile_output;
      }
      return r;
    });

    const hasTLE = results.some((r) => r.status === 'TLE');

    sp.runHistory = [
      ...sp.runHistory,
      { runAt: new Date().toISOString(), results, hasTLE },
    ];
    sp.hasTLE = hasTLE;
    sp.lastRunAt = new Date();
    await this.sessionProblemRepo.save(sp);

    if (hasTLE) {
      this.aiService
        .onTLE(session, sp, problem, results)
        .catch((e: Error) =>
          this.logger.warn(`AI TLE trigger failed: ${e.message}`),
        );
    }
    console.log('Run code results:', { sessionId, problemId, results, hasTLE });
    return { results, hasTLE };
  }

  // ─── Submit Problem ──────────────────────────────────────────────────────

  async submitProblem(
    sessionId: string,
    problemId: string,
    code: string,
    language: string,
    meta?: { hintsUsed?: number; approachText?: string; timeUsedMs?: number },
  ): Promise<{ status: LiveCodingSession['status']; allSubmitted: boolean }> {
    const session = await this.getSessionOrThrow(sessionId);
    const sp = await this.getSessionProblemOrThrow(sessionId, problemId);

    sp.finalCode = code;
    sp.language = language;
    sp.phase = 'DONE';
    sp.submittedAt = new Date();
    if (meta?.hintsUsed !== undefined) sp.hintsUsed = meta.hintsUsed;
    if (meta?.timeUsedMs !== undefined) sp.timeUsedMs = meta.timeUsedMs;
    if (meta?.approachText !== undefined && !sp.approachText)
      sp.approachText = meta.approachText;
    sp.runsUsed = sp.runHistory?.length ?? 0;
    await this.sessionProblemRepo.save(sp);

    const all = await this.sessionProblemRepo.find({ where: { sessionId } });
    const allSubmitted = all.every((p) => p.submittedAt !== null);

    if (allSubmitted) {
      session.status = 'SCORING';
      session.completedAt = new Date();
      await this.sessionRepo.save(session);
      await this.debriefQueue.add(
        DsaDebriefJobName.DEBRIEF_SESSION,
        { sessionId },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      );
    }

    return { status: session.status, allSubmitted };
  }

  // ─── Stateless helpers (no session required) ────────────────────────────

  async getProblemWithTemplates(problemId: string) {
    const problem = await this.problemRepo.findOne({
      where: { id: problemId },
    });
    if (!problem) throw new NotFoundException('Problem not found');

    const [rows, testCases] = await Promise.all([
      this.templateRepo.find({
        where: { problemId, isEnabled: true },
        select: ['languageId', 'starterCode'],
      }),
      this.testCaseRepo.find({
        where: { problemId, isHidden: false },
        select: ['id', 'inputData', 'expectedOutput'],
        order: { createdAt: 'ASC' },
      }),
    ]);

    return { problem, templates: rows, testCases };
  }

  async runCodeStateless(
    problemId: string,
    code: string,
    language: string,
  ): Promise<{ results: RunResult[]; hasTLE: boolean }> {
    const problem = await this.problemRepo.findOne({
      where: { id: problemId },
    });
    if (!problem) throw new NotFoundException('Problem not found');

    const template = await this.templateRepo.findOne({
      where: { problemId, languageId: language },
    });
    if (!template)
      throw new NotFoundException(`No template for language: ${language}`);

    const testCases = await this.testCaseRepo.findBy({ problemId });
    const fullSource = template.driverCode.replace('{{USER_CODE}}', code);

    const judgeResults: JudgeSubmissionResult[] =
      await this.judgeService.runBatchTests(
        language,
        fullSource,
        testCases.map((tc) => ({
          input: tc.inputData,
          expectedOutput: tc.expectedOutput,
        })),
        Number(problem.timeLimitMultiplier),
      );
    console.log('results', judgeResults);
    const results: RunResult[] = testCases.map((tc, idx) => {
      const jr = judgeResults[idx];
      const statusId = jr.status.id;
      let status: RunResult['status'];
      if (statusId === 3) status = 'AC';
      else if (statusId === 4) status = 'WA';
      else if (statusId === 5) status = 'TLE';
      else if (statusId === 6) status = 'CE';
      else status = 'RE';
      const r: RunResult = {
        testCaseId: tc.id,
        isHidden: tc.isHidden,
        status,
        timeMs: jr.time ? Math.round(parseFloat(jr.time) * 1000) : null,
      };
      if (!tc.isHidden) {
        r.input = tc.inputData;
        r.stdout = jr.stdout?.trim() || undefined;
        r.output = jr.output ?? undefined;
        r.expectedOutput = tc.expectedOutput;
        if (jr.compile_output) r.compileError = jr.compile_output;
      }
      return r;
    });
    return { results, hasTLE: results.some((r) => r.status === 'TLE') };
  }

  // ─── Idle Trigger ───────────────────────────────────────────────────────
  // problemId comes from the client (FE tracks active problem, not stored in DB)

  async triggerIdle(sessionId: string, problemId: string): Promise<void> {
    const session = await this.getSessionOrThrow(sessionId);

    session.idleEvents = [
      ...session.idleEvents,
      { problemId, at: new Date().toISOString() },
    ];
    await this.sessionRepo.save(session);

    const [problem, sp] = await Promise.all([
      this.problemRepo.findOne({ where: { id: problemId } }),
      this.sessionProblemRepo.findOne({ where: { sessionId, problemId } }),
    ]);
    if (!problem || !sp) return;

    this.aiService
      .onIdle(session, sp, problem)
      .catch((e: Error) =>
        this.logger.warn(`AI idle trigger failed: ${e.message}`),
      );
  }

  // ─── Score / Debrief ────────────────────────────────────────────────────

  async getScore(sessionId: string) {
    const session = await this.getSessionOrThrow(sessionId);
    const nextRound =
      session.status === 'COMPLETED' && session.interviewSessionId
        ? await this.orchestrator.getNextRound(
            session.interviewSessionId,
            'dsa',
          )
        : null;

    return { status: session.status, score: session.finalScore, nextRound };
  }

  async processDebrief(sessionId: string): Promise<void> {
    const session = await this.getSessionOrThrow(sessionId);
    const sessionProblems = await this.sessionProblemRepo.find({
      where: { sessionId },
    });

    const problemIds = sessionProblems.map((sp) => sp.problemId);
    const problems = problemIds.length
      ? await this.problemRepo.findBy({ id: In(problemIds) })
      : [];

    const debriefResults = await Promise.allSettled(
      sessionProblems.map((sp) => {
        const problem = problems.find((p) => p.id === sp.problemId);
        if (!problem) return Promise.resolve({ error: 'Problem not found' });
        return this.aiService.generateDebrief(session, sp, problem);
      }),
    );

    const finalScore: Record<string, unknown> = {};
    for (let i = 0; i < sessionProblems.length; i++) {
      const result = debriefResults[i];
      const sp = sessionProblems[i];
      const pid = sp.problemId;
      const problem = problems.find((p) => p.id === pid);

      if (result.status === 'fulfilled') {
        const debrief = result.value as Record<string, unknown>;
        const lastRun = sp.runHistory.at(-1);
        const testResults = lastRun
          ? {
              visible: {
                passed: lastRun.results.filter(
                  (r) => !r.isHidden && r.status === 'AC',
                ).length,
                total: lastRun.results.filter((r) => !r.isHidden).length,
              },
              hidden: {
                passed: lastRun.results.filter(
                  (r) => r.isHidden && r.status === 'AC',
                ).length,
                total: lastRun.results.filter((r) => r.isHidden).length,
              },
            }
          : {
              visible: { passed: 0, total: 0 },
              hidden: { passed: 0, total: 0 },
            };

        const complexity = debrief.complexityAnalysis as
          | Record<string, string>
          | undefined;
        const timeLimitMs = problem
          ? ({ EASY: 20 * 60000, MEDIUM: 35 * 60000, HARD: 50 * 60000 }[
              problem.difficulty
            ] ?? 35 * 60000)
          : 35 * 60000;

        const score = this.scoringService.compute({
          testResults,
          timeUsedMs: sp.timeUsedMs ?? null,
          timeLimitMs,
          runsUsed: sp.runsUsed ?? sp.runHistory.length,
          hintsUsed: sp.hintsUsed ?? 0,
          timedOut: false,
          approachVerdict: debrief.approachVerdict as string | null as any,
          actualTimeComplexity: complexity?.submitted ?? null,
          actualSpaceComplexity: null,
          optimalTimeComplexity: problem?.optimalTimeComplexity ?? null,
          optimalSpaceComplexity: problem?.optimalSpaceComplexity ?? null,
        });

        finalScore[pid] = { ...debrief, score };
      } else {
        finalScore[pid] = { error: 'Debrief generation failed' };
        this.logger.warn(`Debrief failed for ${pid}: ${result.reason}`);
      }
    }

    session.finalScore = finalScore;
    session.status = 'COMPLETED';
    await this.sessionRepo.save(session);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private async getSessionOrThrow(
    sessionId: string,
  ): Promise<LiveCodingSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('LiveCodingSession not found');
    return session;
  }

  private async getSessionProblemOrThrow(
    sessionId: string,
    problemId: string,
  ): Promise<LiveCodingSessionProblem> {
    const sp = await this.sessionProblemRepo.findOne({
      where: { sessionId, problemId },
    });
    if (!sp)
      throw new ForbiddenException('Problem does not belong to this session');
    return sp;
  }
}
