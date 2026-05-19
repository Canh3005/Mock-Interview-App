import { Injectable } from '@nestjs/common';
import {
  QuestionProbeCompetency,
  QuestionProbeLanguage,
  QuestionProbeLevel,
  QuestionProbeRoleFamily,
  QuestionProbeStage,
} from '../question-bank/constants/question-bank-taxonomy.constants';
import type { QuestionProbe } from '../question-bank/entities/question-probe.entity';
import type { CandidateClaim } from '../documents/entities/candidate-claim.entity';
import type { RiskHypothesis } from '../documents/entities/risk-hypothesis.entity';
import type {
  BehavioralScoringParams,
  CvScoringParams,
  FallbackTrigger,
  InterviewDepth,
  PlannedProbe,
  ProbeSelectionContext,
  StageProbeAllocation,
  StagePriority,
  TechnicalScoringParams,
} from './types/session-plan.types';

const STAGE_5_PRIORITY_COMPETENCIES: QuestionProbeCompetency[] = [
  'conflict_handling',
  'collaboration',
  'communication',
  'impact_measurement',
];

const STAGE_PRIORITIES: Record<QuestionProbeStage, StagePriority> = {
  stage_1_culture_fit: 'must_include',
  stage_2_tech_stack: 'must_include',
  stage_3_domain_knowledge: 'must_include',
  stage_4_cv_deep_dive: 'nice_to_include',
  stage_5_soft_skills: 'must_include',
  stage_6_reverse_interview: 'nice_to_include',
};

const PROBE_COUNTS: Record<
  QuestionProbeStage,
  Record<InterviewDepth, number>
> = {
  stage_1_culture_fit: { broad: 2, deep: 1 },
  stage_2_tech_stack: { broad: 2, deep: 3 },
  stage_3_domain_knowledge: { broad: 2, deep: 3 },
  stage_4_cv_deep_dive: { broad: 1, deep: 1 },
  stage_5_soft_skills: { broad: 2, deep: 1 },
  stage_6_reverse_interview: { broad: 1, deep: 1 },
};

const RISK_SEVERITY_SCORES: Record<string, number> = {
  high: 1.0,
  medium: 0.6,
  low: 0.2,
};

const CLAIM_PRIORITY_WEIGHTS: Record<string, number> = {
  high: 1.0,
  medium: 0.6,
  low: 0.3,
};

const DIFFICULTY_RANGES: Record<QuestionProbeLevel, [number, number]> = {
  junior: [1, 2],
  mid: [2, 3],
  senior: [3, 4],
};

const ORDERED_STAGES: QuestionProbeStage[] = [
  'stage_1_culture_fit',
  'stage_2_tech_stack',
  'stage_3_domain_knowledge',
  'stage_4_cv_deep_dive',
  'stage_5_soft_skills',
  'stage_6_reverse_interview',
];

@Injectable()
export class ProbeSelectorService {
  /**
   * Xây dựng danh sách probe được chọn cho từng stage của phiên phỏng vấn.
   *
   * @param context - Toàn bộ thông tin cần thiết cho quá trình selection: level, roleFamily, language, competencies, claims, risks, tech stack
   * @returns Mảng StageProbeAllocation theo thứ tự stage (stage 1 → stage 6), mỗi phần tử chứa probe đã chọn và fallback
   */
  buildStageAllocations(
    context: ProbeSelectionContext,
  ): StageProbeAllocation[] {
    return ORDERED_STAGES.map((stage) => {
      const count: number = PROBE_COUNTS[stage][context.depth];
      const priority: StagePriority = STAGE_PRIORITIES[stage];
      const filteredProbes: QuestionProbe[] = this._hardFilter({
        probes: context.probes,
        stage,
        targetLevel: context.targetLevel,
        roleFamily: context.roleFamily,
        language: context.language,
      });
      const { selected, fallbacks } = this._selectForStage({
        stage,
        probes: filteredProbes,
        count,
        context,
      });
      return {
        stage,
        priority,
        allocatedMinutes: 0,
        selectedProbes: selected,
        fallbackProbes: fallbacks,
      };
    });
  }

