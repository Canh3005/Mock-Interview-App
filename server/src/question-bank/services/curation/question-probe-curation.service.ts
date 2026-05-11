import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { QuestionProbeStatus } from '../../constants/question-bank-taxonomy.constants';
import {
  ImportQuestionProbesDto,
  QuestionProbeDraftDto,
} from '../../dto/question-probe-curation.dto';
import { QuestionProbeAuditLog } from '../../entities/question-probe-audit-log.entity';
import { QuestionProbe } from '../../entities/question-probe.entity';
import { QuestionProbeAuditService } from './question-probe-audit.service';
import { QuestionProbeValidationService } from './question-probe-validation.service';
import { ProbeValidationResult } from '../../types/question-probe-validation.types';

export interface ProbeListQuery {
  page: number;
  limit: number;
  status?: string;
  roleFamily?: string;
  level?: string;
  type?: string;
  competency?: string;
  search?: string;
}

export interface ImportQuestionProbesResult {
  successful: number;
  failed: number;
  errors: Array<{ index: number; error: string }>;
  data: QuestionProbe[];
}

@Injectable()
export class QuestionProbeCurationService {
  constructor(
    @InjectRepository(QuestionProbe)
    private readonly probeRepository: Repository<QuestionProbe>,
    private readonly validationService: QuestionProbeValidationService,
    private readonly auditService: QuestionProbeAuditService,
  ) {}

  async createDraft({
    dto,
    actorId,
  }: {
    dto: QuestionProbeDraftDto;
    actorId: string;
  }): Promise<QuestionProbe> {
    await this._assertCodeAvailable(dto.code ?? null, null);
    const probe: QuestionProbe = this.probeRepository.create({
      status: 'draft',
      createdBy: actorId,
      updatedBy: actorId,
    });
    this._applyDraftDto({ probe, dto, actorId });
    const saved: QuestionProbe = await this.probeRepository.save(probe);
    await this.auditService.record({
      probe: saved,
      actorId,
      action: 'created',
      previousStatus: null,
      nextStatus: saved.status,
    });
    return saved;
  }

  async findAll({ query }: { query: ProbeListQuery }): Promise<{
    data: QuestionProbe[];
    total: number;
    page: number;
    limit: number;
  }> {
    const qb: SelectQueryBuilder<QuestionProbe> = this.probeRepository
      .createQueryBuilder('probe')
      .orderBy('probe.updatedAt', 'DESC');
    this._applyListFilters({ qb, query });
    const [data, total]: [QuestionProbe[], number] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return { data, total, page: query.page, limit: query.limit };
  }

  async findOne(id: string): Promise<QuestionProbe> {
    const probe: QuestionProbe | null = await this.probeRepository.findOne({
      where: { id },
    });
    if (!probe) throw new NotFoundException(`QuestionProbe #${id} not found`);
    return probe;
  }

  async exportAll({
    query,
  }: {
    query: Omit<ProbeListQuery, 'page' | 'limit'>;
  }): Promise<QuestionProbe[]> {
    const qb: SelectQueryBuilder<QuestionProbe> = this.probeRepository
      .createQueryBuilder('probe')
      .orderBy('probe.updatedAt', 'DESC')
      .take(1000);
    this._applyListFilters({
      qb,
      query: { ...query, page: 1, limit: 1000 },
    });
    return qb.getMany();
  }

  async update({
    id,
    dto,
    actorId,
  }: {
    id: string;
    dto: QuestionProbeDraftDto;
    actorId: string;
  }): Promise<QuestionProbe> {
    const probe: QuestionProbe = await this.findOne(id);
    if (probe.status === 'active' || probe.status === 'retired') {
      throw new BadRequestException(
        'Active or retired probes cannot be edited',
      );
    }
    await this._assertCodeAvailable(dto.code ?? null, probe.id);
    const previousStatus: QuestionProbeStatus = probe.status;
    this._applyDraftDto({ probe, dto, actorId });
    probe.revision += 1;
    const saved: QuestionProbe = await this.probeRepository.save(probe);
    await this.auditService.record({
      probe: saved,
      actorId,
      action: 'updated',
      previousStatus,
      nextStatus: saved.status,
    });
    return saved;
  }

