import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NSDTurnRecordEntity } from '../entities/nsd-turn-record.entity';
import { NSDPhaseSummaryEntity } from '../entities/nsd-phase-summary.entity';
import type {
  NSDInterviewPhase,
  NSDTurnAction,
  NSDEvalLevel,
  NSDFillEvent,
  NSDExtraNodeEvent,
  NSDItemCounters,
  NSDPhaseSummaryRecord,
} from '../types/nsd.types';

export interface NSDSaveTurnParams {
  sessionId: string;
  phase: NSDInterviewPhase;
  turnIndex: number;
  action: NSDTurnAction;
  itemKey?: string;
  questionKey?: string;
  candidateAnswer: string;
  responseText: string;
  evalLevel?: NSDEvalLevel;
  countersSnapshot?: NSDItemCounters[];
  fillEvents?: NSDFillEvent[];
  extraNodeEvents?: NSDExtraNodeEvent[];
}

@Injectable()
export class NSDTurnPersisterService {
  constructor(
    @InjectRepository(NSDTurnRecordEntity)
    private turnRepo: Repository<NSDTurnRecordEntity>,
    @InjectRepository(NSDPhaseSummaryEntity)
    private summaryRepo: Repository<NSDPhaseSummaryEntity>,
  ) {}

  async saveTurn(params: NSDSaveTurnParams): Promise<NSDTurnRecordEntity> {
    const entity = this.turnRepo.create({
      sessionId: params.sessionId,
      phase: params.phase,
      turnIndex: params.turnIndex,
      action: params.action,
      itemKey: params.itemKey ?? null,
      questionKey: params.questionKey ?? null,
      candidateAnswer: params.candidateAnswer,
      responseText: params.responseText,
      evalLevel: params.evalLevel ?? null,
      countersSnapshot: params.countersSnapshot ?? null,
      fillEvents: params.fillEvents ?? [],
      extraNodeEvents: params.extraNodeEvents ?? [],
    });
    return this.turnRepo.save(entity);
  }

  async savePhaseSummary(
    sessionId: string,
    phase: NSDInterviewPhase,
    summary: NSDPhaseSummaryRecord,
  ): Promise<void> {
    await this.summaryRepo
      .createQueryBuilder()
      .insert()
      .into(NSDPhaseSummaryEntity)
      .values({ sessionId, phase, summary })
      .orUpdate(['summary'], ['sessionId', 'phase'])
      .execute();
  }

  async getTurnRecords(
    sessionId: string,
    phase?: NSDInterviewPhase,
  ): Promise<NSDTurnRecordEntity[]> {
    const qb = this.turnRepo
      .createQueryBuilder('t')
      .where('t.sessionId = :sessionId', { sessionId })
      .orderBy('t.turnIndex', 'ASC');

    if (phase) {
      qb.andWhere('t.phase = :phase', { phase });
    }

    return qb.getMany();
  }

  async getPhaseSummaries(sessionId: string): Promise<NSDPhaseSummaryEntity[]> {
    return this.summaryRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }

  async getNextTurnIndex(sessionId: string): Promise<number> {
    const result = await this.turnRepo
      .createQueryBuilder('t')
      .select('MAX(t.turnIndex)', 'max')
      .where('t.sessionId = :sessionId', { sessionId })
      .getRawOne<{ max: number | null }>();
    return (result?.max ?? -1) + 1;
  }
}
