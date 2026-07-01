import { Injectable } from '@nestjs/common';
import {
  ConfidenceLevel,
  CoverageStatus,
  EvidenceStrength,
  FitAssessmentSummary,
  FitAssessmentV2,
  FitGap,
  FitRequirementSignal,
  FitRiskFlag,
  FitRubricEvaluation,
  FitScoreBreakdown,
  GroupedFitGaps,
  LegacyMatchReport,
  NormalizedJdRequirement,
  RequirementSource,
} from './types/fit-assessment.types';
import {
  CANONICAL_SKILL_ALIASES,
  EVIDENCE_SCORE,
  FIT_ASSESSMENT_SCORING_VERSION,
  RISK_PENALTY,
  STATUS_SCORE,
} from './constants/fit-assessment.constants';
import type {
  CvExperience,
  CvJson,
  JdJson,
  Seniority,
} from './types/document-ai.types';
import {
  canonicalize,
  cleanText,
  clamp,
  dedupeStrings,
} from '../common/utils/string.utils';

@Injectable()
export class FitAssessmentService {
  normalizeJdJson(jdJson: JdJson): JdJson {
    const role = cleanText(jdJson.role);
    const requiredSkills = dedupeStrings(jdJson.required_skills ?? []).map(
      (skill) => this.normalizeSkillAlias(skill),
    );
    const niceToHaveSkills = dedupeStrings(
      jdJson.nice_to_have_skills ?? [],
    ).map((skill) => this.normalizeSkillAlias(skill));
    const keyResponsibilities = dedupeStrings(
      jdJson.key_responsibilities ?? [],
    );
    const domain = cleanText(jdJson.domain ?? '');
    const seniority = this.normalizeSeniority(jdJson.seniority);
    const minYears = Number(jdJson.minimum_experience_years);

    const requiredCompetencies = dedupeStrings(
      jdJson.requiredCompetencies ?? [],
    );

    return {
      role,
      required_skills: requiredSkills,
      nice_to_have_skills: niceToHaveSkills,
      minimum_experience_years: Number.isFinite(minYears)
        ? clamp(Math.round(minYears), 0, 30)
        : undefined,
      key_responsibilities: keyResponsibilities,
      domain: domain || undefined,
      seniority,
      requiredCompetencies: requiredCompetencies.length
        ? requiredCompetencies
        : undefined,
    };
  }

  normalizeCvJson(raw: CvJson): { cvJson: CvJson; parseError?: string } {
    const skills = dedupeStrings(
      (raw.skills ?? []).map((s) => this.normalizeSkillAlias(s)),
    );

    const experience = (raw.experience ?? []).map((exp) => {
      const normalized: CvExperience = {
        company: cleanText(exp.company),
        title: cleanText(exp.title),
        responsibilities: dedupeStrings(exp.responsibilities ?? []),
      };
      if (exp.type === 'project') normalized.type = 'project';
      if (exp.startDate) normalized.startDate = cleanText(exp.startDate);
      if (exp.endDate) normalized.endDate = cleanText(exp.endDate);
      if (exp.achievements?.length) {
        normalized.achievements = dedupeStrings(exp.achievements);
      }
      if (exp.techStack?.length) {
        normalized.techStack = dedupeStrings(
          exp.techStack.map((s) => this.normalizeSkillAlias(s)),
        );
      }
      return normalized;
    });

    const flatTechStack = experience.flatMap((e) => e.techStack ?? []);
    const finalSkills =
      skills.length > 0 ? skills : dedupeStrings(flatTechStack);

    let totalYearsExperience =
      raw.totalYearsExperience != null
        ? clamp(Math.round(Number(raw.totalYearsExperience)), 0, 50)
        : undefined;
    if (totalYearsExperience == null && experience.length > 0) {
      totalYearsExperience = this.inferTotalYearsFromExperience(experience);
    }

    let seniority = this.normalizeSeniority(raw.seniority);
    if ((!seniority || seniority === 'unknown') && raw.currentTitle) {
      seniority = this.inferSeniorityFromTitle(raw.currentTitle);
    }

    const parseError =
      experience.length === 0
        ? 'No work experience found in CV.'
        : finalSkills.length === 0
          ? 'No skills found in CV.'
          : undefined;

    const cvJson: CvJson = {
      skills: finalSkills,
      experience,
    };
    if (raw.name) cvJson.name = cleanText(raw.name);
    if (raw.currentTitle) cvJson.currentTitle = cleanText(raw.currentTitle);
    if (totalYearsExperience != null)
      cvJson.totalYearsExperience = totalYearsExperience;
    if (raw.education?.length) {
      cvJson.education = raw.education.map((edu) => ({
        institution: cleanText(edu.institution),
        ...(edu.degree ? { degree: cleanText(edu.degree) } : {}),
        ...(edu.field ? { field: cleanText(edu.field) } : {}),
        ...(edu.graduationYear != null
          ? { graduationYear: Number(edu.graduationYear) }
          : {}),
        ...(edu.gpa ? { gpa: cleanText(edu.gpa) } : {}),
      }));
    }
    if (raw.languages?.length) {
      cvJson.languages = raw.languages.map((lang) => ({
        language: cleanText(lang.language),
        proficiency: cleanText(lang.proficiency),
      }));
    }
    if (raw.certifications?.length) {
      cvJson.certifications = dedupeStrings(raw.certifications);
    }
    if (raw.domain?.length) {
      cvJson.domain = dedupeStrings(raw.domain);
    }
    if (seniority) cvJson.seniority = seniority;

    return { cvJson, parseError };
  }