  /**
   * Lọc cứng danh sách probe theo các điều kiện bắt buộc của stage.
   * Probe không vượt qua filter này bị loại hoàn toàn, không được đưa vào scoring.
   *
   * @param probes - Toàn bộ probe đã pre-filter từ DB
   * @param stage - Stage cần lọc
   * @param targetLevel - Level ứng viên; probe phải hỗ trợ level này
   * @param roleFamily - Role family; probe có roleFamilies rỗng áp dụng cho mọi role
   * @param language - Ngôn ngữ phiên phỏng vấn; probe phải có localizedContent cho ngôn ngữ này
   * @returns Danh sách probe đủ điều kiện cho stage
   */
  private _hardFilter({
    probes,
    stage,
    targetLevel,
    roleFamily,
    language,
  }: {
    probes: QuestionProbe[];
    stage: QuestionProbeStage;
    targetLevel: QuestionProbeLevel;
    roleFamily: QuestionProbeRoleFamily;
    language: QuestionProbeLanguage;
  }): QuestionProbe[] {
    return probes.filter((p) => {
      if (!p.stages.includes(stage)) return false;
      if (!p.levels.includes(targetLevel)) return false;
      if (p.roleFamilies.length > 0 && !p.roleFamilies.includes(roleFamily))
        return false;
      if (p.status !== 'active') return false;
      if (!p.localizedContent[language]) return false;
      return true;
    });
  }

  /**
   * Chọn probe tốt nhất cho một stage cụ thể dựa trên scoring.
   * Stage 6 (reverse interview) dùng logic selection riêng, không dùng scoring chung.
   *
   * @param stage - Stage cần chọn probe
   * @param probes - Danh sách probe đã qua hard filter cho stage này
   * @param count - Số lượng probe cần chọn (theo PROBE_COUNTS)
   * @param context - Context đầy đủ để tính score
   * @returns Mảng probe được chọn và mảng fallback (dùng khi probe chính không phù hợp lúc phỏng vấn)
   */
  private _selectForStage({
    stage,
    probes,
    count,
    context,
  }: {
    stage: QuestionProbeStage;
    probes: QuestionProbe[];
    count: number;
    context: ProbeSelectionContext;
  }): { selected: PlannedProbe[]; fallbacks: PlannedProbe[] } {
    const { targetLevel, roleFamily, priorityCompetencies } = context;
    if (stage === 'stage_6_reverse_interview') {
      return this._selectStage6({ probes, targetLevel, roleFamily });
    }
    const effectivePriorities: QuestionProbeCompetency[] =
      stage === 'stage_5_soft_skills'
        ? STAGE_5_PRIORITY_COMPETENCIES
        : priorityCompetencies;
    const scored = this._scoreProbesForStage({
      stage,
      probes,
      context,
      effectivePriorities,
    });
    scored.sort((a, b) => b.score - a.score);
    const selectedRaw = scored.slice(0, count);
    const fallbackCount: number = selectedRaw.filter(
      (_, i) => STAGE_PRIORITIES[stage] === 'must_include' || i < count,
    ).length;
    const fallbackRaw = scored.slice(count, count + fallbackCount);
    const orderedRaw =
      stage === 'stage_1_culture_fit'
        ? this._sortIntroFirst(selectedRaw)
        : selectedRaw;
    const selected: PlannedProbe[] = orderedRaw.map((s, i) =>
      this._buildPlannedProbe({ probe: s.probe, order: i + 1, score: s.score }),
    );
    const fallbacks: PlannedProbe[] = fallbackRaw.map((s, i) =>
      this._buildPlannedProbe({
        probe: s.probe,
        order: i + 1,
        score: s.score,
        isFallbackFor: selectedRaw[i]?.probe.id,
        fallbackTrigger: 'no_relevant_story',
      }),
    );
    return { selected, fallbacks };
  }

