import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiveCodingSession } from '../live-coding/entities/live-coding-session.entity';
import { LiveCodingSessionProblem } from '../live-coding/entities/live-coding-session-problem.entity';
import { UserSolvedProblem } from './entities/user-solved-problem.entity';
import { LiveCodingService } from '../live-coding/live-coding.service';

type PracticeRunResult = Awaited<
  ReturnType<LiveCodingService['runCodeStateless']>
>;

@Injectable()
export class PracticeDSAService {
  constructor(
    @InjectRepository(LiveCodingSession)
    private readonly sessionRepo: Repository<LiveCodingSession>,
    @InjectRepository(LiveCodingSessionProblem)
    private readonly sessionProblemRepo: Repository<LiveCodingSessionProblem>,
    @InjectRepository(UserSolvedProblem)
    private readonly solvedRepo: Repository<UserSolvedProblem>,
    private readonly liveCodingService: LiveCodingService,
  ) {}

  getProblem(problemId: string) {
    return this.liveCodingService.getProblemWithTemplates(problemId);
  }

  async runCode(problemId: string, code: string, language: string) {
    return this.liveCodingService.runCodeStateless(problemId, code, language);
  }

  async submitAndCreate(
    userId: string,
    problemId: string,
    code: string,
    language: string,
    unlockedHints: number[] = [],
  ) {
    const { problem } =
      await this.liveCodingService.getProblemWithTemplates(problemId);
    const runResult = await this.liveCodingService.runCodeStateless(
      problemId,
      code,
      language,
    );

    if (!this.hasAcceptedAllTests(runResult)) {
      throw new BadRequestException({
        message: 'Solution must pass all test cases before submitting.',
        results: runResult.results,
        hasTLE: runResult.hasTLE,
      });
    }

    const completedAt = new Date();

    const session = this.sessionRepo.create({
      interviewSessionId: null,
      mode: 'solo',
      status: 'COMPLETED',
      aiConversation: [],
      idleEvents: [],
      completedAt,
    });
    await this.sessionRepo.save(session);

    const sp = this.sessionProblemRepo.create({
      sessionId: session.id,
      problemId: problem.id,
      order: 0,
      language,
      phase: 'DONE',
      finalCode: code,
      approachText: null,
      approachSubmittedAt: null,
      submittedAt: completedAt,
      hasTLE: runResult.hasTLE,
      lastRunAt: completedAt,
      runHistory: [
        {
          runAt: completedAt.toISOString(),
          results: runResult.results,
          hasTLE: runResult.hasTLE,
        },
      ],
      unlockedHints,
      hintsUsed: unlockedHints.length,
      runsUsed: 1,
    });
    await this.sessionProblemRepo.save(sp);

    await this.markSolved(userId, problemId);

    return {
      status: 'COMPLETED',
      allSubmitted: true,
      results: runResult.results,
      hasTLE: runResult.hasTLE,
    };
  }

  private hasAcceptedAllTests(runResult: PracticeRunResult): boolean {
    return (
      runResult.results.length > 0 &&
      runResult.results.every((result) => result.status === 'AC')
    );
  }

  async markSolved(userId: string, problemId: string): Promise<void> {
    await this.solvedRepo
      .createQueryBuilder()
      .insert()
      .into(UserSolvedProblem)
      .values({ userId, problemId })
      .orIgnore()
      .execute();
  }

  async getSolvedProblemIds(userId: string): Promise<string[]> {
    const rows = await this.solvedRepo.find({
      where: { userId },
      select: ['problemId'],
    });
    return rows.map((r) => r.problemId);
  }
}
