import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BehaviorCalibrationAiService } from './behavior-calibration.ai.service';
import { DocumentContextService } from './document-context.service';
import { BehaviorCalibrationProfile } from './entities/behavior-calibration-profile.entity';
import { CandidateClaim } from './entities/candidate-claim.entity';
import { RiskHypothesis } from './entities/risk-hypothesis.entity';
import { FitAssessmentService } from './fit-assessment.service';
import type { CvJson, JdJson } from './documents.ai.service';
import type { FitAssessmentV2 } from './types/fit-assessment.types';
import type {
  CalibrationPath,
  ClaimMiningOutput,
  SeededRisk,
  BehavioralRiskOutput,
  BehaviorCalibrationProfileData,
  BehaviorCalibrationSummary,
  RawCandidateClaim,
  HiringRiskType,
  RiskSeverity,
  LevelExpectation,
} from './types/behavior-calibration.types';
import {
  QUESTION_BANK_TAXONOMY,
  type QuestionProbeCompetency,
} from '../question-bank/constants/question-bank-taxonomy.constants';
import { UserProfile } from '../users/entities/user-profile.entity';

const VALID_COMPETENCIES = new Set<string>(
  QUESTION_BANK_TAXONOMY.competencies.map((c) => c.key),
);
const ALL_TECH_TAGS = new Set<string>(
  QUESTION_BANK_TAXONOMY.techTagGroups.flatMap((g) => g.tags),
);

const BEHAVIORAL_RISK_DEFAULT_SEVERITY: Record<string, RiskSeverity> = {
  overstated_ownership: 'medium',
  missing_business_impact: 'medium',
  weak_conflict_handling: 'low',
  generic_answering: 'low',
  poor_tradeoff_reasoning: 'medium',
  low_learning_agility: 'low',
  communication_gap: 'low',
};

const RISK_TAG_TO_TYPE: Record<string, HiringRiskType> = {
  vague_ownership: 'overstated_ownership',
  no_metric: 'missing_business_impact',
  no_scope: 'claim_without_evidence',
  no_conflict_depth: 'weak_conflict_handling',
  generic: 'generic_answering',
  no_impact: 'missing_business_impact',
};

// ─── Static level expectation lookup ─────────────────────────────────────────
type LevelKey = 'junior' | 'mid' | 'senior';

interface LevelExpectationEntry {
  mustHaveSignals: string[];
  dealBreakers: string[];
  depthRequirement: string;
}

const LEVEL_EXPECTATION_MAP: Record<LevelKey, LevelExpectationEntry> = {
  junior: {
    mustHaveSignals: [
      'Delivers assigned tasks with clear scope',
      'Explains their approach when asked',
      'Asks for help proactively before getting blocked',
      'Receptive to code review feedback',
      'Shows curiosity and willingness to learn',
    ],
    dealBreakers: [
      'Cannot explain basic technical concepts in their stack',
      'Resists or dismisses feedback',
      'Struggles to complete a well-defined task independently',
    ],
    depthRequirement:
      'Demonstrates foundational skills and learning agility. Depth expected on their primary tech stack at task level.',
  },
  mid: {
    mustHaveSignals: [
      'Owns features end-to-end without close supervision',
      'Identifies edge cases and raises them proactively',
      'Collaborates cross-functionally without hand-holding',
      'Can break down ambiguous requirements into deliverable tasks',
      'Makes local technical decisions with clear rationale',
    ],
    dealBreakers: [
      'Needs constant direction on well-understood problems',
      'Cannot prioritize or scope their own work',
      'Avoids taking ownership when things go wrong',
    ],
    depthRequirement:
      'Expected to own features independently, handle moderate ambiguity, and show initiative in improving the codebase.',
  },
  senior: {
    mustHaveSignals: [
      'Drives technical decisions and defends them with tradeoffs',
      'Influences stakeholders and aligns cross-functional teams',
      'Mentors or unblocks junior and mid-level engineers',
      'Delivers measurable business or system-level impact',
      'Handles high-ambiguity problems with structured approach',
      'Proactively identifies systemic risks or opportunities',
    ],
    dealBreakers: [
      'Cannot make decisions independently under ambiguity',
      'No evidence of leading or influencing others beyond their immediate team',
      'Works in isolation, does not share knowledge',
      'Impact limited to individual tasks, not system or team level',
    ],
    depthRequirement:
      'Expected to operate at system and team scope. Impact should be demonstrable beyond individual features. Leadership and mentoring are required signals.',
  },
};