  private _selectStage6({
    probes,
    targetLevel,
    roleFamily,
  }: {
    probes: QuestionProbe[];
    targetLevel: QuestionProbeLevel;
    roleFamily: QuestionProbeRoleFamily;
  }): { selected: PlannedProbe[]; fallbacks: PlannedProbe[] } {
    const scored = probes
      .map((p) => ({
        probe: p,
        score: this._roleLevelFit({
          probeLevels: p.levels,
          probeFamilies: p.roleFamilies,
          targetLevel,
          roleFamily,
        }),
      }))
      .sort((a, b) => b.score - a.score);
    if (scored.length === 0) return { selected: [], fallbacks: [] };
    return {
      selected: [
        this._buildPlannedProbe({
          probe: scored[0].probe,
          order: 1,
          score: scored[0].score,
        }),
      ],
      fallbacks: [],
    };
  }

  private _scoreProbesForStage({
    stage,
    probes,
    context,
    effectivePriorities,
  }: {
    stage: QuestionProbeStage;
    probes: QuestionProbe[];
    context: ProbeSelectionContext;
    effectivePriorities: QuestionProbeCompetency[];
  }): Array<{ probe: QuestionProbe; score: number }> {
    const {
      targetLevel,
      roleFamily,
      competencyWeights,
      riskHypotheses,
      candidateClaims,
      cvTechStack,
      jdTechStack,
    } = context;
    const results: Array<{ probe: QuestionProbe; score: number }> = [];
    for (const probe of probes) {
      const score: number | null = this._routeScore({
        stage,
        probe,
        targetLevel,
        roleFamily,
        competencyWeights,
        riskHypotheses,
        candidateClaims,
        cvTechStack,
        jdTechStack,
        effectivePriorities,
      });
      if (score !== null) results.push({ probe, score });
    }
    return results;
  }

  private _routeScore({
    stage,
    probe,
    targetLevel,
    roleFamily,
    competencyWeights,
    riskHypotheses,
    candidateClaims,
    cvTechStack,
    jdTechStack,
    effectivePriorities,
  }: {
    stage: QuestionProbeStage;
    probe: QuestionProbe;
    targetLevel: QuestionProbeLevel;
    roleFamily: QuestionProbeRoleFamily;
    competencyWeights: Record<string, number>;
    riskHypotheses: RiskHypothesis[];
    candidateClaims: CandidateClaim[];
    cvTechStack: string[];
    jdTechStack: string[];
    effectivePriorities: QuestionProbeCompetency[];
  }): number | null {
    if (stage === 'stage_1_culture_fit' || stage === 'stage_5_soft_skills') {
      return this._scoreBehavioralProbe({
        probe,
        priorityCompetencies: effectivePriorities,
        competencyWeights,
        riskHypotheses,
        targetLevel,
        roleFamily,
      });
    }
    if (stage === 'stage_4_cv_deep_dive') {
      return this._scoreCvProbe({
        probe,
        candidateClaims,
        cvTechStack,
        jdTechStack,
        targetLevel,
        roleFamily,
      });
    }
    return this._scoreTechnicalProbe({
      probe,
      cvTechStack,
      jdTechStack,
      targetLevel,
      roleFamily,
    });
  }

  /**
   * Tính score hành vi cho probe dựa trên competency fit, role/level fit và risk signal.
   *
   * @param probe - Probe cần tính score
   * @param priorityCompetencies - Competency ưu tiên từ calibration profile (hoặc preset của stage 5)
   * @param competencyWeights - Trọng số từng competency từ calibration profile
   * @param riskHypotheses - Danh sách risk hypothesis để tăng weight cho probe liên quan
   * @param targetLevel - Level mục tiêu để tính role/level fit
   * @param roleFamily - Role family để tính role fit
   * @returns Score tổng hợp từ 0–1
   */
  private _scoreBehavioralProbe({
    probe,
    priorityCompetencies,
    competencyWeights,
    riskHypotheses,
    targetLevel,
    roleFamily,
  }: BehavioralScoringParams): number {
    const competencyFit: number = this._competencyFit({
      probeCompetencies: probe.competencies,
      priorityCompetencies,
      competencyWeights,
    });
    const roleLevelFit: number = this._roleLevelFit({
      probeLevels: probe.levels,
      probeFamilies: probe.roleFamilies,
      targetLevel,
      roleFamily,
    });
    const riskWeight: number = this._riskSignalWeight({
      probeCompetencies: probe.competencies,
      riskHypotheses,
    });
    return competencyFit * 0.45 + roleLevelFit * 0.35 + riskWeight * 0.2;
  }