  async submitReview({
    id,
    actorId,
    reason,
  }: {
    id: string;
    actorId: string;
    reason?: string;
  }): Promise<QuestionProbe> {
    const probe: QuestionProbe = await this.findOne(id);
    this._assertAllowedStatus(probe.status, ['draft', 'needs_revision']);
    this._assertProbeValid(probe);
    return this._transition({
      probe,
      actorId,
      nextStatus: 'in_review',
      action: 'submitted_review',
      reason,
    });
  }

  async reopenDraft({
    id,
    actorId,
    reason,
  }: {
    id: string;
    actorId: string;
    reason?: string;
  }): Promise<QuestionProbe> {
    const probe: QuestionProbe = await this.findOne(id);
    this._assertAllowedStatus(probe.status, ['needs_revision']);
    return this._transition({
      probe,
      actorId,
      nextStatus: 'draft',
      action: 'reopened_draft',
      reason,
    });
  }

  async publish({
    id,
    actorId,
    reason,
  }: {
    id: string;
    actorId: string;
    reason?: string;
  }): Promise<QuestionProbe> {
    const probe: QuestionProbe = await this.findOne(id);
    this._assertAllowedStatus(probe.status, ['in_review']);
    this._assertProbeValid(probe);
    probe.reviewedBy = actorId;
    probe.publishedAt = new Date();
    return this._transition({
      probe,
      actorId,
      nextStatus: 'active',
      action: 'published',
      reason,
    });
  }

  async markNeedsRevision({
    id,
    actorId,
    reason,
  }: {
    id: string;
    actorId: string;
    reason?: string;
  }): Promise<QuestionProbe> {
    this._assertReason(reason);
    const probe: QuestionProbe = await this.findOne(id);
    this._assertAllowedStatus(probe.status, ['in_review', 'active']);
    return this._transition({
      probe,
      actorId,
      nextStatus: 'needs_revision',
      action: 'marked_needs_revision',
      reason,
    });
  }

  async retire({
    id,
    actorId,
    reason,
  }: {
    id: string;
    actorId: string;
    reason?: string;
  }): Promise<QuestionProbe> {
    this._assertReason(reason);
    const probe: QuestionProbe = await this.findOne(id);
    this._assertAllowedStatus(probe.status, ['active', 'needs_revision']);
    probe.retiredAt = new Date();
    return this._transition({
      probe,
      actorId,
      nextStatus: 'retired',
      action: 'retired',
      reason,
    });
  }

  async findAudit(id: string): Promise<QuestionProbeAuditLog[]> {
    await this.findOne(id);
    return this.auditService.findByProbe(id);
  }

  async importDrafts({
    dto,
    actorId,
  }: {
    dto: ImportQuestionProbesDto;
    actorId: string;
  }): Promise<ImportQuestionProbesResult> {
    const data: QuestionProbe[] = [];
    const errors: Array<{ index: number; error: string }> = [];
    for (let index = 0; index < dto.items.length; index += 1) {
      try {
        const probe: QuestionProbe = await this.createDraft({
          dto: dto.items[index],
          actorId,
        });
        data.push(probe);
      } catch (error: unknown) {
        errors.push({ index, error: this._errorMessage(error) });
      }
    }
    return {
      successful: data.length,
      failed: errors.length,
      errors,
      data,
    };
  }