  buildNormalizedJdRequirements(jdJson: JdJson): NormalizedJdRequirement[] {
    const jd = this.normalizeJdJson(jdJson);
    const requirements: NormalizedJdRequirement[] = [
      ...jd.required_skills.map((skill) => ({
        id: `required_skill:${canonicalize(skill)}`,
        text: skill,
        source: 'required_skill' as const,
        priority: 'must_have' as const,
        weightHint: 'high' as const,
      })),
      ...(jd.nice_to_have_skills ?? []).map((skill) => ({
        id: `nice_to_have_skill:${canonicalize(skill)}`,
        text: skill,
        source: 'nice_to_have_skill' as const,
        priority: 'nice_to_have' as const,
        weightHint: 'low' as const,
      })),
      ...jd.key_responsibilities.map((responsibility, index) => ({
        id: `responsibility:${index}`,
        text: responsibility,
        source: 'responsibility' as const,
        priority: 'must_have' as const,
        weightHint: 'medium' as const,
      })),
    ];

    if (jd.minimum_experience_years !== undefined) {
      requirements.push({
        id: 'experience:min_years',
        text: `${jd.minimum_experience_years}+ years experience`,
        source: 'experience',
        priority: 'must_have',
        weightHint: 'medium',
      });
    } else if (jd.seniority && jd.seniority !== 'unknown') {
      requirements.push({
        id: `experience:seniority:${jd.seniority}`,
        text: `${jd.seniority} level scope`,
        source: 'experience',
        priority: 'must_have',
        weightHint: 'medium',
      });
    }

    if (jd.domain) {
      requirements.push({
        id: `domain:${canonicalize(jd.domain)}`,
        text: jd.domain,
        source: 'domain',
        priority: 'context',
        weightHint: 'low',
      });
    }

    return requirements;
  }

  buildFitAssessment(params: {
    cvJson: CvJson;
    jdJson: JdJson;
    rubric: FitRubricEvaluation;
    model: string;
    requirements: NormalizedJdRequirement[];
  }): FitAssessmentV2 {
    const rubric = this.normalizeRubricEvaluation(
      params.rubric,
      params.requirements,
      params.cvJson,
    );
    const scoreBreakdown = this.computeBreakdown(rubric);
    const weighted =
      scoreBreakdown.mustHaveSkillCoverage * 0.35 +
      scoreBreakdown.roleResponsibilityFit * 0.2 +
      scoreBreakdown.experienceLevelFit * 0.15 +
      scoreBreakdown.evidenceQuality * 0.1 +
      scoreBreakdown.niceToHaveCoverage * 0.08 +
      scoreBreakdown.domainFit * 0.07 +
      scoreBreakdown.transferableExperience * 0.05;
    const finalScore = clamp(
      Math.round(weighted - scoreBreakdown.riskPenalty),
      0,
      100,
    );

    return {
      scoringVersion: FIT_ASSESSMENT_SCORING_VERSION,
      model: params.model,
      createdAt: new Date().toISOString(),
      normalizedRequirements: params.requirements,
      confidence: rubric.confidence,
      requirementSignals: rubric.requirementSignals,
      gaps: rubric.gaps,
      riskFlags: rubric.riskFlags,
      userSummary: rubric.userSummary,
      scoreBreakdown,
      finalScore,
    };
  }