  /**
   * Tính score kỹ thuật cho probe dựa trên overlap tech tag với CV và JD.
   *
   * @param probe - Probe cần tính score
   * @param cvTechStack - Danh sách tech từ CV của ứng viên
   * @param jdTechStack - Danh sách tech yêu cầu từ JD
   * @param targetLevel - Level mục tiêu để tính difficulty fit
   * @param roleFamily - Role family để tính role fit
   * @returns Score từ 0–1, hoặc null nếu probe có techTags nhưng không overlap — probe bị loại khỏi selection
   */
  private _scoreTechnicalProbe({
    probe,
    cvTechStack,
    jdTechStack,
    targetLevel,
    roleFamily,
  }: TechnicalScoringParams): number | null {
    const techFit: number = this._techTagFit({
      probeTechTags: probe.techTags,
      cvTechStack,
      jdTechStack,
    });
    if (probe.techTags.length > 0 && techFit === 0) return null;
    const roleLevelFit: number = this._roleLevelFit({
      probeLevels: probe.levels,
      probeFamilies: probe.roleFamilies,
      targetLevel,
      roleFamily,
    });
    const difficultyFit: number = this._difficultyFit({
      probeDifficulty: probe.difficulty,
      targetLevel,
    });
    return techFit * 0.55 + roleLevelFit * 0.3 + difficultyFit * 0.15;
  }

  /**
   * Tính score cho probe dùng trong CV deep dive (stage 4).
   * Ưu tiên probe có thể verify claim của ứng viên và match tech stack.
   *
   * @param probe - Probe cần tính score
   * @param candidateClaims - Danh sách claim từ CV để đánh giá claim fit
   * @param cvTechStack - Tech stack từ CV
   * @param jdTechStack - Tech stack từ JD
   * @param targetLevel - Level mục tiêu để tính role/level fit
   * @param roleFamily - Role family để tính role fit
   * @returns Score tổng hợp từ 0–1
   */
  private _scoreCvProbe({
    probe,
    candidateClaims,
    cvTechStack,
    jdTechStack,
    targetLevel,
    roleFamily,
  }: CvScoringParams): number {
    const claimFit: number = this._claimVerificationFit({
      probe,
      candidateClaims,
    });
    const techFit: number = this._techTagFit({
      probeTechTags: probe.techTags,
      cvTechStack,
      jdTechStack,
    });
    const roleLevelFit: number = this._roleLevelFit({
      probeLevels: probe.levels,
      probeFamilies: probe.roleFamilies,
      targetLevel,
      roleFamily,
    });
    return claimFit * 0.5 + techFit * 0.3 + roleLevelFit * 0.2;
  }

  private _techTagFit({
    probeTechTags,
    cvTechStack,
    jdTechStack,
  }: {
    probeTechTags: string[];
    cvTechStack: string[];
    jdTechStack: string[];
  }): number {
    if (probeTechTags.length === 0) return 0.3;
    const jdMatches: number = probeTechTags.filter((t) =>
      jdTechStack.includes(t),
    ).length;
    const cvOnlyMatches: number = probeTechTags.filter(
      (t) => cvTechStack.includes(t) && !jdTechStack.includes(t),
    ).length;
    return (jdMatches * 0.7 + cvOnlyMatches * 0.3) / probeTechTags.length;
  }

  private _roleLevelFit({
    probeLevels,
    probeFamilies,
    targetLevel,
    roleFamily,
  }: {
    probeLevels: QuestionProbeLevel[];
    probeFamilies: QuestionProbeRoleFamily[];
    targetLevel: QuestionProbeLevel;
    roleFamily: QuestionProbeRoleFamily;
  }): number {
    const levelMatch: number =
      probeLevels.length === 0 || probeLevels.includes(targetLevel) ? 1.0 : 0.0;
    const familyMatch: number =
      probeFamilies.length === 0 || probeFamilies.includes(roleFamily)
        ? 1.0
        : 0.0;
    return (levelMatch + familyMatch) / 2;
  }

