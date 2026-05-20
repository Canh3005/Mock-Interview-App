import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { SessionPlan } from './entities/session-plan.entity';
import { ProbeSelectorService } from './probe-selector.service';
import { CreateSessionPlanDto } from './dto/create-session-plan.dto';
import { BehaviorCalibrationProfile } from '../documents/entities/behavior-calibration-profile.entity';
import { CandidateClaim } from '../documents/entities/candidate-claim.entity';
import { RiskHypothesis } from '../documents/entities/risk-hypothesis.entity';
import { QuestionProbe } from '../question-bank/entities/question-probe.entity';
import {
  QuestionProbeLevel,
  QuestionProbeRoleFamily,
  QuestionProbeStage,
} from '../question-bank/constants/question-bank-taxonomy.constants';
import type {
  InterviewDepth,
  PersonaPolicy,
  PersonaTone,
  PressureProfile,
  StageProbeAllocation,
} from './types/session-plan.types';

const OPENING_OVERHEAD_MINUTES = 2;
const RECENT_SESSION_LOOKBACK = 3;
const CLOSING_OVERHEAD_MINUTES = 3;
const MIN_PROBE_MINUTES = 4;
const MAX_PROBE_MINUTES = 12;

const STAGE_WEIGHTS: Record<
  QuestionProbeStage,
  Record<InterviewDepth, number>
> = {
  stage_1_culture_fit: { broad: 0.15, deep: 0.1 },
  stage_2_tech_stack: { broad: 0.25, deep: 0.3 },
  stage_3_domain_knowledge: { broad: 0.2, deep: 0.3 },
  stage_4_cv_deep_dive: { broad: 0.15, deep: 0.1 },
  stage_5_soft_skills: { broad: 0.15, deep: 0.1 },
  stage_6_reverse_interview: { broad: 0.1, deep: 0.1 },
};

const MUST_INCLUDE_STAGES: QuestionProbeStage[] = [
  'stage_1_culture_fit',
  'stage_2_tech_stack',
  'stage_3_domain_knowledge',
  'stage_5_soft_skills',
];

const PERSONA_PRESETS: Record<string, PersonaPolicy> = {
  junior: {
    name: 'Supportive Interviewer',
    tone: 'friendly',
    challengeStyle: 'supportive',
    verbosity: 'moderate',
    silenceBehavior: 'prompt_immediately',
    challengeThreshold: 'low',
  },
  mid: {
    name: 'Balanced Interviewer',
    tone: 'neutral',
    challengeStyle: 'direct',
    verbosity: 'moderate',
    silenceBehavior: 'wait_briefly',
    challengeThreshold: 'medium',
  },
  senior: {
    name: 'Skeptical Interviewer',
    tone: 'skeptical',
    challengeStyle: 'direct',
    verbosity: 'brief',
    silenceBehavior: 'rephrase_question',
    challengeThreshold: 'high',
  },
};

const PRESSURE_PRESETS: Record<string, PressureProfile> = {
  junior: {
    level: 'low',
    challengeOnGenericAnswer: true,
    challengeOnWeLanguage: false,
    challengeOnNoMetric: true,
    challengeOnNoConsequence: false,
    maxChallengesPerProbe: 1,
  },
  mid: {
    level: 'medium',
    challengeOnGenericAnswer: true,
    challengeOnWeLanguage: true,
    challengeOnNoMetric: true,
    challengeOnNoConsequence: false,
    maxChallengesPerProbe: 2,
  },
  senior: {
    level: 'high',
    challengeOnGenericAnswer: true,
    challengeOnWeLanguage: true,
    challengeOnNoMetric: true,
    challengeOnNoConsequence: true,
    maxChallengesPerProbe: 3,
  },
};

@Injectable()
export class SessionPlanningService {
  private readonly logger = new Logger(SessionPlanningService.name);

  constructor(
    @InjectRepository(SessionPlan)
    private readonly planRepository: Repository<SessionPlan>,
    @InjectRepository(BehaviorCalibrationProfile)
    private readonly profileRepository: Repository<BehaviorCalibrationProfile>,
    @InjectRepository(CandidateClaim)
    private readonly claimRepository: Repository<CandidateClaim>,
    @InjectRepository(RiskHypothesis)
    private readonly riskRepository: Repository<RiskHypothesis>,
    @InjectRepository(QuestionProbe)
    private readonly probeRepository: Repository<QuestionProbe>,
    private readonly probeSelectorService: ProbeSelectorService,
  ) {}