  private async _transition({
    probe,
    actorId,
    nextStatus,
    action,
    reason,
  }: {
    probe: QuestionProbe;
    actorId: string;
    nextStatus: QuestionProbeStatus;
    action:
      | 'reopened_draft'
      | 'submitted_review'
      | 'published'
      | 'marked_needs_revision'
      | 'retired';
    reason?: string | null;
  }): Promise<QuestionProbe> {
    const previousStatus: QuestionProbeStatus = probe.status;
    probe.status = nextStatus;
    probe.updatedBy = actorId;
    probe.lastTransitionReason = reason ?? null;
    probe.revision += 1;
    const saved: QuestionProbe = await this.probeRepository.save(probe);
    await this.auditService.record({
      probe: saved,
      actorId,
      action,
      previousStatus,
      nextStatus,
      reason,
    });
    return saved;
  }

  private _applyDraftDto({
    probe,
    dto,
    actorId,
  }: {
    probe: QuestionProbe;
    dto: QuestionProbeDraftDto;
    actorId: string;
  }): void {
    if (dto.code !== undefined) probe.code = dto.code ?? null;
    if (dto.stages !== undefined) probe.stages = dto.stages;
    if (dto.roleFamilies !== undefined) probe.roleFamilies = dto.roleFamilies;
    if (dto.levels !== undefined) probe.levels = dto.levels;
    if (dto.type !== undefined) probe.type = dto.type ?? null;
    if (dto.competencies !== undefined) probe.competencies = dto.competencies;
    if (dto.techTags !== undefined) probe.techTags = dto.techTags;
    if (dto.difficulty !== undefined) probe.difficulty = dto.difficulty ?? null;
    if (dto.intent !== undefined) probe.intent = dto.intent ?? null;
    if (dto.primaryQuestion !== undefined) {
      probe.primaryQuestion = dto.primaryQuestion ?? null;
    }
    if (dto.expectedSignals !== undefined) {
      probe.expectedSignals = dto.expectedSignals;
    }
    if (dto.redFlags !== undefined) probe.redFlags = dto.redFlags;
    if (dto.scoringHints !== undefined) probe.scoringHints = dto.scoringHints;
    if (dto.followUps !== undefined) probe.followUps = dto.followUps;
    if (dto.localizedContent !== undefined) {
      probe.localizedContent = dto.localizedContent;
    }
    if (dto.sourceReferences !== undefined) {
      probe.sourceReferences = dto.sourceReferences;
    }
    probe.updatedBy = actorId;
  }

  private _applyListFilters({
    qb,
    query,
  }: {
    qb: SelectQueryBuilder<QuestionProbe>;
    query: ProbeListQuery;
  }): void {
    if (query.status) qb.andWhere('probe.status = :status', query);
    if (query.type) qb.andWhere('probe.type = :type', query);
    if (query.roleFamily) {
      qb.andWhere(':roleFamily = ANY(probe.roleFamilies)', query);
    }
    if (query.level) qb.andWhere(':level = ANY(probe.levels)', query);
    if (query.competency) {
      qb.andWhere(':competency = ANY(probe.competencies)', query);
    }
    if (query.search) {
      qb.andWhere('(probe.code ILIKE :search OR probe.intent ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
  }

  private async _assertCodeAvailable(
    code: string | null,
    currentId: string | null,
  ): Promise<void> {
    if (!code) return;
    const existing: QuestionProbe | null = await this.probeRepository.findOne({
      where: { code },
    });
    if (existing && existing.id !== currentId) {
      throw new ConflictException('QuestionProbe code already exists');
    }
  }

  private _assertProbeValid(probe: QuestionProbe): void {
    const result: ProbeValidationResult =
      this.validationService.validate(probe);
    if (result.valid) return;
    throw new BadRequestException({
      message: 'QuestionProbe does not pass quality gate',
      issues: result.issues,
    });
  }

  private _assertAllowedStatus(
    current: QuestionProbeStatus,
    allowed: QuestionProbeStatus[],
  ): void {
    if (allowed.includes(current)) return;
    throw new BadRequestException(`Invalid status transition from ${current}`);
  }

  private _assertReason(reason?: string): void {
    if (reason && reason.trim().length > 0) return;
    throw new BadRequestException('Reason is required for this transition');
  }

  private _errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return 'Unknown import error';
  }
}