  private _difficultyFit({
    probeDifficulty,
    targetLevel,
  }: {
    probeDifficulty: number | null;
    targetLevel: QuestionProbeLevel;
  }): number {
    if (probeDifficulty === null) return 0.5;
    const [min, max] = DIFFICULTY_RANGES[targetLevel];
    if (probeDifficulty >= min && probeDifficulty <= max) return 1.0;
    const deviation: number = Math.min(
      Math.abs(probeDifficulty - min),
      Math.abs(probeDifficulty - max),
    );
    return deviation === 1 ? 0.5 : 0.0;
  }

  private _competencyFit({
    probeCompetencies,
    priorityCompetencies,
    competencyWeights,
  }: {
    probeCompetencies: QuestionProbeCompetency[];
    priorityCompetencies: QuestionProbeCompetency[];
    competencyWeights: Record<string, number>;
  }): number {
    if (priorityCompetencies.length === 0) return 0.0;
    let weightedOverlap: number = 0;
    let totalWeight: number = 0;
    for (const competency of priorityCompetencies) {
      const weight: number = competencyWeights[competency] ?? 1.0;
      totalWeight += weight;
      if (probeCompetencies.includes(competency)) weightedOverlap += weight;
    }
    return totalWeight > 0 ? weightedOverlap / totalWeight : 0.0;
  }

  private _riskSignalWeight({
    probeCompetencies,
    riskHypotheses,
  }: {
    probeCompetencies: QuestionProbeCompetency[];
    riskHypotheses: RiskHypothesis[];
  }): number {
    const overlapping: RiskHypothesis[] = riskHypotheses.filter((r) =>
      r.relatedCompetencies.some((c) => probeCompetencies.includes(c)),
    );
    if (overlapping.length === 0) return 0.0;
    const totalScore: number = overlapping.reduce(
      (sum, r) => sum + (RISK_SEVERITY_SCORES[r.severity] ?? 0.2),
      0,
    );
    return Math.min(totalScore / overlapping.length, 1.0);
  }

  private _claimVerificationFit({
    probe,
    candidateClaims,
  }: {
    probe: QuestionProbe;
    candidateClaims: CandidateClaim[];
  }): number {
    const typeBonus: number =
      probe.type === 'cv_claim_verification' ? 0.3 : 0.0;
    if (candidateClaims.length === 0) return typeBonus;
    let weightedOverlap: number = 0;
    let totalWeight: number = 0;
    for (const claim of candidateClaims) {
      const weight: number =
        CLAIM_PRIORITY_WEIGHTS[claim.verificationPriority] ?? 0.3;
      totalWeight += weight;
      const hasOverlap: boolean = claim.impliedCompetencies.some((c) =>
        probe.competencies.includes(c),
      );
      if (hasOverlap) weightedOverlap += weight;
    }
    const claimFit: number =
      totalWeight > 0 ? weightedOverlap / totalWeight : 0.0;
    return Math.min(claimFit + typeBonus, 1.0);
  }

  private _sortIntroFirst(
    scored: Array<{ probe: QuestionProbe; score: number }>,
  ): Array<{ probe: QuestionProbe; score: number }> {
    const intros = scored.filter((s) => s.probe.conversationDepth === 'intro');
    const rest = scored.filter((s) => s.probe.conversationDepth !== 'intro');
    return [...intros, ...rest];
  }

  private _buildPlannedProbe({
    probe,
    order,
    score,
    isFallbackFor,
    fallbackTrigger,
  }: {
    probe: QuestionProbe;
    order: number;
    score: number;
    isFallbackFor?: string;
    fallbackTrigger?: FallbackTrigger;
  }): PlannedProbe {
    const tagLabel: string =
      probe.techTags.length > 0
        ? `Tech: ${probe.techTags.slice(0, 3).join(', ')}`
        : `Competency: ${probe.competencies.slice(0, 2).join(', ')}`;
    return {
      questionProbeId: probe.id,
      questionProbeRevision: probe.revision,
      plannedOrder: order,
      selectionScore: Math.round(score * 1000) / 1000,
      selectionReason: tagLabel,
      estimatedMinutes: 0,
      ...(isFallbackFor !== undefined
        ? { isFallbackFor, fallbackTrigger }
        : {}),
    };
  }
}
