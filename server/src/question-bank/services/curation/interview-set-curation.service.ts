import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { QuestionProbeStatus } from '../../constants/question-bank-taxonomy.constants';
import { InterviewSetDraftDto } from '../../dto/interview-set-curation.dto';
import { InterviewSet } from '../../entities/interview-set.entity';
import { QuestionProbe } from '../../entities/question-probe.entity';
import type { InterviewSetListQuery } from '../../types/question-bank-curation.types';

@Injectable()
export class InterviewSetCurationService {
  constructor(
    @InjectRepository(InterviewSet)
    private readonly interviewSetRepository: Repository<InterviewSet>,
    @InjectRepository(QuestionProbe)
    private readonly probeRepository: Repository<QuestionProbe>,
  ) {}

  async create({
    dto,
    actorId,
  }: {
    dto: InterviewSetDraftDto;
    actorId: string;
  }): Promise<InterviewSet> {
    await this._assertCodeAvailable(dto.code ?? null, null);
    const interviewSet: InterviewSet = this.interviewSetRepository.create({
      status: 'draft',
      createdBy: actorId,
      updatedBy: actorId,
    });
    this._applyDto({ interviewSet, dto, actorId });
    return this.interviewSetRepository.save(interviewSet);
  }

  async findAll({ query }: { query: InterviewSetListQuery }): Promise<{
    data: InterviewSet[];
    total: number;
    page: number;
    limit: number;
  }> {
    const qb: SelectQueryBuilder<InterviewSet> = this.interviewSetRepository
      .createQueryBuilder('set')
      .orderBy('set.updatedAt', 'DESC');
    this._applyListFilters({ qb, query });
    const [data, total]: [InterviewSet[], number] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return { data, total, page: query.page, limit: query.limit };
  }

  async findOne(id: string): Promise<InterviewSet> {
    const interviewSet: InterviewSet | null =
      await this.interviewSetRepository.findOne({ where: { id } });
    if (!interviewSet) {
      throw new NotFoundException(`InterviewSet #${id} not found`);
    }
    return interviewSet;
  }

  async update({
    id,
    dto,
    actorId,
  }: {
    id: string;
    dto: InterviewSetDraftDto;
    actorId: string;
  }): Promise<InterviewSet> {
    const interviewSet: InterviewSet = await this.findOne(id);
    if (interviewSet.status === 'active' || interviewSet.status === 'retired') {
      throw new BadRequestException(
        'Active or retired interview sets cannot be edited',
      );
    }
    await this._assertCodeAvailable(dto.code ?? null, interviewSet.id);
    this._applyDto({ interviewSet, dto, actorId });
    interviewSet.revision += 1;
    return this.interviewSetRepository.save(interviewSet);
  }

  async publish({
    id,
    actorId,
    reason,
  }: {
    id: string;
    actorId: string;
    reason?: string;
  }): Promise<InterviewSet> {
    const interviewSet: InterviewSet = await this.findOne(id);
    this._assertAllowedStatus(interviewSet.status, ['draft', 'in_review']);
    await this._assertPublishable(interviewSet);
    interviewSet.status = 'active';
    interviewSet.updatedBy = actorId;
    interviewSet.publishedAt = new Date();
    interviewSet.lastTransitionReason = reason ?? null;
    interviewSet.revision += 1;
    return this.interviewSetRepository.save(interviewSet);
  }

  async retire({
    id,
    actorId,
    reason,
  }: {
    id: string;
    actorId: string;
    reason?: string;
  }): Promise<InterviewSet> {
    this._assertReason(reason);
    const interviewSet: InterviewSet = await this.findOne(id);
    this._assertAllowedStatus(interviewSet.status, [
      'active',
      'needs_revision',
    ]);
    interviewSet.status = 'retired';
    interviewSet.updatedBy = actorId;
    interviewSet.retiredAt = new Date();
    interviewSet.lastTransitionReason = reason ?? null;
    interviewSet.revision += 1;
    return this.interviewSetRepository.save(interviewSet);
  }

  private _applyDto({
    interviewSet,
    dto,
    actorId,
  }: {
    interviewSet: InterviewSet;
    dto: InterviewSetDraftDto;
    actorId: string;
  }): void {
    interviewSet.code = dto.code ?? null;
    interviewSet.title = dto.title;
    interviewSet.localizedContent = dto.localizedContent ?? {};
    interviewSet.roleFamily = dto.roleFamily;
    interviewSet.level = dto.level;
    interviewSet.durationMinutes = dto.durationMinutes;
    interviewSet.difficulty = dto.difficulty;
    interviewSet.stages = dto.stages;
    interviewSet.competencies = dto.competencies;
    interviewSet.questionCount = dto.questionCount;
    interviewSet.probeIds = dto.probeIds ?? [];
    interviewSet.slotRules = dto.slotRules ?? [];
    interviewSet.updatedBy = actorId;
  }

  private _applyListFilters({
    qb,
    query,
  }: {
    qb: SelectQueryBuilder<InterviewSet>;
    query: InterviewSetListQuery;
  }): void {
    if (query.status) qb.andWhere('set.status = :status', query);
    if (query.roleFamily) {
      qb.andWhere('set.roleFamily = :roleFamily', query);
    }
    if (query.level) qb.andWhere('set.level = :level', query);
    if (query.search) {
      qb.andWhere('(set.code ILIKE :search OR set.title ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
  }

  private async _assertCodeAvailable(
    code: string | null,
    currentId: string | null,
  ): Promise<void> {
    if (!code) return;
    const existing: InterviewSet | null =
      await this.interviewSetRepository.findOne({ where: { code } });
    if (existing && existing.id !== currentId) {
      throw new ConflictException('InterviewSet code already exists');
    }
  }

  private async _assertPublishable(interviewSet: InterviewSet): Promise<void> {
    if (interviewSet.questionCount < 1) {
      throw new BadRequestException('InterviewSet questionCount is required');
    }
    if (
      interviewSet.probeIds.length === 0 &&
      interviewSet.slotRules.length === 0
    ) {
      throw new BadRequestException('InterviewSet needs probes or slot rules');
    }
    if (interviewSet.probeIds.length === 0) return;

    const activeProbes: QuestionProbe[] = await this.probeRepository.find({
      where: { id: In(interviewSet.probeIds), status: 'active' },
    });
    if (activeProbes.length !== interviewSet.probeIds.length) {
      throw new BadRequestException(
        'InterviewSet contains probes that are not active',
      );
    }
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
}