  buildSummary(
    assessment?: FitAssessmentV2 | null,
  ): FitAssessmentSummary | null {
    if (!assessment) return null;
    return {
      confidence: assessment.confidence,
      headline: assessment.userSummary.headline,
      scoreBreakdown: assessment.scoreBreakdown,
      riskFlags: assessment.riskFlags,
      groupedGaps: this.groupGaps(assessment.gaps),
      strengths: assessment.userSummary.strengths,
      gapsToImprove: assessment.userSummary.gapsToImprove,
      transferableNotes: assessment.userSummary.transferableNotes,
    };
  }

  buildLegacyMatchReport(
    assessment?: FitAssessmentV2 | null,
  ): LegacyMatchReport | null {
    if (!assessment) return null;
    return {
      missing_skills: assessment.gaps
        .filter((gap) => gap.category === 'missing_required_skill')
        .map((gap) => gap.label),
      suggestions: assessment.gaps.map(
        (gap) => gap.practiceSuggestion || gap.explanation,
      ),
    };
  }

  groupGaps(gaps: FitGap[]): GroupedFitGaps {
    return {
      missingRequiredSkills: gaps.filter(
        (gap) => gap.category === 'missing_required_skill',
      ),
      weakEvidence: gaps.filter((gap) => gap.category === 'weak_evidence'),
      levelMismatch: gaps.filter((gap) => gap.category === 'level_mismatch'),
      transferableButNotDirect: gaps.filter(
        (gap) => gap.category === 'transferable_not_direct',
      ),
    };
  }

  canonicalizeSkill(skill: string): string {
    return canonicalize(cleanText(skill));
  }

  private computeBreakdown(rubric: FitRubricEvaluation): FitScoreBreakdown {
    const bySource = (source: RequirementSource) =>
      rubric.requirementSignals.filter((signal) => signal.source === source);

    const missingOrWeak = rubric.gaps.filter((gap) =>
      ['missing_required_skill', 'weak_evidence', 'level_mismatch'].includes(
        gap.category,
      ),
    );
    const transferableGaps = rubric.gaps.filter(
      (gap) => gap.category === 'transferable_not_direct',
    );

    return {
      mustHaveSkillCoverage: this.averageStatus(
        bySource('required_skill'),
        100,
      ),
      niceToHaveCoverage: this.averageStatus(
        bySource('nice_to_have_skill'),
        100,
      ),
      experienceLevelFit: this.averageStatus(bySource('experience'), 100),
      roleResponsibilityFit: this.averageStatus(
        bySource('responsibility'),
        100,
      ),
      domainFit: this.averageStatus(bySource('domain'), 100),
      evidenceQuality: this.averageEvidence(rubric.requirementSignals, 50),
      transferableExperience: this.computeTransferableScore(
        transferableGaps,
        missingOrWeak.length,
      ),
      riskPenalty: Math.min(
        30,
        rubric.riskFlags.reduce(
          (sum, flag) => sum + RISK_PENALTY[flag.severity],
          0,
        ),
      ),
    };
  }

