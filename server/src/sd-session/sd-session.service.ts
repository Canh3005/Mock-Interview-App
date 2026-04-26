import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SDSession, SDPhase } from './entities/sd-session.entity';
import { SDProblem } from '../sd-problem/entities/sd-problem.entity';
import { InterviewSession } from '../interview/entities/interview-session.entity';
import { CreateSDSessionDto } from './dto/create-sd-session.dto';
import {
  ArchitectureNodeDto,
  ArchitectureEdgeDto,
} from './dto/update-sd-session.dto';

@Injectable()
export class SDSessionService {
  private readonly logger = new Logger(SDSessionService.name);

  constructor(
    @InjectRepository(SDSession)
    private sdSessionRepository: Repository<SDSession>,
    @InjectRepository(SDProblem)
    private sdProblemRepository: Repository<SDProblem>,
    @InjectRepository(InterviewSession)
    private interviewSessionRepository: Repository<InterviewSession>,
  ) {}

  async create(
    dto: CreateSDSessionDto,
  ): Promise<{ sdSessionId: string; phase: string }> {
    const interviewSession: InterviewSession | null =
      await this.interviewSessionRepository.findOne({
        where: { id: dto.interviewSessionId },
      });
    if (!interviewSession) {
      throw new NotFoundException(
        `InterviewSession #${dto.interviewSessionId} not found`,
      );
    }

    const problem: SDProblem = await this._selectProblem(
      interviewSession.candidateLevel ?? undefined,
    );

    try {
      const entity: SDSession = this.sdSessionRepository.create({
        interviewSessionId: dto.interviewSessionId,
        problemId: problem.id,
        phase: 'CLARIFICATION',
        enableCurveball: dto.enableCurveball,
        durationMinutes: dto.durationMinutes,
        architectureJSON: null,
        transcriptHistory: [],
        status: 'IN_PROGRESS',
      });
      const result: SDSession = await this.sdSessionRepository.save(entity);
      this.logger.log(`SDSession created: ${result.id}`);
      return { sdSessionId: result.id, phase: result.phase };
    } catch (error) {
      this.logger.error('Failed to create SDSession', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<SDSession> {
    const session: SDSession | null = await this.sdSessionRepository.findOne({
      where: { id },
      relations: ['problem'],
    });
    if (!session) throw new NotFoundException(`SDSession #${id} not found`);
    return session;
  }

  async updateArchitecture({
    id,
    nodes,
    edges,
  }: {
    id: string;
    nodes: ArchitectureNodeDto[];
    edges: ArchitectureEdgeDto[];
  }): Promise<void> {
    const session: SDSession | null = await this.sdSessionRepository.findOne({
      where: { id },
    });
    if (!session) throw new NotFoundException(`SDSession #${id} not found`);
    await this.sdSessionRepository.update(id, {
      architectureJSON: { nodes, edges },
    });
  }

  async updatePhase({
    id,
    phase,
  }: {
    id: string;
    phase: SDPhase;
  }): Promise<void> {
    const session: SDSession | null = await this.sdSessionRepository.findOne({
      where: { id },
    });
    if (!session) throw new NotFoundException(`SDSession #${id} not found`);
    await this.sdSessionRepository.update(id, { phase });
    this.logger.log(`SDSession ${id} phase → ${phase}`);
  }

  async appendTranscript({
    id,
    entry,
  }: {
    id: string;
    entry: Record<string, unknown>;
  }): Promise<void> {
    const session: SDSession | null = await this.sdSessionRepository.findOne({
      where: { id },
    });
    if (!session) throw new NotFoundException(`SDSession #${id} not found`);
    session.transcriptHistory = [...session.transcriptHistory, entry];
    await this.sdSessionRepository.save(session);
  }

  private async _selectProblem(candidateLevel?: string): Promise<SDProblem> {
    if (candidateLevel) {
      const matched: SDProblem[] = await this.sdProblemRepository.find({
        where: { targetLevel: candidateLevel as SDProblem['targetLevel'] },
      });
      if (matched.length > 0) {
        return matched[Math.floor(Math.random() * matched.length)];
      }
    }

    const all: SDProblem[] = await this.sdProblemRepository.find();
    if (all.length > 0) {
      return all[Math.floor(Math.random() * all.length)];
    }

    const fallback: SDProblem = this.sdProblemRepository.create({
      title: 'Generic System Design',
      domain: 'general',
      targetRole: ['backend'],
      targetLevel: 'mid',
      difficulty: 'medium',
      estimatedDuration: 45,
      expectedComponents: [],
      curveBallScenarios: [],
      tags: [],
    });
    return this.sdProblemRepository.save(fallback);
  }
}
