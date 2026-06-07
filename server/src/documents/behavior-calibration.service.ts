import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BehaviorCalibrationAiService } from './behavior-calibration.ai.service';
import { BehaviorCalibrationProfile } from './entities/behavior-calibration-profile.entity';
import { CandidateClaim } from './entities/candidate-claim.entity';
import { RiskHypothesis } from './entities/risk-hypothesis.entity';
import { FitAssessmentService } from './fit-assessment.service';
import type { FitAssessmentV2 } from './types/fit-assessment.types';
import type {
  CalibrationPath,
  CalibrationStatus,
  StructuredClaim,
  RawCandidateClaim,
  SeededRisk,
  RiskEnrichmentOutput,
  BehaviorCalibrationProfileData,
  BehaviorCalibrationSummary,
  HiringRiskType,
  RiskSeverity,
  LevelExpectation,
} from './types/behavior-calibration.types';
import type { QuestionProbeCompetency } from '../question-bank/constants/question-bank-taxonomy.constants';
import { UserProfile } from '../users/entities/user-profile.entity';
import {
  ALL_TECH_TAGS,
  BEHAVIORAL_RISK_DEFAULT_SEVERITY,
  LEVEL_EXPECTATION_MAP,
  RISK_TYPE_TO_COMPETENCIES,
  VALID_COMPETENCIES,
  CLAIM_COUNT_READY_THRESHOLD,
  COVERAGE_SCORE_READY_THRESHOLD,
  MIN_PRIORITY_COMPETENCIES,
} from './constants/behavior-calibration.constants';
import type { LevelKey } from './types/behavior-calibration-internal.types';
import type { CvJson, JdJson } from './types/document-ai.types';

