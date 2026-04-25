import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InterviewSession } from './entities/interview-session.entity';

@Injectable()
export class RoundOrchestratorService {
  constructor(
    @InjectRepository(InterviewSession)
    private readonly interviewSessionRepo: Repository<InterviewSession>,
  ) {}

  async getNextRound(
    interviewSessionId: string,
    currentRound: string,
  ): Promise<string | null> {
    const session = await this.interviewSessionRepo.findOne({
      where: { id: interviewSessionId },
    });
    if (!session) return null;

    const rounds = session.rounds;
    const idx = rounds.indexOf(currentRound);
    if (idx < 0 || idx >= rounds.length - 1) return null;
    return rounds[idx + 1];
  }
}