  private normalizeRubricEvaluation(
    rubric: FitRubricEvaluation,
    requirements: NormalizedJdRequirement[],
    cvJson: CvJson,
  ): FitRubricEvaluation {
    const requirementById = new Map(requirements.map((req) => [req.id, req]));
    const requirementByText = new Map(
      requirements.map((req) => [canonicalize(req.text), req]),
    );

    const signals = (rubric.requirementSignals ?? []).map((signal) => {
      const matchedRequirement =
        requirementById.get(signal.requirementId) ||
        requirementByText.get(canonicalize(signal.requirement)) ||
        null;

      return {
        requirementId:
          matchedRequirement?.id || cleanText(signal.requirementId),
        requirement: matchedRequirement?.text || cleanText(signal.requirement),
        source:
          matchedRequirement?.source || this.normalizeSource(signal.source),
        status: this.normalizeStatus(signal.status),
        evidenceStrength: this.normalizeEvidenceStrength(
          signal.evidenceStrength,
        ),
        cvEvidence: dedupeStrings(signal.cvEvidence ?? []).slice(0, 5),
        rationale: cleanText(signal.rationale),
      };
    });

    const existingSignalIds = new Set(
      signals.map((signal) => signal.requirementId),
    );
    for (const requirement of requirements) {
      if (existingSignalIds.has(requirement.id)) continue;
      signals.push({
        requirementId: requirement.id,
        requirement: requirement.text,
        source: requirement.source,
        status: 'unclear',
        evidenceStrength: 'none',
        cvEvidence: [],
        rationale:
          'The evaluator did not return evidence for this requirement.',
      });
    }

    const { signals: guardedSignals, upgradedIds } =
      this.applySkillPresenceGuardrail(signals, cvJson);
    const nonMissingRequiredSkillKeys = new Set<string>();
    for (const signal of guardedSignals) {
      if (signal.source !== 'required_skill' || signal.status === 'missing') {
        continue;
      }
      nonMissingRequiredSkillKeys.add(signal.requirementId);
      nonMissingRequiredSkillKeys.add(canonicalize(signal.requirement));
    }

    return {
      confidence: this.normalizeConfidence(rubric.confidence),
      requirementSignals: guardedSignals,
      gaps: (rubric.gaps ?? [])
        .map((gap) => ({
          category: this.normalizeGapCategory(gap.category),
          label: cleanText(gap.label),
          severity: this.normalizeSeverity(gap.severity),
          relatedRequirement: cleanText(gap.relatedRequirement),
          explanation: cleanText(gap.explanation),
          practiceSuggestion: cleanText(gap.practiceSuggestion ?? ''),
        }))
        .filter((gap) => {
          if (gap.category !== 'missing_required_skill') return true;
          const related = cleanText(gap.relatedRequirement);
          return !(
            upgradedIds.has(related) ||
            nonMissingRequiredSkillKeys.has(related) ||
            nonMissingRequiredSkillKeys.has(canonicalize(related))
          );
        }),
      riskFlags: (rubric.riskFlags ?? []).map((flag) => ({
        code: this.normalizeRiskCode(flag.code),
        severity: this.normalizeSeverity(flag.severity),
        explanation: cleanText(flag.explanation),
      })),
      userSummary: {
        headline: cleanText(rubric.userSummary?.headline ?? ''),
        strengths: dedupeStrings(rubric.userSummary?.strengths ?? []),
        gapsToImprove: dedupeStrings(rubric.userSummary?.gapsToImprove ?? []),
        transferableNotes: dedupeStrings(
          rubric.userSummary?.transferableNotes ?? [],
        ),
      },
    };
  }

  private averageStatus(
    signals: FitRequirementSignal[],
    neutralScore: number,
  ): number {
    if (signals.length === 0) return neutralScore;
    const total = signals.reduce(
      (sum, signal) => sum + STATUS_SCORE[signal.status],
      0,
    );
    return clamp(Math.round(total / signals.length), 0, 100);
  }

  private averageEvidence(
    signals: FitRequirementSignal[],
    neutralScore: number,
  ): number {
    if (signals.length === 0) return neutralScore;
    const total = signals.reduce(
      (sum, signal) => sum + EVIDENCE_SCORE[signal.evidenceStrength],
      0,
    );
    return clamp(Math.round(total / signals.length), 0, 100);
  }

  private computeTransferableScore(
    transferableGaps: FitGap[],
    missingOrWeakCount: number,
  ): number {
    if (missingOrWeakCount === 0) return 100;
    if (transferableGaps.length === 0) return 0;
    const severityScore: Record<FitGap['severity'], number> = {
      low: 80,
      medium: 60,
      high: 40,
    };
    const total = transferableGaps.reduce(
      (sum, gap) => sum + severityScore[gap.severity],
      0,
    );
    return clamp(Math.round(total / transferableGaps.length), 0, 100);
  }

  private applySkillPresenceGuardrail(
    signals: FitRequirementSignal[],
    cvJson: CvJson,
  ): { signals: FitRequirementSignal[]; upgradedIds: Set<string> } {
    const cvSkillSet = new Set<string>();
    for (const skill of cvJson.skills ?? []) {
      cvSkillSet.add(canonicalize(skill));
    }
    for (const exp of cvJson.experience ?? []) {
      for (const tech of exp.techStack ?? []) {
        cvSkillSet.add(canonicalize(tech));
      }
    }

    const upgradedIds = new Set<string>();
    const guardedSignals = signals.map((signal) => {
      if (
        signal.status !== 'missing' ||
        (signal.source !== 'required_skill' &&
          signal.source !== 'nice_to_have_skill')
      ) {
        return signal;
      }
      if (!cvSkillSet.has(canonicalize(signal.requirement))) {
        return signal;
      }
      upgradedIds.add(signal.requirementId);
      return {
        ...signal,
        status: 'partial' as CoverageStatus,
        evidenceStrength: 'weak' as EvidenceStrength,
        cvEvidence: signal.cvEvidence.length
          ? signal.cvEvidence
          : ['Listed in CV skills'],
        rationale:
          'Skill found in CV skills list but no project-level evidence confirmed.',
      };
    });

    return { signals: guardedSignals, upgradedIds };
  }

