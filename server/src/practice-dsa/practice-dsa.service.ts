import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiveCodingSession } from '../live-coding/entities/live-coding-session.entity';
import { LiveCodingSessionProblem } from '../live-coding/entities/live-coding-session-problem.entity';
import { UserSolvedProblem } from './entities/user-solved-problem.entity';
import { LiveCodingService } from '../live-coding/live-coding.service';

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

  runCode(problemId: string, code: string, language: string) {
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

    const session = this.sessionRepo.create({
      interviewSessionId: null,
      mode: 'solo',
      status: 'COMPLETED',
      aiConversation: [],
      idleEvents: [],
      completedAt: new Date(),
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
      submittedAt: new Date(),
      hasTLE: false,
      lastRunAt: null,
      runHistory: [],
      unlockedHints,
    });
    await this.sessionProblemRepo.save(sp);

    await this.markSolved(userId, problemId);

    return { status: 'COMPLETED', allSubmitted: true };
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