  /**
   * Tạo session plan từ calibration profile và DTO của user.
   *
   * @param dto - Thông tin cấu hình phiên phỏng vấn (depth, duration, language, persona...)
   * @param userId - ID của user thực hiện tạo plan
   * @returns SessionPlan đã lưu vào database
   * @throws NotFoundException nếu calibration profile không tồn tại
   * @throws BadRequestException nếu profile chưa ready hoặc thiếu CV
   */
  async createPlan({
    dto,
    userId,
  }: {
    dto: CreateSessionPlanDto;
    userId: string;
  }): Promise<SessionPlan> {
    const profile: BehaviorCalibrationProfile | null =
      await this.profileRepository.findOne({
        where: { id: dto.calibrationProfileId, userId },
      });
    if (!profile) throw new NotFoundException('Calibration profile not found');
    this._validateProfile(profile);

    const claims: CandidateClaim[] = await this.claimRepository.find({
      where: { calibrationProfileId: profile.id },
    });
    const risks: RiskHypothesis[] = await this.riskRepository.find({
      where: { calibrationProfileId: profile.id },
    });
    const probes: QuestionProbe[] = await this.probeRepository
      .createQueryBuilder('p')
      .where('p.status = :status', { status: 'active' })
      .andWhere(
        '(array_length(p.levels, 1) IS NULL OR :level = ANY(p.levels))',
        { level: profile.targetLevel },
      )
      .andWhere(
        '(array_length(p.roleFamilies, 1) IS NULL OR :roleFamily = ANY(p.roleFamilies))',
        { roleFamily: profile.roleFamily },
      )
      .andWhere('jsonb_exists(p.localizedContent, :lang)', {
        lang: dto.language,
      })
      .getMany();

    const jdTechStack: string[] = this._resolveJdTechStack(profile);
    const personaPolicy: PersonaPolicy = this._buildPersonaPolicy({
      targetLevel: profile.targetLevel,
      personaPreference: dto.personaPreference,
    });
    const pressureProfile: PressureProfile = this._buildPressureProfile({
      targetLevel: profile.targetLevel,
      depth: dto.depth,
    });
    const sessionId: string = dto.sessionId ?? uuidv4();

    const recentlyUsedProbeIds: string[] = await this._fetchRecentProbeIds({
      userId,
      roleFamily: profile.roleFamily,
      targetLevel: profile.targetLevel,
    });

    const rawAllocations: StageProbeAllocation[] =
      this.probeSelectorService.buildStageAllocations({
        probes,
        depth: dto.depth,
        targetLevel: profile.targetLevel,
        roleFamily: profile.roleFamily,
        language: dto.language,
        priorityCompetencies: profile.priorityCompetencies,
        competencyWeights: profile.competencyWeights,
        riskHypotheses: risks,
        candidateClaims: claims,
        cvTechStack: profile.cvTechStack,
        jdTechStack,
        selectionSeed: sessionId,
        recentlyUsedProbeIds,
      });

    const stageAllocations: StageProbeAllocation[] = this._allocateDuration({
      allocations: rawAllocations,
      durationMinutes: dto.durationMinutes,
      depth: dto.depth,
    });

    const plan: SessionPlan = this.planRepository.create({
      sessionId,
      userId,
      calibrationProfileId: profile.id,
      roleFamily: profile.roleFamily,
      targetRole: profile.targetRole,
      targetLevel: profile.targetLevel,
      language: dto.language,
      durationMinutes: dto.durationMinutes,
      depth: dto.depth,
      personaPolicy,
      pressureProfile,
      stageAllocations,
      planVersion: 'session-plan-v1',
    });

    const saved: SessionPlan = await this.planRepository.save(plan);
    this.logger.log(`SessionPlan created: ${saved.id} for user ${userId}`);
    return saved;
  }