  private normalizeSkillAlias(skill: string): string {
    const cleaned = cleanText(skill);
    return CANONICAL_SKILL_ALIASES[canonicalize(cleaned)] || cleaned;
  }

  private normalizeSource(source: string): RequirementSource {
    const valid: RequirementSource[] = [
      'required_skill',
      'nice_to_have_skill',
      'responsibility',
      'experience',
      'domain',
    ];
    return valid.includes(source as RequirementSource)
      ? (source as RequirementSource)
      : 'responsibility';
  }

  private normalizeStatus(status: string): CoverageStatus {
    const valid: CoverageStatus[] = ['met', 'partial', 'missing', 'unclear'];
    return valid.includes(status as CoverageStatus)
      ? (status as CoverageStatus)
      : 'unclear';
  }

  private normalizeEvidenceStrength(value: string): EvidenceStrength {
    const valid: EvidenceStrength[] = ['strong', 'weak', 'none'];
    return valid.includes(value as EvidenceStrength)
      ? (value as EvidenceStrength)
      : 'none';
  }

  private normalizeConfidence(value: string): ConfidenceLevel {
    const valid: ConfidenceLevel[] = ['high', 'medium', 'low'];
    return valid.includes(value as ConfidenceLevel)
      ? (value as ConfidenceLevel)
      : 'low';
  }

  private normalizeGapCategory(value: string): FitGap['category'] {
    const valid: FitGap['category'][] = [
      'missing_required_skill',
      'weak_evidence',
      'level_mismatch',
      'transferable_not_direct',
    ];
    return valid.includes(value as FitGap['category'])
      ? (value as FitGap['category'])
      : 'weak_evidence';
  }

  private normalizeSeverity(value: string): FitGap['severity'] {
    const valid: FitGap['severity'][] = ['high', 'medium', 'low'];
    return valid.includes(value as FitGap['severity'])
      ? (value as FitGap['severity'])
      : 'medium';
  }

  private normalizeRiskCode(value: string): FitRiskFlag['code'] {
    const valid: FitRiskFlag['code'][] = [
      'insufficient_cv_detail',
      'seniority_mismatch',
      'missing_core_stack',
      'domain_gap',
      'ambiguous_timeline',
    ];
    return valid.includes(value as FitRiskFlag['code'])
      ? (value as FitRiskFlag['code'])
      : 'insufficient_cv_detail';
  }

  private normalizeSeniority(value?: string): Seniority {
    const valid: Seniority[] = [
      'intern',
      'junior',
      'mid',
      'senior',
      'lead',
      'staff',
      'manager',
      'unknown',
    ];
    return valid.includes(value as Seniority)
      ? (value as Seniority)
      : 'unknown';
  }

  private inferTotalYearsFromExperience(
    experience: CvExperience[],
  ): number | undefined {
    let totalMonths = 0;
    let valid = false;
    for (const exp of experience) {
      if (exp.type === 'project') continue;
      const parseDate = (s?: string): Date | undefined => {
        if (!s) return undefined;
        const iso = s.match(/^(\d{4})-(\d{2})$/);
        if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1);
        const yr = s.match(/\b(20\d{2}|19\d{2})\b/);
        return yr ? new Date(Number(yr[1]), 6) : undefined;
      };
      const start = parseDate(exp.startDate);
      const isPresent = !exp.endDate || /present|now|hiện/i.test(exp.endDate);
      const end = isPresent ? new Date() : parseDate(exp.endDate);
      if (start && end && end >= start) {
        totalMonths +=
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth());
        valid = true;
      }
    }
    return valid ? clamp(Math.round(totalMonths / 12), 0, 50) : undefined;
  }

  private inferSeniorityFromTitle(title: string): Seniority {
    const t = title.toLowerCase();
    if (/\b(vp|director|principal|distinguished|fellow)\b/.test(t))
      return 'staff';
    if (/\blead\b/.test(t)) return 'lead';
    if (/\bstaff\b/.test(t)) return 'staff';
    if (/\b(senior|sr\.?)\b/.test(t)) return 'senior';
    if (/\b(junior|jr\.?)\b/.test(t)) return 'junior';
    if (/\bintern\b/.test(t)) return 'intern';
    return 'unknown';
  }
}