type RiskEntityDraft = Partial<RiskHypothesis> & { _claimLocalId?: string };

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
    private readonly fitAssessmentService: FitAssessmentService,
    private readonly dataSource: DataSource,
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

    let profile: UserProfile | null = null;
    try {
      profile = await this.userProfileRepo.findOne({
        where: { user: { id: userId } },
      });
    } catch (error) {
      this.logger.warn(
        `BC: failed to fetch user profile userId=${userId}: ${String(error)}`,
      );
    }
    const hasProfile = !!profile;
    const hasWeaknessHistory = !!(
      profile as { weaknessHistory?: unknown } | null
    )?.weaknessHistory;

    const sourceCompleteness = { hasCv, hasJd, hasProfile, hasWeaknessHistory };
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

    // Step 1: Deterministic claim extraction from CvJson structure
    const structuredClaims: StructuredClaim[] = cvJson
      ? this._extractStructuredClaims(cvJson)
      : [];

    // Step 2: LLM claim enrichment (claimType, impliedCompetencies, riskTags)
    // Initialise merged claims with fallback values — enrichment updates them
    let mergedClaims: RawCandidateClaim[] = structuredClaims.map((c) => ({
      sourceType: c.sourceType,
      sourceRef: { localId: c.localId, section: c.sourceRef.section },
      claimType: c.claimType,
      claimText: c.claimText,
      impliedCompetencies: [],
      techContext: c.techContext,
      riskTags: [],
      suggestedQuestions: [],
    }));

    if (structuredClaims.length > 0) {
      try {
        const enrichmentOutput = await this.aiService.enrichCandidateClaims(
          structuredClaims,
          jdJson ?? undefined,
        );
        const enrichmentMap = new Map(
          enrichmentOutput.enrichments.map((e) => [e.localId, e]),
        );
        mergedClaims = mergedClaims.map((c) => {
          const enrichment = enrichmentMap.get(c.sourceRef.localId);
          if (!enrichment) return c;
          return {
            ...c,
            claimType: enrichment.claimType,
            impliedCompetencies: enrichment.impliedCompetencies as string[],
            riskTags: enrichment.riskTags,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            suggestedQuestions: enrichment.suggestedQuestions,
          };
        });
      } catch (error) {
        this.logger.warn(`BC-2: Claim enrichment failed: ${String(error)}`);
      }
    }

    // Step 3a: Seed risks from FitAssessment (deterministic)
    const faSeededRisks: SeededRisk[] = fitAssessment
      ? this._seedRisksFromFitAssessment(fitAssessment)
      : [];

    // Step 3b: Coverage gap detection (deterministic, full path only)
    const coverageGapRisks: SeededRisk[] =
      path === 'full' ? this._detectCoverageGapRisks(mergedClaims, jdJson) : [];

    const seededRisks: SeededRisk[] = [...faSeededRisks, ...coverageGapRisks];

    // Step 4: LLM risk enrichment + additional behavioral risks (full path only)
    let riskEnrichmentOutput: RiskEnrichmentOutput = {
      seededRiskEnrichments: [],
      additionalRisks: [],
      userFacingSummary: { focusAreas: [], evidenceToPrep: [] },
    };

    if (path === 'full') {
      try {
        const step4Claims = mergedClaims.map((c) => ({
          localId: c.sourceRef.localId,
          claimText: c.claimText,
          impliedCompetencies: c.impliedCompetencies,
        }));
        riskEnrichmentOutput = await this.aiService.enrichAndExtendRisks(
          seededRisks,
          step4Claims,
          jdJson ?? undefined,
        );
      } catch (error) {
        this.logger.warn(`BC-4: Risk enrichment failed: ${String(error)}`);
      }
    }

    // Step 5: Build + persist (always persists, even with empty claims)
    await this._persistProfile(userId, cvId, jdAnalysisId, {
      path,
      mergedClaims,
      seededRisks,
      riskEnrichmentOutput,
      cvJson,
      jdJson,
      fitAssessment,
      profile,
      sourceCompleteness,
    });
  }

  // ─── Step 1: Deterministic claim extraction ────────────────────────────────

  private _extractStructuredClaims(cvJson: CvJson): StructuredClaim[] {
    const claims: StructuredClaim[] = [];
    let idx = 0;

    for (let i = 0; i < (cvJson.experience ?? []).length && idx < 20; i++) {
      const exp = cvJson.experience[i];
      const datePart = [exp.startDate, exp.endDate].filter(Boolean).join('–');
      const parts: string[] = [
        `${exp.title} at ${exp.company}${datePart ? ` (${datePart})` : ''}`,
      ];
      const top3 = (exp.responsibilities ?? []).slice(0, 3);
      if (top3.length) parts.push(`Responsibilities: ${top3.join('; ')}`);
      const achs = exp.achievements ?? [];
      if (achs.length) parts.push(`Achievements: ${achs.join('; ')}`);

      claims.push({
        localId: `claim_${idx++}`,
        sourceType: 'cv',
        sourceRef: { section: `experience[${i}]` },
        claimType: 'unknown',
        claimText: parts.join('. '),
        techContext: this._canonicalizeTechStack(exp.techStack ?? []),
      });

      for (let j = 0; j < achs.length && idx < 20; j++) {
        claims.push({
          localId: `claim_${idx++}`,
          sourceType: 'cv',
          sourceRef: { section: `experience[${i}].achievements[${j}]` },
          claimType: 'improved_metric',
          claimText: achs[j],
          techContext: this._canonicalizeTechStack(exp.techStack ?? []),
        });
      }
    }

    return claims;
  }

  // ─── Step 3a: Seed risks from FA ──────────────────────────────────────────

  private _seedRisksFromFitAssessment(fa: FitAssessmentV2): SeededRisk[] {
    const FIT_GAP_TO_RISK: Record<string, HiringRiskType> = {
      level_mismatch: 'level_mismatch',
      weak_evidence: 'claim_without_evidence',
    };
    const FIT_FLAG_TO_RISK: Record<string, HiringRiskType> = {
      seniority_mismatch: 'level_mismatch',
      missing_core_stack: 'weak_technical_depth',
      ambiguous_timeline: 'unclear_scope',
    };

    const seeded: SeededRisk[] = [];
    let seq = 0;

    for (const gap of fa.gaps ?? []) {
      const riskType = FIT_GAP_TO_RISK[gap.category];
      if (!riskType) continue;
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
      seeded.push({
        localRiskId: `fa_gap_${seq++}`,
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
        localRiskId: `fa_flag_${seq++}`,
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

  // ─── Step 3b: Coverage gap detection ──────────────────────────────────────

  private _detectCoverageGapRisks(
    mergedClaims: RawCandidateClaim[],
    jdJson: JdJson | null,
  ): SeededRisk[] {
    const requiredComps = (jdJson?.requiredCompetencies ?? []).filter((c) =>
      VALID_COMPETENCIES.has(c),
    );
    if (requiredComps.length === 0) return [];

    const covered = new Set<string>(
      mergedClaims
        .flatMap((c) => c.impliedCompetencies)
        .filter((c) => VALID_COMPETENCIES.has(c)),
    );

    return requiredComps
      .filter((comp) => !covered.has(comp))
      .map((comp) => ({
        localRiskId: `cov_gap_${comp}`,
        riskType: 'claim_without_evidence' as HiringRiskType,
        severity: 'medium' as const,
        sourceRef: {
          fitAssessmentField: 'coverage_gap' as const,
          originalCategory: comp,
        },
        rationale: `JD requires competency '${comp}' but CV provides no evidence of it.`,
      }));
  }

  // ─── Step 5: Build + persist (always persists) ────────────────────────────

  private async _persistProfile(
    userId: string,
    cvId: string | null,
    jdAnalysisId: string | null,
    ctx: {
      path: CalibrationPath;
      mergedClaims: RawCandidateClaim[];
      seededRisks: SeededRisk[];
      riskEnrichmentOutput: RiskEnrichmentOutput;
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

    const profileEntity = Object.assign(new BehaviorCalibrationProfile(), {
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

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const savedProfile = await qr.manager.save(
        BehaviorCalibrationProfile,
        profileEntity,
      );

      const claimEntities = this._buildClaimEntities(
        userId,
        savedProfile.id,
        cvId,
        jdAnalysisId,
        ctx.mergedClaims,
        ctx.jdJson,
      );

      const riskDrafts = this._buildRiskEntities(
        userId,
        ctx.seededRisks,
        ctx.riskEnrichmentOutput,
        data.levelMismatch,
      );

      // Risk-aware claim priority boost: claims whose competencies overlap with any
      // risk's relatedCompetencies are bumped to 'high' so Stage 4 probes them deeply
      const allRiskCompetencies = new Set<string>(
        riskDrafts.flatMap((r) => (r.relatedCompetencies ?? []) as string[]),
      );
      for (const claim of claimEntities) {
        const overlap = (claim.impliedCompetencies ?? []).some((c) =>
          allRiskCompetencies.has(c as string),
        );
        if (overlap) claim.verificationPriority = 'high';
      }

      let claimIdMap = new Map<string, string>();
      if (claimEntities.length > 0) {
        const savedClaims = await qr.manager.save(
          CandidateClaim,
          claimEntities,
        );
        claimIdMap = new Map(
          (savedClaims as CandidateClaim[]).map((c) => [
            (c.sourceRef as { localId: string }).localId,
            c.id,
          ]),
        );
      }

      if (riskDrafts.length > 0) {
        const riskEntities = riskDrafts.map(({ _claimLocalId, ...r }) => ({
          ...r,
          calibrationProfileId: savedProfile.id,
          candidateClaimId: _claimLocalId
            ? (claimIdMap.get(_claimLocalId) ?? null)
            : null,
        }));
        await qr.manager.save(RiskHypothesis, riskEntities);
      }

      await qr.commitTransaction();
      this.logger.log(
        `BC-5: persisted calibration profile ${savedProfile.id} userId=${userId} status=${data.status}`,
      );
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  private _buildProfileData(
    userId: string,
    ctx: {
      path: CalibrationPath;
      mergedClaims: RawCandidateClaim[];
      seededRisks: SeededRisk[];
      riskEnrichmentOutput: RiskEnrichmentOutput;
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
      mergedClaims,
      seededRisks,
      riskEnrichmentOutput,
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

    const priorityCompetencies = this._computePriorityCompetencies(
      mergedClaims,
      jdJson,
    );

    // Quality-based status
    const covered = new Set<string>(
      mergedClaims
        .flatMap((c) => c.impliedCompetencies)
        .filter((c) => VALID_COMPETENCIES.has(c)),
    );
    const jdRequired = (jdJson?.requiredCompetencies ?? []).filter((c) =>
      VALID_COMPETENCIES.has(c),
    );
    let coverageScore: number;
    if (jdRequired.length === 0) {
      coverageScore = Math.min(priorityCompetencies.length / 3, 1.0);
    } else {
      const overlap = jdRequired.filter((c) => covered.has(c)).length;
      coverageScore = overlap / jdRequired.length;
    }
    const selectorReady = seededRisks.some(
      (r) => (RISK_TYPE_TO_COMPETENCIES[r.riskType] ?? []).length > 0,
    );

    let status: CalibrationStatus;
    if (
      path === 'full' &&
      mergedClaims.length >= CLAIM_COUNT_READY_THRESHOLD &&
      coverageScore >= COVERAGE_SCORE_READY_THRESHOLD &&
      priorityCompetencies.length >= MIN_PRIORITY_COMPETENCIES &&
      selectorReady
    ) {
      status = 'ready';
    } else {
      status = 'partial';
    }

    const highSeverityCount = [
      ...seededRisks.filter((r) => r.severity === 'high'),
      ...riskEnrichmentOutput.additionalRisks.filter(
        (h) =>
          (BEHAVIORAL_RISK_DEFAULT_SEVERITY[h.riskType] ?? 'low') === 'high',
      ),
    ].length;
    const evidenceStrictness =
      highSeverityCount === 0
        ? 'standard'
        : highSeverityCount <= 2
          ? 'strict'
          : 'very_strict';

    const competencyWeights = this._computeCompetencyWeights(
      priorityCompetencies,
      seededRisks,
      riskEnrichmentOutput,
    );
    const previousWeakCompetencies = this._getPreviousWeakCompetencies(profile);

    const calibrationNotes: string[] = [];
    if (mergedClaims.length === 0) calibrationNotes.push('no_claims_extracted');
    if (
      coverageScore < COVERAGE_SCORE_READY_THRESHOLD &&
      jdRequired.length > 0
    ) {
      calibrationNotes.push('low_coverage_score');
    }

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

    const summary = riskEnrichmentOutput.userFacingSummary;

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
        missingDataWarning,
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
        impliedCompetencies: validImplied,
        verificationPriority,
        techContext: c.techContext.filter((t) => ALL_TECH_TAGS.has(t)),
        riskTags: c.riskTags,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        suggestedQuestions: c.suggestedQuestions,
      };
    });
  }

  private _buildRiskEntities(
    userId: string,
    seededRisks: SeededRisk[],
    riskEnrichmentOutput: RiskEnrichmentOutput,
    levelMismatch: boolean,
  ): RiskEntityDraft[] {
    const enrichmentMap = new Map(
      riskEnrichmentOutput.seededRiskEnrichments.map((e) => [e.localRiskId, e]),
    );
    const seededTypeClaimPairs = new Set<string>(
      seededRisks.map((r) => `${r.riskType}::`),
    );
    const entities: RiskEntityDraft[] = [];

    for (const seeded of seededRisks) {
      const enrichment = enrichmentMap.get(seeded.localRiskId);
      const relatedCompetencies =
        RISK_TYPE_TO_COMPETENCIES[seeded.riskType] ?? [];
      entities.push({
        userId,
        riskType: seeded.riskType,
        severity: seeded.severity,
        rationale: seeded.rationale,
        relatedCompetencies,
        suggestedProbeFocus: enrichment?.suggestedProbeFocus ?? [],
        sourceRefs: seeded.sourceRef,
        source: 'system_inference',
        evidenceNeededToReject: [],
        probeSelectionHints:
          relatedCompetencies.length > 0
            ? { preferredCompetencies: relatedCompetencies }
            : null,
        candidateClaimId: null,
      });
    }

    // Additional risks: composite dedup (riskType + claimLocalId)
    for (const h of riskEnrichmentOutput.additionalRisks) {
      const compositeKey = `${h.riskType}::${h.candidateClaimLocalId}`;
      if (seededTypeClaimPairs.has(compositeKey)) continue;

      const severity: RiskSeverity =
        BEHAVIORAL_RISK_DEFAULT_SEVERITY[h.riskType] ?? 'low';
      const relatedCompetencies = RISK_TYPE_TO_COMPETENCIES[h.riskType] ?? [];
      entities.push({
        userId,
        riskType: h.riskType,
        severity,
        rationale: h.rationale,
        relatedCompetencies,
        suggestedProbeFocus: h.suggestedProbeFocus,
        source: 'cv',
        evidenceNeededToReject: h.suggestedProbeFocus,
        probeSelectionHints:
          relatedCompetencies.length > 0
            ? { preferredCompetencies: relatedCompetencies }
            : null,
        sourceRefs: h.candidateClaimLocalId
          ? { claimLocalId: h.candidateClaimLocalId }
          : null,
        _claimLocalId: h.candidateClaimLocalId || undefined,
        candidateClaimId: null,
      });
    }

    // Level mismatch fallback (only if not already in seeded)
    const hasLevelMismatch = seededRisks.some(
      (r) => r.riskType === 'level_mismatch',
    );
    if (levelMismatch && !hasLevelMismatch) {
      const relatedCompetencies =
        RISK_TYPE_TO_COMPETENCIES['level_mismatch'] ?? [];
      entities.push({
        userId,
        riskType: 'level_mismatch',
        severity: 'medium',
        rationale:
          'Experience level or seniority does not match JD requirements.',
        relatedCompetencies,
        suggestedProbeFocus: [
          'Describe a project where you operated at the required level of ownership.',
        ],
        source: 'system_inference',
        evidenceNeededToReject: [
          'Candidate demonstrates scope and ownership consistent with JD level',
        ],
        probeSelectionHints: { preferredCompetencies: relatedCompetencies },
        sourceRefs: null,
        candidateClaimId: null,
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
    return 'general';
  }

  private _computePriorityCompetencies(
    claims: RawCandidateClaim[],
    jdJson: JdJson | null,
  ): QuestionProbeCompetency[] {
    const jdSignals = new Set<string>(
      (jdJson?.requiredCompetencies ?? []).filter((c: string) =>
        VALID_COMPETENCIES.has(c),
      ),
    );
    const claimSignals = claims
      .flatMap((c) => c.impliedCompetencies)
      .filter((c) => VALID_COMPETENCIES.has(c));

    const candidates =
      jdSignals.size > 0
        ? claimSignals.filter((c) => jdSignals.has(c))
        : claimSignals;

    const source = candidates.length > 0 ? candidates : claimSignals;

    const counted = new Map<string, number>();
    for (const c of source) counted.set(c, (counted.get(c) ?? 0) + 1);
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
    riskEnrichmentOutput: RiskEnrichmentOutput,
  ): Partial<Record<QuestionProbeCompetency, number>> {
    const allRiskCompetencies = new Set<string>([
      ...seededRisks.flatMap(
        (r) => (RISK_TYPE_TO_COMPETENCIES[r.riskType] ?? []) as string[],
      ),
      ...riskEnrichmentOutput.additionalRisks.flatMap(
        (r) => (RISK_TYPE_TO_COMPETENCIES[r.riskType] ?? []) as string[],
      ),
    ]);

    const weights: Partial<Record<QuestionProbeCompetency, number>> = {};
    for (const comp of competencies) {
      weights[comp] = allRiskCompetencies.has(comp) ? 2 : 1;
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
    return skills
      .map((s) => this.fitAssessmentService.canonicalizeSkill(s))
      .filter((s) => ALL_TECH_TAGS.has(s));
  }

  private _severityRank(s: RiskSeverity): number {
    return s === 'high' ? 2 : s === 'medium' ? 1 : 0;
  }
}