  /**
   * Lấy session plan gần nhất của user.
   *
   * @param userId - ID của user cần tra cứu
   * @returns SessionPlan mới nhất, hoặc null nếu user chưa có plan nào
   */
  async getLatestPlan({
    userId,
  }: {
    userId: string;
  }): Promise<SessionPlan | null> {
    return this.planRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  private async _fetchRecentProbeIds({
    userId,
    roleFamily,
    targetLevel,
  }: {
    userId: string;
    roleFamily: QuestionProbeRoleFamily;
    targetLevel: QuestionProbeLevel;
  }): Promise<string[]> {
    const recentPlans = await this.planRepository.find({
      where: { userId, roleFamily, targetLevel },
      order: { createdAt: 'DESC' },
      take: RECENT_SESSION_LOOKBACK,
    });
    const ids = new Set<string>();
    for (const plan of recentPlans) {
      for (const alloc of plan.stageAllocations) {
        alloc.selectedProbes.forEach((p) => ids.add(p.questionProbeId));
        alloc.fallbackProbes.forEach((p) => ids.add(p.questionProbeId));
      }
    }
    return [...ids];
  }

  private _validateProfile(profile: BehaviorCalibrationProfile): void {
    if (profile.status !== 'ready' && profile.status !== 'partial') {
      throw new BadRequestException(
        `Calibration profile status "${profile.status as string}" is not accepted`,
      );
    }
    if (profile.status === 'partial' && !profile.sourceCompleteness.hasCv) {
      throw new BadRequestException(
        'Calibration profile is JD-only — CV required to generate a session plan',
      );
    }
  }

  private _resolveJdTechStack(profile: BehaviorCalibrationProfile): string[] {
    return profile.sourceCompleteness.hasJd ? profile.jdTechRequirements : [];
  }

  private _buildPersonaPolicy({
    targetLevel,
    personaPreference,
  }: {
    targetLevel: string;
    personaPreference?: PersonaTone;
  }): PersonaPolicy {
    const levelKey: string = ['junior', 'mid', 'senior'].includes(targetLevel)
      ? targetLevel
      : 'mid';
    const base: PersonaPolicy = { ...PERSONA_PRESETS[levelKey] };
    if (personaPreference) base.tone = personaPreference;
    return base;
  }

  private _buildPressureProfile({
    targetLevel,
    depth,
  }: {
    targetLevel: string;
    depth: InterviewDepth;
  }): PressureProfile {
    const levelKey: string = ['junior', 'mid', 'senior'].includes(targetLevel)
      ? targetLevel
      : 'mid';
    const base: PressureProfile = { ...PRESSURE_PRESETS[levelKey] };
    if (depth === 'deep') {
      base.maxChallengesPerProbe = Math.min(base.maxChallengesPerProbe + 1, 4);
    } else {
      base.maxChallengesPerProbe = Math.max(base.maxChallengesPerProbe - 1, 1);
    }
    return base;
  }

  private _allocateDuration({
    allocations,
    durationMinutes,
    depth,
  }: {
    allocations: StageProbeAllocation[];
    durationMinutes: number;
    depth: InterviewDepth;
  }): StageProbeAllocation[] {
    const usableMinutes: number =
      durationMinutes - OPENING_OVERHEAD_MINUTES - CLOSING_OVERHEAD_MINUTES;
    const baseWeights: Record<string, number> = this._computeEffectiveWeights({
      allocations,
      depth,
    });
    return allocations.map((alloc) => {
      if (alloc.selectedProbes.length === 0)
        return { ...alloc, allocatedMinutes: 0 };
      const weight: number = baseWeights[alloc.stage] ?? 0;
      const allocMinutes: number = Math.round(usableMinutes * weight);
      const rawPerProbe: number = allocMinutes / alloc.selectedProbes.length;
      const perProbe: number = Math.min(
        Math.max(rawPerProbe, MIN_PROBE_MINUTES),
        MAX_PROBE_MINUTES,
      );
      return {
        ...alloc,
        allocatedMinutes: allocMinutes,
        selectedProbes: alloc.selectedProbes.map((p) => ({
          ...p,
          estimatedMinutes: Math.round(perProbe),
        })),
      };
    });
  }

  private _computeEffectiveWeights({
    allocations,
    depth,
  }: {
    allocations: StageProbeAllocation[];
    depth: InterviewDepth;
  }): Record<string, number> {
    const skippedWeight: number = allocations
      .filter((a) => a.selectedProbes.length === 0)
      .reduce((sum, a) => sum + (STAGE_WEIGHTS[a.stage]?.[depth] ?? 0), 0);

    const mustIncludeTotal: number = MUST_INCLUDE_STAGES.reduce(
      (sum, s) => sum + (STAGE_WEIGHTS[s]?.[depth] ?? 0),
      0,
    );

    const result: Record<string, number> = {};
    for (const alloc of allocations) {
      if (alloc.selectedProbes.length === 0) {
        result[alloc.stage] = 0;
        continue;
      }
      const base: number = STAGE_WEIGHTS[alloc.stage]?.[depth] ?? 0;
      if (MUST_INCLUDE_STAGES.includes(alloc.stage) && mustIncludeTotal > 0) {
        result[alloc.stage] = base + skippedWeight * (base / mustIncludeTotal);
      } else {
        result[alloc.stage] = base;
      }
    }
    return result;
  }
}
