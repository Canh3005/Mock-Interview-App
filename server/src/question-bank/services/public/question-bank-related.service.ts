import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { QuestionProbeLanguage } from '../../constants/question-bank-taxonomy.constants';
import { QuestionProbe } from '../../entities/question-probe.entity';
import { QuestionBankPublicProjectionService } from './question-bank-public-projection.service';
import { PublicQuestionProbeCard } from '../../types/question-bank-public.types';

@Injectable()
export class QuestionBankRelatedService {
  constructor(
    @InjectRepository(QuestionProbe)
    private readonly probeRepository: Repository<QuestionProbe>,
    private readonly projectionService: QuestionBankPublicProjectionService,
  ) {}

  async findRelatedQuestions({
    probe,
    locale,
    relatedLimit,
  }: {
    probe: QuestionProbe;
    locale: QuestionProbeLanguage;
    relatedLimit: number;
  }): Promise<PublicQuestionProbeCard[]> {
    if (relatedLimit === 0) return [];
    const qb: SelectQueryBuilder<QuestionProbe> = this.probeRepository
      .createQueryBuilder('probe')
      .where('probe.status = :status', { status: 'active' })
      .andWhere('probe.id != :probeId', { probeId: probe.id });

    const overlapClauses: string[] = [];
    const params: Record<string, unknown> = {};
    this._addOverlapClause({
      clause: 'probe.type = :relatedType',
      value: probe.type,
      paramsKey: 'relatedType',
      overlapClauses,
      params,
    });
    this._addOverlapClause({
      clause: 'probe.roleFamilies && :relatedRoleFamilies',
      value: probe.roleFamilies,
      paramsKey: 'relatedRoleFamilies',
      overlapClauses,
      params,
    });
    this._addOverlapClause({
      clause: 'probe.levels && :relatedLevels',
      value: probe.levels,
      paramsKey: 'relatedLevels',
      overlapClauses,
      params,
    });
    this._addOverlapClause({
      clause: 'probe.competencies && :relatedCompetencies',
      value: probe.competencies,
      paramsKey: 'relatedCompetencies',
      overlapClauses,
      params,
    });
    this._addOverlapClause({
      clause: 'probe.techTags && :relatedTechTags',
      value: probe.techTags,
      paramsKey: 'relatedTechTags',
      overlapClauses,
      params,
    });
    if (overlapClauses.length === 0) return [];

    const candidates: QuestionProbe[] = await qb
      .andWhere(`(${overlapClauses.join(' OR ')})`, params)
      .orderBy('probe.publishedAt', 'DESC', 'NULLS LAST')
      .addOrderBy('probe.id', 'ASC')
      .take(200)
      .getMany();

    return candidates
      .map((candidate: QuestionProbe) => ({
        candidate,
        card: this.projectionService.toPublicCard({ probe: candidate, locale }),
        relatedScore: this._relatedScore({ source: probe, candidate }),
      }))
      .filter(
        ({ card, relatedScore }): boolean =>
          relatedScore > 0 && card.supportedLanguages.length > 0,
      )
      .sort((left, right) => this._sortRelated({ source: probe, left, right }))
      .slice(0, relatedLimit)
      .map(({ card }) => card);
  }

  private _addOverlapClause({
    clause,
    value,
    paramsKey,
    overlapClauses,
    params,
  }: {
    clause: string;
    value: string | string[] | null;
    paramsKey: string;
    overlapClauses: string[];
    params: Record<string, unknown>;
  }): void {
    if (Array.isArray(value) && value.length === 0) return;
    if (!value) return;
    overlapClauses.push(clause);
    params[paramsKey] = value;
  }

  private _sortRelated({
    source,
    left,
    right,
  }: {
    source: QuestionProbe;
    left: { candidate: QuestionProbe; relatedScore: number };
    right: { candidate: QuestionProbe; relatedScore: number };
  }): number {
    if (right.relatedScore !== left.relatedScore) {
      return right.relatedScore - left.relatedScore;
    }
    const leftDifficultyDistance: number = this._difficultyDistance({
      source,
      candidate: left.candidate,
    });
    const rightDifficultyDistance: number = this._difficultyDistance({
      source,
      candidate: right.candidate,
    });
    if (leftDifficultyDistance !== rightDifficultyDistance) {
      return leftDifficultyDistance - rightDifficultyDistance;
    }
    const leftPublishedAt: number = left.candidate.publishedAt?.getTime() ?? 0;
    const rightPublishedAt: number =
      right.candidate.publishedAt?.getTime() ?? 0;
    if (leftPublishedAt !== rightPublishedAt) {
      return rightPublishedAt - leftPublishedAt;
    }
    const leftKey: string = left.candidate.code ?? left.candidate.id;
    const rightKey: string = right.candidate.code ?? right.candidate.id;
    return leftKey.localeCompare(rightKey);
  }

  private _relatedScore({
    source,
    candidate,
  }: {
    source: QuestionProbe;
    candidate: QuestionProbe;
  }): number {
    let score = 0;
    if (source.type && candidate.type === source.type) score += 5;
    score +=
      this._overlapCount(source.competencies, candidate.competencies) * 4;
    score +=
      this._overlapCount(source.roleFamilies, candidate.roleFamilies) * 3;
    score += this._overlapCount(source.levels, candidate.levels) * 2;
    score += this._overlapCount(source.techTags, candidate.techTags) * 2;
    const distance: number = this._difficultyDistance({ source, candidate });
    if (distance === 0) score += 1;
    if (distance === 1) score += 0.5;
    return score;
  }

  private _difficultyDistance({
    source,
    candidate,
  }: {
    source: QuestionProbe;
    candidate: QuestionProbe;
  }): number {
    if (!source.difficulty || !candidate.difficulty) {
      return Number.MAX_SAFE_INTEGER;
    }
    return Math.abs(source.difficulty - candidate.difficulty);
  }

  private _overlapCount(left: string[], right: string[]): number {
    const rightSet: Set<string> = new Set(right);
    return left.filter((value: string): boolean => rightSet.has(value)).length;
  }
}
