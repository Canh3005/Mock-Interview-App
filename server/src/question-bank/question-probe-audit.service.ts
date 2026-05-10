import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionProbeStatus } from './constants/question-bank-taxonomy.constants';
import {
  QuestionProbeAuditAction,
  QuestionProbeAuditLog,
} from './entities/question-probe-audit-log.entity';
import { QuestionProbe } from './entities/question-probe.entity';

@Injectable()
export class QuestionProbeAuditService {
  constructor(
    @InjectRepository(QuestionProbeAuditLog)
    private readonly auditRepository: Repository<QuestionProbeAuditLog>,
  ) {}

  async record({
    probe,
    actorId,
    action,
    previousStatus,
    nextStatus,
    reason,
  }: {
    probe: QuestionProbe;
    actorId: string;
    action: QuestionProbeAuditAction;
    previousStatus: QuestionProbeStatus | null;
    nextStatus: QuestionProbeStatus | null;
    reason?: string | null;
  }): Promise<QuestionProbeAuditLog> {
    const audit: QuestionProbeAuditLog = this.auditRepository.create({
      probeId: probe.id,
      actorId,
      action,
      previousStatus,
      nextStatus,
      reason: reason ?? null,
      snapshot: this._buildSnapshot(probe),
    });
    return this.auditRepository.save(audit);
  }

  async findByProbe(probeId: string): Promise<QuestionProbeAuditLog[]> {
    return this.auditRepository.find({
      where: { probeId },
      order: { createdAt: 'DESC' },
    });
  }

  private _buildSnapshot(probe: QuestionProbe): Record<string, unknown> {
    return {
      code: probe.code,
      status: probe.status,
      revision: probe.revision,
      stages: probe.stages,
      roleFamilies: probe.roleFamilies,
      levels: probe.levels,
      type: probe.type,
      competencies: probe.competencies,
      difficulty: probe.difficulty,
    };
  }
}
