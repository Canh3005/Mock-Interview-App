import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NSDSession } from './entities/nsd-session.entity';
import { InterviewSession } from '../interview/entities/interview-session.entity';
import { NSDProblemService } from '../nsd-problem/nsd-problem.service';
import { CreateNSDSessionDto } from './dto/create-nsd-session.dto';
import type {
  NSDPhase,
  NSDCanvasState,
  NSDPhase1Progress,
  NSDPhase2Progress,
  NSDPhase3Progress,
  NSDPhase4Progress,
  NSDPhase5Progress,
  NSDEvaluationResult,
} from '../nsd-orchestrator/types/nsd.types';

@Injectable()
export class NSDSessionService {
  private readonly logger = new Logger(NSDSessionService.name);

  constructor(
    @InjectRepository(NSDSession)
    private sessionRepo: Repository<NSDSession>,
    @InjectRepository(InterviewSession)
    private interviewRepo: Repository<InterviewSession>,
    private problemService: NSDProblemService,
  ) {}

  async create(
    dto: CreateNSDSessionDto,
  ): Promise<{ nsdSessionId: string; phase: NSDPhase }> {
    const interviewSession = await this.interviewRepo.findOne({
      where: { id: dto.interviewSessionId },
    });
    if (!interviewSession) {
      throw new NotFoundException(
        `InterviewSession #${dto.interviewSessionId} not found`,
      );
    }

    const targetLevel =
      dto.targetLevel ?? interviewSession.candidateLevel ?? undefined;
    const problem = await this.problemService.selectRandom(targetLevel);
    if (!problem) {
      throw new NotFoundException('No active NSD problem found');
    }

    const entity = this.sessionRepo.create({
      interviewSessionId: dto.interviewSessionId,
      problemId: problem.id,
      phase: 'PHASE_1_FR',
      status: 'IN_PROGRESS',
      canvasJSON: null,
      phase1Progress: null,
      phase2Progress: null,
      phase3Progress: null,
      phase4Progress: null,
      phase5Progress: null,
      evaluationResult: null,
      phaseStartedAt: new Date(),
    });

    const result = await this.sessionRepo.save(entity);
    this.logger.log(`NSDSession created: ${result.id} problemId=${problem.id}`);
    return { nsdSessionId: result.id, phase: result.phase };
  }

  async findOne(id: string): Promise<NSDSession> {
    const session = await this.sessionRepo.findOne({
      where: { id },
      relations: ['problem', 'interviewSession'],
    });
    if (!session) throw new NotFoundException(`NSDSession #${id} not found`);
    return session;
  }

  async updateCanvas(id: string, canvas: NSDCanvasState): Promise<void> {
    const session = await this.sessionRepo.findOne({ where: { id } });
    if (!session) throw new NotFoundException(`NSDSession #${id} not found`);
    await this.sessionRepo.update(id, { canvasJSON: canvas });
  }

  async updatePhase(id: string, phase: NSDPhase): Promise<void> {
    await this.sessionRepo.update(id, { phase, phaseStartedAt: new Date() });
    this.logger.log(`NSDSession ${id} → ${phase}`);
  }

  async updatePhaseProgress(
    id: string,
    updates: Partial<{
      phase1Progress: NSDPhase1Progress;
      phase2Progress: NSDPhase2Progress;
      phase3Progress: NSDPhase3Progress;
      phase4Progress: NSDPhase4Progress;
      phase5Progress: NSDPhase5Progress;
    }>,
  ): Promise<void> {
    await this.sessionRepo.update(id, updates);
  }

  async saveEvaluationResult(
    id: string,
    result: NSDEvaluationResult,
  ): Promise<void> {
    await this.sessionRepo.update(id, {
      evaluationResult: result,
      status: 'COMPLETED',
      phase: 'COMPLETED',
    });
  }

  async findByInterviewSession(
    interviewSessionId: string,
  ): Promise<NSDSession | null> {
    return this.sessionRepo.findOne({
      where: { interviewSessionId },
      order: { createdAt: 'DESC' },
    });
  }
}