@Injectable()
export class BehaviorCalibrationService {
  private readonly logger = new Logger(BehaviorCalibrationService.name);

  constructor(
    @InjectRepository(BehaviorCalibrationProfile)
    private readonly profileRepo: Repository<BehaviorCalibrationProfile>,
    @InjectRepository(CandidateClaim)
    private readonly claimRepo: Repository<CandidateClaim>,
    @InjectRepository(RiskHypothesis)
    private readonly riskRepo: Repository<RiskHypothesis>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepo: Repository<UserProfile>,
    private readonly aiService: BehaviorCalibrationAiService,
    private readonly contextService: DocumentContextService,
    private readonly fitAssessmentService: FitAssessmentService,
  ) {}

  // ─── BC-1: Collect inputs ──────────────────────────────────────────────────

  async run({
    userId,
    cvId,
    jdAnalysisId,
    cvJson,
    jdJson,
    fitAssessment,
  }: {
    userId: string;
    cvId?: string | null;
    jdAnalysisId?: string | null;
    cvJson?: CvJson | null;
    jdJson?: JdJson | null;
    fitAssessment?: FitAssessmentV2 | null;
  }): Promise<void> {
    const hasCv = !!cvJson;
    const hasJd = !!jdJson;

    if (!hasCv && !hasJd) {
      this.logger.log(`BC skip userId=${userId}: no CV or JD`);
      return;
    }

    const profile: UserProfile | null = await this.userProfileRepo.findOne({
      where: { user: { id: userId } },
    });
    const hasProfile = !!profile;
    const hasWeaknessHistory = !!(
      profile as { weaknessHistory?: unknown } | null
    )?.weaknessHistory;

    const sourceCompleteness = { hasCv, hasJd, hasProfile, hasWeaknessHistory };

    // BC-2: determine path
    const path = this._determinePath({ hasCv, hasJd });

    try {
      await this._runPipeline({
        userId,
        cvId: cvId ?? null,
        jdAnalysisId: jdAnalysisId ?? null,
        cvJson: cvJson ?? null,
        jdJson: jdJson ?? null,
        fitAssessment: fitAssessment ?? null,
        profile,
        sourceCompleteness,
        path,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`BC failed userId=${userId} path=${path}: ${msg}`);
    }
  }

  async getLatestForUser(
    userId: string,
  ): Promise<BehaviorCalibrationProfile | null> {
    return this.profileRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  buildSummary(
    profile: BehaviorCalibrationProfile | null,
    missingSources: string[],
  ): BehaviorCalibrationSummary | null {
    if (!profile) return null;
    return {
      status: profile.status,
      levelMismatch: profile.levelMismatch,
      priorityCompetencies: profile.priorityCompetencies,
      evidenceStrictness: profile.evidenceStrictness,
      userFacingSummary: profile.userFacingSummary ?? {
        focusAreas: [],
        evidenceToPrep: [],
      },
      missingSources,
    };
  }

  // ─── Private pipeline ──────────────────────────────────────────────────────

  private async _runPipeline(params: {
    userId: string;
    cvId: string | null;
    jdAnalysisId: string | null;
    cvJson: CvJson | null;
    jdJson: JdJson | null;
    fitAssessment: FitAssessmentV2 | null;
    profile: UserProfile | null;
    sourceCompleteness: {
      hasCv: boolean;
      hasJd: boolean;
      hasProfile: boolean;
      hasWeaknessHistory: boolean;
    };
    path: CalibrationPath;
  }): Promise<void> {
    const {
      userId,
      cvId,
      jdAnalysisId,
      cvJson,
      jdJson,
      fitAssessment,
      profile,
      sourceCompleteness,
      path,
    } = params;

    let claimOutput: ClaimMiningOutput = {
      miningConfidence: 'low',
      claims: [],
      unmappedSignals: [],
    };
    let seededRisks: SeededRisk[] = [];
    let behavioralOutput: BehavioralRiskOutput = {
      hypotheses: [],
      priorityCompetencies: [],
      calibrationNotes: [],
      userFacingSummary: { focusAreas: [], evidenceToPrep: [] },
    };

    if (path === 'jd_only') {
      await this._persistProfile(userId, cvId, jdAnalysisId, {
        path,
        claimOutput,
        seededRisks,
        behavioralOutput,
        cvJson,
        jdJson,
        fitAssessment,
        profile,
        sourceCompleteness,
      });
      return;
    }

    // BC-3 + BC-4a run in parallel
    const fitHints = fitAssessment
      ? this.aiService.buildFitEvidenceHints(fitAssessment)
      : [];
    const [miningResult, seeded] = await Promise.allSettled([
      this.aiService.extractCandidateClaims({
        cvJson: cvJson!,
        jdJson: jdJson ?? undefined,
        fitEvidenceHints: fitHints,
      }),
      Promise.resolve(
        fitAssessment ? this._seedRisksFromFitAssessment(fitAssessment) : [],
      ),
    ]);

    if (miningResult.status === 'fulfilled') {
      claimOutput = miningResult.value;
    } else {
      this.logger.warn(`BC-3 failed: ${String(miningResult.reason)}`);
    }
    if (seeded.status === 'fulfilled') {
      seededRisks = seeded.value;
    }

    // Seed additional risks from claim-level riskTags to prevent BC-4b from duplicating them
    const claimTagTypes = new Set(
      claimOutput.claims
        .flatMap((c) => c.riskTags)
        .map((tag) => RISK_TAG_TO_TYPE[tag])
        .filter((t): t is HiringRiskType => !!t),
    );
    const claimTagSeeds: SeededRisk[] = [...claimTagTypes].map((riskType) => ({
      riskType,
      severity: 'low' as const,
      sourceRef: {
        fitAssessmentField: 'claim_tags' as const,
        originalCategory: riskType,
      },
      rationale: 'Detected from claim-level risk tags during CV mining',
    }));
    seededRisks = [...seededRisks, ...claimTagSeeds];

    if (claimOutput.claims.length === 0 && cvJson) {
      this.logger.warn(
        `BC-3 returned no claims for userId=${userId}, skipping persist`,
      );
      return;
    }

    // BC-4b: behavioral risks (only for full path)
    if (path === 'full') {
      try {
        behavioralOutput = await this.aiService.generateBehavioralRisks({
          claims: claimOutput.claims,
          seededRisks,
          jdJson: jdJson ?? undefined,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`BC-4b failed: ${msg}`);
        behavioralOutput.calibrationNotes = [
          'behavioral_risk_generation_failed',
        ];
      }
    }

    await this._persistProfile(userId, cvId, jdAnalysisId, {
      path,
      claimOutput,
      seededRisks,
      behavioralOutput,
      cvJson,
      jdJson,
      fitAssessment,
      profile,
      sourceCompleteness,
    });
  }

  // ─── BC-4a: seed risks from FA deterministic ───────────────────────────────

  private _seedRisksFromFitAssessment(fa: FitAssessmentV2): SeededRisk[] {
    const FIT_GAP_TO_RISK: Record<string, SeededRisk['riskType']> = {
      level_mismatch: 'level_mismatch',
      weak_evidence: 'claim_without_evidence',
    };
    const FIT_FLAG_TO_RISK: Record<string, SeededRisk['riskType']> = {
      seniority_mismatch: 'level_mismatch',
      missing_core_stack: 'weak_technical_depth',
      ambiguous_timeline: 'unclear_scope',
    };

    const seeded: SeededRisk[] = [];
    const seenTypes = new Set<string>();

    for (const gap of fa.gaps ?? []) {
      const riskType = FIT_GAP_TO_RISK[gap.category];
      if (!riskType) continue;
      const key = riskType;
      const existing = seeded.find((s) => s.riskType === riskType);
      if (existing) {
        if (
          this._severityRank(gap.severity) >
          this._severityRank(existing.severity)
        ) {
          existing.severity = gap.severity;
        }
        continue;
      }
      if (seenTypes.has(key)) continue;
      seenTypes.add(key);
      seeded.push({
        riskType,
        severity: gap.severity,
        sourceRef: {
          fitAssessmentField: 'gaps',
          originalCategory: gap.category,
        },
        rationale: gap.explanation,
        relatedRequirement: gap.relatedRequirement ?? undefined,
      });
    }

    for (const flag of fa.riskFlags ?? []) {
      const riskType = FIT_FLAG_TO_RISK[flag.code];
      if (!riskType) continue;
      const existing = seeded.find((s) => s.riskType === riskType);
      if (existing) {
        if (
          this._severityRank(flag.severity) >
          this._severityRank(existing.severity)
        ) {
          existing.severity = flag.severity;
        }
        continue;
      }
      seeded.push({
        riskType,
        severity: flag.severity,
        sourceRef: {
          fitAssessmentField: 'riskFlags',
          originalCategory: flag.code,
        },
        rationale: flag.explanation,
      });
    }

    return seeded;
  }

  // ─── BC-5: build + persist calibration profile ────────────────────────────

  private async _persistProfile(
    userId: string,
    cvId: string | null,
    jdAnalysisId: string | null,
    ctx: {
      path: CalibrationPath;
      claimOutput: ClaimMiningOutput;
      seededRisks: SeededRisk[];
      behavioralOutput: BehavioralRiskOutput;
      cvJson: CvJson | null;
      jdJson: JdJson | null;
      fitAssessment: FitAssessmentV2 | null;
      profile: UserProfile | null;
      sourceCompleteness: {
        hasCv: boolean;
        hasJd: boolean;
        hasProfile: boolean;
        hasWeaknessHistory: boolean;
      };
    },
  ): Promise<void> {
    const data = this._buildProfileData(userId, ctx);

    const profileEntity = this.profileRepo.create({
      userId,
      cvId,
      jdAnalysisId,
      status: data.status,
      sourceCompleteness: data.sourceCompleteness,
      roleFamily: data.roleFamily,
      targetRole: data.targetRole,
      targetLevel: data.targetLevel,
      profileLevel: data.profileLevel,
      levelMismatch: data.levelMismatch,
      levelExpectations: data.levelExpectations,
      priorityCompetencies: data.priorityCompetencies,
      competencyWeights: data.competencyWeights as Record<string, number>,
      previousWeakCompetencies: data.previousWeakCompetencies,
      evidenceStrictness: data.evidenceStrictness,
      calibrationNotes: data.calibrationNotes,
      cvTechStack: data.cvTechStack,
      jdTechRequirements: data.jdTechRequirements,
      userFacingSummary: data.userFacingSummary,
      internalVersion: data.internalVersion,
    });

    const saved = await this.profileRepo.save(profileEntity);
    this.logger.log(
      `BC-5: persisted calibration profile ${saved.id} userId=${userId} status=${data.status}`,
    );

    const claims = this._buildClaimEntities(
      userId,
      saved.id,
      cvId,
      jdAnalysisId,
      ctx.claimOutput.claims,
      ctx.jdJson,
    );
    if (claims.length > 0) {
      await this.claimRepo.save(claims);
    }

    const risks = this._buildRiskEntities(
      userId,
      saved.id,
      ctx.seededRisks,
      ctx.behavioralOutput,
      data.levelMismatch,
    );
    if (risks.length > 0) {
      await this.riskRepo.save(risks);
    }
  }

  private _buildProfileData(
    userId: string,
    ctx: {
      path: CalibrationPath;
      claimOutput: ClaimMiningOutput;
      seededRisks: SeededRisk[];
      behavioralOutput: BehavioralRiskOutput;
      cvJson: CvJson | null;
      jdJson: JdJson | null;
      fitAssessment: FitAssessmentV2 | null;
      profile: UserProfile | null;
      sourceCompleteness: {
        hasCv: boolean;
        hasJd: boolean;
        hasProfile: boolean;
        hasWeaknessHistory: boolean;
      };
    },
  ): BehaviorCalibrationProfileData {
    const {
      path,
      claimOutput,
      seededRisks,
      behavioralOutput,
      cvJson,
      jdJson,
      profile,
      sourceCompleteness,
    } = ctx;

    const levelMismatch = this._computeLevelMismatch(cvJson, jdJson);
    const targetRole = jdJson?.role ?? cvJson?.currentTitle ?? '';
    const targetLevel = jdJson?.seniority ?? 'unknown';
    const profileLevel = cvJson?.seniority ?? profile?.seniority ?? 'unknown';
    const roleFamily = this._inferRoleFamily(
      targetRole,
      jdJson?.required_skills ?? [],
    );

    const highSeverityCount = [
      ...seededRisks.filter((r) => r.severity === 'high'),
      ...behavioralOutput.hypotheses.filter(
        (h) =>
          (BEHAVIORAL_RISK_DEFAULT_SEVERITY[h.riskType] ?? 'low') === 'high',
      ),
    ].length;

    const status = path === 'full' ? 'ready' : 'partial';
    const evidenceStrictness =
      highSeverityCount === 0
        ? 'standard'
        : highSeverityCount <= 2
          ? 'strict'
          : 'very_strict';

    const priorityCompetencies = this._computePriorityCompetencies(
      claimOutput.claims,
      behavioralOutput.priorityCompetencies,
      jdJson,
    );
    const competencyWeights = this._computeCompetencyWeights(
      priorityCompetencies,
      seededRisks,
      behavioralOutput,
    );
    const previousWeakCompetencies = this._getPreviousWeakCompetencies(profile);
    const calibrationNotes = [...(behavioralOutput.calibrationNotes ?? [])];

    const cvTechStack = this._canonicalizeTechStack(cvJson?.skills ?? []);
    const jdTechRequirements = this._canonicalizeTechStack(
      jdJson?.required_skills ?? [],
    );

    const missingDataWarning = !sourceCompleteness.hasJd
      ? 'JD not provided. Calibration is based on CV only.'
      : !sourceCompleteness.hasCv
        ? 'CV not provided. Calibration is based on JD expectations only.'
        : undefined;
    const levelMismatchWarning = levelMismatch
      ? 'Your experience level may not match the JD requirements. Prepare to address this in the interview.'
      : undefined;

    const summary = behavioralOutput.userFacingSummary;

    return {
      status,
      sourceCompleteness,
      roleFamily,
      targetRole,
      targetLevel: String(targetLevel),
      profileLevel: String(profileLevel),
      levelMismatch,
      levelExpectations: this._buildLevelExpectations(targetLevel),
      priorityCompetencies,
      competencyWeights,
      previousWeakCompetencies,
      evidenceStrictness,
      calibrationNotes,
      cvTechStack,
      jdTechRequirements,
      userFacingSummary: {
        focusAreas: summary.focusAreas,
        evidenceToPrep: summary.evidenceToPrep,
        missingDataWarning: missingDataWarning ?? summary.missingDataWarning,
        levelMismatchWarning,
      },
      internalVersion: 'behavior-calibration-v1',
    };
  }

  private _buildClaimEntities(
    userId: string,
    profileId: string,
    cvId: string | null,
    jdAnalysisId: string | null,
    claims: RawCandidateClaim[],
    jdJson: JdJson | null,
  ): Partial<CandidateClaim>[] {
    const jdPriorityCompetencies = new Set<string>(
      (jdJson?.requiredCompetencies ?? []).filter((c: string) =>
        VALID_COMPETENCIES.has(c),
      ),
    );

    return claims.map((c) => {
      const validImplied = c.impliedCompetencies.filter((comp) =>
        VALID_COMPETENCIES.has(comp),
      ) as QuestionProbeCompetency[];
      const hasJdOverlap = validImplied.some((comp) =>
        jdPriorityCompetencies.has(comp),
      );
      const hasRiskTags = c.riskTags.length > 0;
      const verificationPriority =
        hasJdOverlap && hasRiskTags ? 'high' : hasJdOverlap ? 'medium' : 'low';

      return {
        userId,
        calibrationProfileId: profileId,
        cvId,
        jdAnalysisId,
        sourceType: c.sourceType,
        sourceRef: c.sourceRef,
        claimType: c.claimType,
        claimText: c.claimText,
        normalizedClaim: c.normalizedClaim,
        impliedCompetencies: validImplied,
        verificationPriority,
        techContext: c.techContext.filter((t) => ALL_TECH_TAGS.has(t)),
        evidenceHints: c.evidenceHints,
        riskTags: c.riskTags,
      };
    });
  }

  private _buildRiskEntities(
    userId: string,
    profileId: string,
    seededRisks: SeededRisk[],
    behavioralOutput: BehavioralRiskOutput,
    levelMismatch: boolean,
  ): Partial<RiskHypothesis>[] {
    const seededTypes = new Set(seededRisks.map((r) => r.riskType));
    const entities: Partial<RiskHypothesis>[] = [];

    for (const seeded of seededRisks) {
      entities.push({
        userId,
        calibrationProfileId: profileId,
        riskType: seeded.riskType,
        severity: seeded.severity,
        rationale: seeded.rationale,
        relatedCompetencies: [],
        suggestedProbeFocus: [],
        sourceRefs: seeded.sourceRef,
        source: 'system_inference',
        evidenceNeededToReject: [],
        probeSelectionHints: null,
      });
    }

    for (const h of behavioralOutput.hypotheses) {
      if (seededTypes.has(h.riskType as SeededRisk['riskType'])) continue;
      const severity: RiskSeverity =
        BEHAVIORAL_RISK_DEFAULT_SEVERITY[h.riskType] ?? 'low';
      const validCompetencies = (h.relatedCompetencies ?? []).filter((c) =>
        VALID_COMPETENCIES.has(c),
      ) as QuestionProbeCompetency[];
      entities.push({
        userId,
        calibrationProfileId: profileId,
        riskType: h.riskType,
        severity,
        rationale: h.rationale,
        relatedCompetencies: validCompetencies,
        suggestedProbeFocus: h.suggestedProbeFocus ?? [],
        source: 'cv',
        evidenceNeededToReject: h.suggestedProbeFocus ?? [],
        probeSelectionHints: { preferredCompetencies: validCompetencies },
        sourceRefs: h.candidateClaimRef
          ? { claimRef: h.candidateClaimRef }
          : null,
      });
    }

    if (levelMismatch && !seededTypes.has('level_mismatch')) {
      entities.push({
        userId,
        calibrationProfileId: profileId,
        riskType: 'level_mismatch',
        severity: 'medium',
        rationale:
          'Experience level or seniority does not match JD requirements.',
        relatedCompetencies: [],
        suggestedProbeFocus: [
          'Describe a project where you operated at the required level of ownership.',
        ],
        source: 'system_inference',
        evidenceNeededToReject: [
          'Candidate demonstrates scope and ownership consistent with JD level',
        ],
        probeSelectionHints: null,
        sourceRefs: null,
      });
    }

    return entities;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private _determinePath({
    hasCv,
    hasJd,
  }: {
    hasCv: boolean;
    hasJd: boolean;
  }): CalibrationPath {
    if (hasCv && hasJd) return 'full';
    if (hasCv) return 'cv_only';
    return 'jd_only';
  }

  private _computeLevelMismatch(
    cvJson: CvJson | null,
    jdJson: JdJson | null,
  ): boolean {
    if (!cvJson || !jdJson) return false;
    const cvYears = cvJson.totalYearsExperience ?? 0;
    const jdYears = jdJson.minimum_experience_years ?? 0;
    if (jdYears > 0 && cvYears < jdYears) return true;
    const cvSeniority = cvJson.seniority;
    const jdSeniority = jdJson.seniority;
    if (
      cvSeniority &&
      jdSeniority &&
      cvSeniority !== 'unknown' &&
      jdSeniority !== 'unknown'
    ) {
      const rank: Record<string, number> = {
        intern: 0,
        junior: 1,
        mid: 2,
        senior: 3,
        lead: 4,
        staff: 5,
        manager: 5,
      };
      return (rank[jdSeniority] ?? 0) > (rank[cvSeniority] ?? 0);
    }
    return false;
  }

  private _inferRoleFamily(role: string, skills: string[]): string {
    const r = role.toLowerCase();
    if (/frontend|front.end|ui/.test(r)) return 'frontend';
    if (/backend|back.end|server/.test(r)) return 'backend';
    if (/fullstack|full.stack/.test(r)) return 'fullstack';
    if (/devops|sre|infra|platform/.test(r)) return 'devops';
    if (/data|ml|ai|analytics/.test(r)) return 'data';
    if (/qa|test|quality/.test(r)) return 'qa';
    if (/security|sec/.test(r)) return 'security';
    const feSkills = new Set([
      'react',
      'vue',
      'angular',
      'typescript',
      'javascript',
      'nextjs',
    ]);
    const beSkills = new Set([
      'nodejs',
      'nestjs',
      'go',
      'java',
      'python',
      'django',
      'spring_boot',
    ]);
    const hasFe = skills.some((s) => feSkills.has(s.toLowerCase()));
    const hasBe = skills.some((s) => beSkills.has(s.toLowerCase()));
    if (hasFe && hasBe) return 'fullstack';
    if (hasFe) return 'frontend';
    if (hasBe) return 'backend';
    return 'backend';
  }

  private _computePriorityCompetencies(
    claims: RawCandidateClaim[],
    aiPriority: string[],
    jdJson: JdJson | null,
  ): QuestionProbeCompetency[] {
    const jdSignals = new Set<string>(
      (jdJson?.requiredCompetencies ?? []).filter((c: string) =>
        VALID_COMPETENCIES.has(c),
      ),
    );
    const claimSignals = claims.flatMap((c) => c.impliedCompetencies);
    const allValidSignals = [...claimSignals, ...aiPriority].filter((c) =>
      VALID_COMPETENCIES.has(c),
    );

    // Prefer intersection with LLM-extracted JD competencies; fall back to all claim signals
    const candidates =
      jdSignals.size > 0
        ? allValidSignals.filter((c) => jdSignals.has(c))
        : allValidSignals;

    const source = candidates.length > 0 ? candidates : allValidSignals;

    const counted = new Map<string, number>();
    for (const c of source) counted.set(c, (counted.get(c) ?? 0) + 1);
    // Merge in JD signals not yet in source to ensure JD-required competencies appear
    for (const c of jdSignals) {
      if (!counted.has(c)) counted.set(c, 1);
    }
    return [...counted.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([c]) => c as QuestionProbeCompetency);
  }

  private _buildLevelExpectations(targetLevel: string): LevelExpectation[] {
    const levelKey = this._normalizeLevelKey(targetLevel);
    const entry = LEVEL_EXPECTATION_MAP[levelKey];
    if (!entry) return [];
    return [
      {
        level: levelKey,
        mustHaveSignals: entry.mustHaveSignals,
        dealBreakers: entry.dealBreakers,
        depthRequirement: entry.depthRequirement,
      },
    ];
  }

  private _normalizeLevelKey(level: string): LevelKey {
    if (level === 'junior' || level === 'intern') return 'junior';
    if (
      level === 'senior' ||
      level === 'lead' ||
      level === 'staff' ||
      level === 'manager'
    ) {
      return 'senior';
    }
    return 'mid';
  }

  private _computeCompetencyWeights(
    competencies: QuestionProbeCompetency[],
    seededRisks: SeededRisk[],
    behavioralOutput: BehavioralRiskOutput,
  ): Partial<Record<QuestionProbeCompetency, number>> {
    const weights: Partial<Record<QuestionProbeCompetency, number>> = {};
    for (const comp of competencies) {
      let weight = 1;
      const inSeeded = seededRisks.some(
        (r) => r.riskType === 'level_mismatch' && comp === 'ownership',
      );
      const inBehavioral = behavioralOutput.hypotheses.some((h) =>
        h.relatedCompetencies?.includes(comp),
      );
      if (inSeeded) weight += 1;
      if (inBehavioral) weight += 1;
      weights[comp] = weight;
    }
    return weights;
  }

  private _getPreviousWeakCompetencies(
    profile: UserProfile | null,
  ): QuestionProbeCompetency[] {
    const raw =
      (profile as { weaknessHistory?: string[] } | null)?.weaknessHistory ?? [];
    return raw.filter((c) =>
      VALID_COMPETENCIES.has(c),
    ) as QuestionProbeCompetency[];
  }

  private _canonicalizeTechStack(skills: string[]): string[] {
    return (
      skills
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        .map((s) => this.fitAssessmentService.canonicalizeSkill(s))
        .filter((s) => ALL_TECH_TAGS.has(s))
    );
  }

  private _severityRank(s: RiskSeverity): number {
    return s === 'high' ? 2 : s === 'medium' ? 1 : 0;
  }
}
