import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../ai/gemini.service';
import { DocumentsAiService } from './documents.ai.service';
import { CANONICAL_SKILL_ALIASES } from './constants/fit-assessment.constants';
import type {
  ConfidenceLevel,
  CoverageStatus,
  EvidenceStrength,
  FitGap,
  FitRequirementSignal,
  FitRiskFlag,
  FitRubricEvaluation,
  NormalizedJdRequirement,
} from './types/fit-assessment.types';
import type {
  CvExperience,
  CvJson,
  JdJson,
  Seniority,
} from './types/document-ai.types';
import type {
  FitEvidenceIndex,
  FitEvidenceItem,
  FitSemanticRequirementInput,
  RequirementEvidence,
} from './types/fit-rubric-pipeline.types';
import {
  canonicalize,
  cleanText,
  dedupeStrings,
} from '../common/utils/string.utils';

type ParsedDate = { date?: Date; unreadable: boolean };

const STATUS_RANK: Record<CoverageStatus, number> = {
  missing: 0,
  unclear: 1,
  partial: 2,
  met: 3,
};

const SENIORITY_RANK: Record<Seniority, number> = {
  unknown: 0,
  intern: 1,
  junior: 2,
  mid: 3,
  senior: 4,
  lead: 5,
  staff: 6,
  manager: 6,
};

const SOFTWARE_DOMAIN_TERMS = [
  'api',
  'backend',
  'cloud',
  'developer',
  'devops',
  'frontend',
  'it',
  'mobile',
  'platform',
  'saas',
  'software',
  'technology',
  'tech',
  'web',
];

const RESPONSIBILITY_EMBEDDING_MODEL = 'gemini-embedding-001';
const RESPONSIBILITY_EMBEDDING_DIMENSIONS = 768;
const RESPONSIBILITY_EMBEDDING_TOP_K = 3;
// Raised from 0.55 after observing real CV/JD scores: unrelated requirement-evidence pairs
// still scored 0.57-0.65, so 0.55 never filtered anything. Revisit if precision/recall drifts.
const RESPONSIBILITY_EMBEDDING_SIMILARITY_THRESHOLD = 0.67;

@Injectable()
export class FitRubricPipelineService {
  private readonly logger = new Logger(FitRubricPipelineService.name);

  constructor(
    private readonly aiService: DocumentsAiService,
    private readonly geminiService: GeminiService,
  ) {}

  async assessFitRubric(params: {
    cvJson: CvJson;
    jdJson: JdJson;
    requirements: NormalizedJdRequirement[];
  }): Promise<FitRubricEvaluation> {
    // build evidence index and requirement evidence
    const evidenceIndex = this.buildEvidenceIndex(params.cvJson);
    const cvEvidencePool = this.buildCvEvidencePool(evidenceIndex);
    const responsibilityEmbeddingEvidence =
      await this.buildResponsibilityEmbeddingEvidence(
        params.requirements,
        evidenceIndex,
      );
    const requirementEvidence = params.requirements.map((requirement) =>
      this.buildRequirementEvidence(
        requirement,
        params.jdJson,
        evidenceIndex,
        responsibilityEmbeddingEvidence,
      ),
    );
    const deterministicSignals = requirementEvidence.map((evidence) =>
      this.buildDeterministicSignal(
        evidence,
        params.cvJson,
        params.jdJson,
        evidenceIndex,
      ),
    );
    const { semanticSignals, semanticFailed } =
      await this.evaluateSemanticSignals({
        cvJson: params.cvJson,
        jdJson: params.jdJson,
        requirementEvidence,
        deterministicSignals,
        evidenceIndex,
        cvEvidencePool,
      });

    const requirementEvidenceById = new Map(
      requirementEvidence.map((entry) => [entry.requirement.id, entry]),
    );
    const signals = this.mergeSignals(
      params.requirements,
      deterministicSignals,
      semanticSignals,
      requirementEvidenceById,
      cvEvidencePool,
    );
    const gaps = this.buildGaps(signals, params.requirements, params.jdJson);
    const riskFlags = this.buildRiskFlags(
      signals,
      gaps,
      params.cvJson,
      params.jdJson,
      evidenceIndex,
    );
    const confidence = this.computeConfidence(
      signals,
      riskFlags,
      semanticFailed,
    );
    const userSummary = this.buildFallbackSummary(signals, gaps);

    return {
      confidence,
      requirementSignals: signals,
      gaps,
      riskFlags,
      userSummary,
    };
  }

  private buildEvidenceIndex(cvJson: CvJson): FitEvidenceIndex {
    const skillEvidence = new Map<string, string[]>();
    const listedSkillEvidence = new Map<string, string[]>();
    const roleSkillEvidence = new Map<string, string[]>();
    const textEvidence: FitEvidenceItem[] = [];
    let ambiguousTimeline = false;

    for (const skill of cvJson.skills ?? []) {
      const normalized = this.normalizeSkillLabel(skill);
      const canonicalSkill = canonicalize(normalized);
      const evidence = `Listed in CV skills: ${normalized}`;
      this.addSkillEvidence(skillEvidence, canonicalSkill, evidence);
      this.addSkillEvidence(listedSkillEvidence, canonicalSkill, evidence);
    }

    for (const exp of cvJson.experience ?? []) {
      ambiguousTimeline = this.hasAmbiguousTimeline(exp) || ambiguousTimeline;
      const roleLabel = this.experienceLabel(exp);
      if (exp.title) {
        textEvidence.push(
          this.createEvidenceItem('experience.title', roleLabel),
        );
      }

      for (const tech of exp.techStack ?? []) {
        const normalized = this.normalizeSkillLabel(tech);
        const canonicalSkill = canonicalize(normalized);
        const evidence = `${roleLabel}: tech stack includes ${normalized}`;
        this.addSkillEvidence(skillEvidence, canonicalSkill, evidence);
        this.addSkillEvidence(roleSkillEvidence, canonicalSkill, evidence);
        textEvidence.push(
          this.createEvidenceItem(
            'experience.techStack',
            evidence,
            canonicalSkill,
          ),
        );
      }

      for (const responsibility of exp.responsibilities ?? []) {
        textEvidence.push(
          this.createEvidenceItem(
            'experience.responsibility',
            `${roleLabel}: ${cleanText(responsibility)}`,
          ),
        );
      }

      for (const achievement of exp.achievements ?? []) {
        textEvidence.push(
          this.createEvidenceItem(
            'experience.achievement',
            `${roleLabel}: ${cleanText(achievement)}`,
          ),
        );
      }
    }

    for (const domain of cvJson.domain ?? []) {
      textEvidence.push(this.createEvidenceItem('domain', cleanText(domain)));
    }

    if (cvJson.totalYearsExperience !== undefined) {
      textEvidence.push(
        this.createEvidenceItem(
          'experience.totalYears',
          `Total experience: ${cvJson.totalYearsExperience} years`,
        ),
      );
    }

    if (cvJson.seniority && cvJson.seniority !== 'unknown') {
      textEvidence.push(
        this.createEvidenceItem(
          'experience.seniority',
          `Candidate seniority: ${cvJson.seniority}`,
        ),
      );
    }

    return {
      skillEvidence,
      listedSkillEvidence,
      roleSkillEvidence,
      textEvidence,
      domains: dedupeStrings(cvJson.domain ?? []),
      totalYearsExperience: cvJson.totalYearsExperience,
      seniority: cvJson.seniority,
      ambiguousTimeline,
    };
  }

  /**
   * Full raw CV evidence text (titles, responsibilities, achievements, skills,
   * tech stack) for the semantic LLM step to read independently — unlike the
   * per-requirement evidence arrays, this isn't pre-filtered by deterministic
   * matching, so it lets the LLM judge abstractly-worded requirements that
   * direct/related keyword matching structurally can't cover.
   */
  private buildCvEvidencePool(evidenceIndex: FitEvidenceIndex): string[] {
    const fromTextEvidence = evidenceIndex.textEvidence
      .filter((item) =>
        [
          'experience.title',
          'experience.responsibility',
          'experience.achievement',
        ].includes(item.source),
      )
      .map((item) => item.text);
    const fromSkillEvidence = Array.from(
      evidenceIndex.skillEvidence.values(),
    ).flat();
    return dedupeStrings([...fromTextEvidence, ...fromSkillEvidence]);
  }

  private buildRequirementEvidence(
    requirement: NormalizedJdRequirement,
    jdJson: JdJson,
    evidenceIndex: FitEvidenceIndex,
    responsibilityEmbeddingEvidence: Map<string, string[]> | null,
  ): RequirementEvidence {
    const canonicalRequirementSkill = this.canonicalSkill(requirement.text);
    const exactSkillEvidence =
      requirement.source === 'required_skill' ||
      requirement.source === 'nice_to_have_skill'
        ? (evidenceIndex.listedSkillEvidence.get(canonicalRequirementSkill) ??
          [])
        : [];
    const roleSkillEvidence =
      requirement.source === 'required_skill' ||
      requirement.source === 'nice_to_have_skill'
        ? (evidenceIndex.roleSkillEvidence.get(canonicalRequirementSkill) ?? [])
        : [];
    const directEvidence =
      requirement.source === 'responsibility' && responsibilityEmbeddingEvidence
        ? (responsibilityEmbeddingEvidence.get(requirement.id) ?? [])
        : this.findDirectEvidence(requirement, evidenceIndex);
    const relatedEvidence = this.findRelatedEvidence(
      requirement,
      jdJson,
      evidenceIndex,
    );

    return {
      requirement,
      exactSkillEvidence: dedupeStrings(exactSkillEvidence).slice(0, 5),
      roleSkillEvidence: dedupeStrings(roleSkillEvidence).slice(0, 5),
      directEvidence: dedupeStrings(directEvidence).slice(0, 5),
      relatedEvidence: dedupeStrings(relatedEvidence).slice(0, 5),
    };
  }

  /**
   * Keyword substring matching (findDirectEvidence) only works for short
   * skill-like requirement text. Responsibility requirements are full
   * sentences, so direct evidence for them is found via embedding similarity
   * against CV responsibility/achievement sentences instead. Computed once
   * per assessment (batched), not per requirement, to avoid O(N*M) calls.
   */
  private async buildResponsibilityEmbeddingEvidence(
    requirements: NormalizedJdRequirement[],
    evidenceIndex: FitEvidenceIndex,
  ): Promise<Map<string, string[]> | null> {
    const responsibilityRequirements = requirements.filter(
      (requirement) => requirement.source === 'responsibility',
    );
    const evidencePool = evidenceIndex.textEvidence.filter((item) =>
      ['experience.responsibility', 'experience.achievement'].includes(
        item.source,
      ),
    );
    if (responsibilityRequirements.length === 0 || evidencePool.length === 0) {
      return null;
    }

    try {
      const [requirementVectors, evidenceVectors] = await Promise.all([
        this.geminiService.embedContents({
          model: RESPONSIBILITY_EMBEDDING_MODEL,
          contents: responsibilityRequirements.map((req) => req.text),
          config: {
            taskType: 'RETRIEVAL_QUERY',
            outputDimensionality: RESPONSIBILITY_EMBEDDING_DIMENSIONS,
          },
        }),
        this.geminiService.embedContents({
          model: RESPONSIBILITY_EMBEDDING_MODEL,
          contents: evidencePool.map((item) => item.text),
          config: {
            taskType: 'RETRIEVAL_DOCUMENT',
            outputDimensionality: RESPONSIBILITY_EMBEDDING_DIMENSIONS,
          },
        }),
      ]);

      const normalizedEvidenceVectors = evidenceVectors.map((vector) =>
        this.normalizeVector(vector),
      );
      const result = new Map<string, string[]>();
      responsibilityRequirements.forEach((requirement, requirementIndex) => {
        const requirementVector = this.normalizeVector(
          requirementVectors[requirementIndex],
        );
        const scored = evidencePool.map((item, evidenceItemIndex) => ({
          text: item.text,
          score: this.dotProduct(
            requirementVector,
            normalizedEvidenceVectors[evidenceItemIndex],
          ),
        }));
        console.log(
          `[score] ${requirement.text} ->`,
          scored
            .slice()
            .sort((a, b) => b.score - a.score)
            .map(
              (entry) => `${entry.score.toFixed(2)}:${entry.text.slice(0, 30)}`,
            )
            .join(' | '),
        );
        const matches = scored
          .filter(
            (entry) =>
              entry.score >= RESPONSIBILITY_EMBEDDING_SIMILARITY_THRESHOLD,
          )
          .sort((a, b) => b.score - a.score)
          .slice(0, RESPONSIBILITY_EMBEDDING_TOP_K)
          .map((entry) => entry.text);
        result.set(requirement.id, matches);
      });
      return result;
    } catch (error) {
      this.logger.warn(
        `Responsibility embedding evidence lookup failed; using keyword fallback: ${this.errorMessage(
          error,
        )}`,
      );
      return null;
    }
  }

  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(
      vector.reduce((sum, value) => sum + value * value, 0),
    );
    if (!Number.isFinite(magnitude) || magnitude === 0) {
      throw new Error('Cannot normalize empty embedding vector');
    }
    return vector.map((value) => value / magnitude);
  }

  private dotProduct(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }

  private buildDeterministicSignal(
    evidence: RequirementEvidence,
    cvJson: CvJson,
    jdJson: JdJson,
    evidenceIndex: FitEvidenceIndex,
  ): FitRequirementSignal {
    const { requirement } = evidence;
    if (
      requirement.source === 'required_skill' ||
      requirement.source === 'nice_to_have_skill'
    ) {
      return this.buildSkillSignal(evidence);
    }
    if (requirement.source === 'experience') {
      return this.buildExperienceSignal(requirement, cvJson, jdJson);
    }
    if (requirement.source === 'domain') {
      return this.buildDomainSignal(requirement, evidenceIndex);
    }
    return this.buildResponsibilitySignal(evidence);
  }

  private buildSkillSignal(
    evidence: RequirementEvidence,
  ): FitRequirementSignal {
    const { requirement } = evidence;
    if (evidence.directEvidence.length > 0) {
      return this.signal({
        requirement,
        status: 'met',
        evidenceStrength: 'strong',
        cvEvidence: evidence.directEvidence,
        rationale:
          'Candidate has direct CV evidence for this skill in work context.',
      });
    }
    if (evidence.roleSkillEvidence.length > 0) {
      return this.signal({
        requirement,
        status: 'met',
        evidenceStrength: 'strong',
        cvEvidence: evidence.roleSkillEvidence,
        rationale:
          'Skill appears in a role-specific tech stack, which indicates hands-on work context.',
      });
    }
    if (evidence.exactSkillEvidence.length > 0) {
      return this.signal({
        requirement,
        status: 'partial',
        evidenceStrength: 'weak',
        cvEvidence: evidence.exactSkillEvidence,
        rationale:
          'Skill appears in CV skills or role tech stack but lacks direct delivery evidence.',
      });
    }
    return this.signal({
      requirement,
      status: 'missing',
      evidenceStrength: 'none',
      cvEvidence: [],
      rationale: `No ${requirement.text} evidence found in CV skills or experience.`,
    });
  }

  private buildExperienceSignal(
    requirement: NormalizedJdRequirement,
    cvJson: CvJson,
    jdJson: JdJson,
  ): FitRequirementSignal {
    if (requirement.id === 'experience:min_years') {
      const minYears = jdJson.minimum_experience_years;
      const actualYears = cvJson.totalYearsExperience;
      if (minYears === undefined) {
        return this.signal({
          requirement,
          status: 'unclear',
          evidenceStrength: 'none',
          cvEvidence: [],
          rationale: 'JD minimum years requirement is not available.',
        });
      }
      if (actualYears === undefined) {
        return this.signal({
          requirement,
          status: 'unclear',
          evidenceStrength: 'none',
          cvEvidence: [],
          rationale:
            'CV does not provide enough timeline detail to confirm total years.',
        });
      }
      if (actualYears >= minYears) {
        return this.signal({
          requirement,
          status: 'met',
          evidenceStrength: 'strong',
          cvEvidence: [`Total experience: ${actualYears} years`],
          rationale: `Candidate meets the ${minYears}+ years requirement.`,
        });
      }
      return this.signal({
        requirement,
        status: actualYears > 0 ? 'partial' : 'missing',
        evidenceStrength: actualYears > 0 ? 'weak' : 'none',
        cvEvidence:
          actualYears > 0 ? [`Total experience: ${actualYears} years`] : [],
        rationale: `Candidate experience is below the ${minYears}+ years requirement.`,
      });
    }

    const requiredSeniority = jdJson.seniority;
    const candidateSeniority = cvJson.seniority;
    if (!requiredSeniority || requiredSeniority === 'unknown') {
      return this.signal({
        requirement,
        status: 'unclear',
        evidenceStrength: 'none',
        cvEvidence: [],
        rationale:
          'JD seniority requirement is not specific enough to evaluate.',
      });
    }
    if (!candidateSeniority || candidateSeniority === 'unknown') {
      return this.signal({
        requirement,
        status: 'unclear',
        evidenceStrength: 'none',
        cvEvidence: [],
        rationale:
          'CV seniority is not specific enough to compare against the JD.',
      });
    }
    const candidateRank = SENIORITY_RANK[candidateSeniority];
    const requiredRank = SENIORITY_RANK[requiredSeniority];
    return this.signal({
      requirement,
      status: candidateRank >= requiredRank ? 'met' : 'partial',
      evidenceStrength: candidateRank >= requiredRank ? 'strong' : 'weak',
      cvEvidence: [`Candidate seniority: ${candidateSeniority}`],
      rationale:
        candidateRank >= requiredRank
          ? `Candidate seniority matches the ${requiredSeniority} requirement.`
          : `Candidate seniority appears below the ${requiredSeniority} requirement.`,
    });
  }

  private buildDomainSignal(
    requirement: NormalizedJdRequirement,
    evidenceIndex: FitEvidenceIndex,
  ): FitRequirementSignal {
    const matchingDomain = evidenceIndex.domains.find(
      (domain) => canonicalize(domain) === canonicalize(requirement.text),
    );
    if (matchingDomain) {
      return this.signal({
        requirement,
        status: 'met',
        evidenceStrength: 'strong',
        cvEvidence: [`Candidate domain: ${matchingDomain}`],
        rationale: 'Candidate has direct domain evidence matching the JD.',
      });
    }
    if (evidenceIndex.domains.length > 0) {
      return this.signal({
        requirement,
        status: 'partial',
        evidenceStrength: 'weak',
        cvEvidence: evidenceIndex.domains.map(
          (domain) => `Candidate domain: ${domain}`,
        ),
        rationale:
          'Candidate has domain context, but it is not a direct match.',
      });
    }
    return this.signal({
      requirement,
      status: 'unclear',
      evidenceStrength: 'none',
      cvEvidence: [],
      rationale: 'CV does not provide clear domain context.',
    });
  }

  private buildResponsibilitySignal(
    evidence: RequirementEvidence,
  ): FitRequirementSignal {
    const { requirement } = evidence;
    if (evidence.directEvidence.length > 0) {
      return this.signal({
        requirement,
        status: 'partial',
        evidenceStrength: 'weak',
        cvEvidence: evidence.directEvidence,
        rationale:
          'CV has keyword-level evidence related to this responsibility, but direct scope is not fully established.',
      });
    }
    if (evidence.relatedEvidence.length > 0) {
      return this.signal({
        requirement,
        status: 'partial',
        evidenceStrength: 'weak',
        cvEvidence: evidence.relatedEvidence,
        rationale:
          'Candidate has adjacent skills or context for this responsibility, but no direct project evidence.',
      });
    }
    return this.signal({
      requirement,
      status: 'missing',
      evidenceStrength: 'none',
      cvEvidence: [],
      rationale: 'No CV evidence found for this responsibility.',
    });
  }

  private async evaluateSemanticSignals(params: {
    cvJson: CvJson;
    jdJson: JdJson;
    requirementEvidence: RequirementEvidence[];
    deterministicSignals: FitRequirementSignal[];
    evidenceIndex: FitEvidenceIndex;
    cvEvidencePool: string[];
  }): Promise<{
    semanticSignals: FitRequirementSignal[];
    semanticFailed: boolean;
  }> {
    const deterministicById = new Map(
      params.deterministicSignals.map((signal) => [
        signal.requirementId,
        signal,
      ]),
    );
    const semanticRequirements: FitSemanticRequirementInput[] =
      params.requirementEvidence
        .filter(({ requirement }) =>
          ['responsibility', 'domain', 'experience'].includes(
            requirement.source,
          ),
        )
        .map((entry) => {
          const deterministic = deterministicById.get(entry.requirement.id);
          return {
            requirementId: entry.requirement.id,
            requirement: entry.requirement.text,
            source: entry.requirement.source,
            priority: entry.requirement.priority,
            deterministicStatus: deterministic?.status ?? 'unclear',
            deterministicEvidenceStrength:
              deterministic?.evidenceStrength ?? 'none',
            evidence: dedupeStrings([
              ...entry.directEvidence,
              ...entry.relatedEvidence,
              ...entry.roleSkillEvidence,
              ...entry.exactSkillEvidence,
            ]).slice(0, 8),
          };
        });

    if (semanticRequirements.length === 0) {
      return { semanticSignals: [], semanticFailed: false };
    }

    try {
      const result = await this.aiService.evaluateFitSemanticSignals({
        cvFacts: {
          seniority: params.cvJson.seniority,
          totalYearsExperience: params.cvJson.totalYearsExperience,
          domains: params.evidenceIndex.domains,
        },
        jdFacts: {
          role: params.jdJson.role,
          seniority: params.jdJson.seniority,
          minimumExperienceYears: params.jdJson.minimum_experience_years,
          domain: params.jdJson.domain,
        },
        requirements: semanticRequirements,
        cvEvidencePool: params.cvEvidencePool,
      });
      return {
        semanticSignals: result.requirementSignals ?? [],
        semanticFailed: false,
      };
    } catch (error) {
      this.logger.warn(
        `Semantic fit evaluation failed; using deterministic fallback: ${this.errorMessage(
          error,
        )}`,
      );
      return { semanticSignals: [], semanticFailed: true };
    }
  }

  private mergeSignals(
    requirements: NormalizedJdRequirement[],
    deterministicSignals: FitRequirementSignal[],
    semanticSignals: FitRequirementSignal[],
    requirementEvidenceById: Map<string, RequirementEvidence>,
    cvEvidencePool: string[],
  ): FitRequirementSignal[] {
    const deterministicById = new Map(
      deterministicSignals.map((signal) => [signal.requirementId, signal]),
    );
    const semanticById = new Map(
      semanticSignals.map((signal) => [signal.requirementId, signal]),
    );

    return requirements.map((requirement) => {
      const deterministic =
        deterministicById.get(requirement.id) ??
        this.signal({
          requirement,
          status: 'unclear',
          evidenceStrength: 'none',
          cvEvidence: [],
          rationale:
            'No deterministic evaluation was produced for this requirement.',
        });

      if (
        requirement.source === 'required_skill' ||
        requirement.source === 'nice_to_have_skill'
      ) {
        return deterministic;
      }

      const semantic = semanticById.get(requirement.id);
      if (!semantic) return deterministic;

      const evidence = requirementEvidenceById.get(requirement.id);
      const allowedEvidence = new Set(
        dedupeStrings([
          ...(evidence?.directEvidence ?? []),
          ...(evidence?.relatedEvidence ?? []),
          ...(evidence?.roleSkillEvidence ?? []),
          ...(evidence?.exactSkillEvidence ?? []),
          ...deterministic.cvEvidence,
          ...cvEvidencePool,
        ]),
      );
      const sanitized = this.sanitizeSemanticSignal(
        semantic,
        requirement,
        allowedEvidence,
      );

      if (!sanitized) return deterministic;
      if (STATUS_RANK[sanitized.status] < STATUS_RANK[deterministic.status]) {
        return deterministic;
      }
      if (
        sanitized.status !== 'missing' &&
        sanitized.status !== 'unclear' &&
        sanitized.cvEvidence.length === 0 &&
        deterministic.cvEvidence.length > 0
      ) {
        return deterministic;
      }

      return sanitized;
    });
  }

  private sanitizeSemanticSignal(
    signal: FitRequirementSignal,
    requirement: NormalizedJdRequirement,
    allowedEvidence: Set<string>,
  ): FitRequirementSignal | null {
    if (signal.requirementId !== requirement.id) return null;
    const cvEvidence = dedupeStrings(signal.cvEvidence ?? []).filter(
      (evidence) => allowedEvidence.has(evidence),
    );
    const status = this.normalizeStatus(signal.status);
    const evidenceStrength = this.normalizeEvidenceStrength(
      signal.evidenceStrength,
    );
    return this.signal({
      requirement,
      status,
      evidenceStrength:
        cvEvidence.length === 0 && status !== 'missing' && status !== 'unclear'
          ? 'none'
          : evidenceStrength,
      cvEvidence,
      rationale: cleanText(signal.rationale),
    });
  }

  private buildGaps(
    signals: FitRequirementSignal[],
    requirements: NormalizedJdRequirement[],
    jdJson: JdJson,
  ): FitGap[] {
    const requirementById = new Map(requirements.map((req) => [req.id, req]));
    const gaps: FitGap[] = [];

    for (const signal of signals) {
      const requirement = requirementById.get(signal.requirementId);
      if (!requirement) continue;

      if (signal.source === 'required_skill' && signal.status === 'missing') {
        gaps.push({
          category: 'missing_required_skill',
          label: signal.requirement,
          severity: 'high',
          relatedRequirement: signal.requirement,
          explanation: `No CV evidence was found for required skill ${signal.requirement}.`,
          practiceSuggestion: `Add concrete ${signal.requirement} project evidence if you have it, or practice the fundamentals before interviewing.`,
        });
        continue;
      }

      if (
        signal.source === 'experience' &&
        (signal.status === 'partial' || signal.status === 'missing') &&
        (jdJson.minimum_experience_years !== undefined ||
          (jdJson.seniority && jdJson.seniority !== 'unknown'))
      ) {
        gaps.push({
          category: 'level_mismatch',
          label: signal.requirement,
          severity: signal.status === 'missing' ? 'high' : 'medium',
          relatedRequirement: signal.requirement,
          explanation: signal.rationale,
          practiceSuggestion:
            'Prepare examples that demonstrate scope, ownership, and impact at the expected level.',
        });
        continue;
      }

      if (
        requirement.priority === 'must_have' &&
        signal.status === 'partial' &&
        signal.evidenceStrength === 'weak'
      ) {
        gaps.push({
          category: 'weak_evidence',
          label: signal.requirement,
          severity: signal.source === 'required_skill' ? 'medium' : 'low',
          relatedRequirement: signal.requirement,
          explanation: signal.rationale,
          practiceSuggestion:
            'Strengthen your CV with a concrete project, scope, or measurable outcome for this requirement.',
        });
      }
    }

    return this.dedupeGaps(gaps);
  }

  private buildRiskFlags(
    signals: FitRequirementSignal[],
    gaps: FitGap[],
    cvJson: CvJson,
    jdJson: JdJson,
    evidenceIndex: FitEvidenceIndex,
  ): FitRiskFlag[] {
    const riskFlags: FitRiskFlag[] = [];
    const missingRequiredSkills = signals.filter(
      (signal) =>
        signal.source === 'required_skill' && signal.status === 'missing',
    );
    if (missingRequiredSkills.length > 0) {
      riskFlags.push({
        code: 'missing_core_stack',
        severity: 'high',
        explanation: `Missing required stack evidence: ${missingRequiredSkills
          .map((signal) => signal.requirement)
          .join(', ')}.`,
      });
    }

    const seniorityMismatch = this.hasSeniorityMismatch(cvJson, jdJson);
    if (seniorityMismatch) {
      riskFlags.push({
        code: 'seniority_mismatch',
        severity: 'medium',
        explanation: `Candidate seniority appears below the JD expectation (${jdJson.seniority}).`,
      });
    }

    if (
      jdJson.minimum_experience_years !== undefined &&
      cvJson.totalYearsExperience === undefined
    ) {
      riskFlags.push({
        code: 'insufficient_cv_detail',
        severity: 'medium',
        explanation:
          'JD asks for minimum years of experience, but the CV timeline does not provide enough detail.',
      });
    }

    if (
      (jdJson.required_skills ?? []).length > 0 &&
      evidenceIndex.skillEvidence.size === 0
    ) {
      riskFlags.push({
        code: 'insufficient_cv_detail',
        severity: 'high',
        explanation:
          'JD includes required skills, but the CV does not expose a skills list or role tech stack.',
      });
    }

    if (this.hasDomainGap(jdJson.domain, evidenceIndex.domains)) {
      riskFlags.push({
        code: 'domain_gap',
        severity: 'low',
        explanation: `CV domain context (${evidenceIndex.domains.join(
          ', ',
        )}) does not directly match JD domain (${jdJson.domain}).`,
      });
    }

    if (evidenceIndex.ambiguousTimeline) {
      riskFlags.push({
        code: 'ambiguous_timeline',
        severity: 'low',
        explanation:
          'One or more CV experience dates are contradictory or unreadable.',
      });
    }

    const hasLevelGap = gaps.some((gap) => gap.category === 'level_mismatch');
    if (
      hasLevelGap &&
      !riskFlags.some((flag) => flag.code === 'seniority_mismatch')
    ) {
      riskFlags.push({
        code: 'seniority_mismatch',
        severity: 'medium',
        explanation:
          'Experience level evidence appears below one or more JD expectations.',
      });
    }

    return this.dedupeRiskFlags(riskFlags);
  }

  private computeConfidence(
    signals: FitRequirementSignal[],
    riskFlags: FitRiskFlag[],
    semanticFailed: boolean,
  ): ConfidenceLevel {
    if (semanticFailed) return 'low';
    if (signals.some((signal) => signal.status === 'unclear')) return 'medium';
    if (riskFlags.some((flag) => flag.code === 'insufficient_cv_detail')) {
      return 'medium';
    }
    return 'high';
  }

  private buildFallbackSummary(
    signals: FitRequirementSignal[],
    gaps: FitGap[],
  ): FitRubricEvaluation['userSummary'] {
    const strengths = signals
      .filter(
        (signal) =>
          signal.status === 'met' ||
          (signal.status === 'partial' && signal.evidenceStrength === 'strong'),
      )
      .map((signal) => signal.requirement)
      .slice(0, 4);
    const gapsToImprove = gaps.map((gap) => gap.label).slice(0, 4);
    const transferableNotes = signals
      .filter(
        (signal) =>
          signal.status === 'partial' &&
          signal.evidenceStrength === 'weak' &&
          signal.cvEvidence.length > 0,
      )
      .map((signal) => `${signal.requirement}: ${signal.cvEvidence[0]}`)
      .slice(0, 3);

    return {
      headline:
        gaps.length === 0
          ? 'Strong fit based on the available CV evidence.'
          : 'Mixed fit with clear areas to strengthen before interviewing.',
      strengths,
      gapsToImprove,
      transferableNotes,
    };
  }

  private findDirectEvidence(
    requirement: NormalizedJdRequirement,
    evidenceIndex: FitEvidenceIndex,
  ): string[] {
    const terms = this.requirementTerms(requirement.text);
    return evidenceIndex.textEvidence
      .filter((item) =>
        ['experience.responsibility', 'experience.achievement'].includes(
          item.source,
        ),
      )
      .filter((item) =>
        terms.some((term) => this.textContainsTerm(item.text, term)),
      )
      .map((item) => item.text);
  }

  private findRelatedEvidence(
    requirement: NormalizedJdRequirement,
    jdJson: JdJson,
    evidenceIndex: FitEvidenceIndex,
  ): string[] {
    if (requirement.source === 'domain') {
      return evidenceIndex.domains.map(
        (domain) => `Candidate domain: ${domain}`,
      );
    }
    if (requirement.source === 'experience') {
      return evidenceIndex.textEvidence
        .filter((item) =>
          [
            'experience.totalYears',
            'experience.seniority',
            'experience.title',
          ].includes(item.source),
        )
        .map((item) => item.text);
    }
    if (requirement.source !== 'responsibility') return [];

    const related: string[] = [];
    const jdSkills = [
      ...(jdJson.required_skills ?? []),
      ...(jdJson.nice_to_have_skills ?? []),
    ];
    for (const skill of jdSkills) {
      if (!this.textContainsTerm(requirement.text, skill)) continue;
      const skillEvidence =
        evidenceIndex.skillEvidence.get(this.canonicalSkill(skill)) ?? [];
      related.push(...skillEvidence);
    }
    for (const [canonicalSkill, skillEvidence] of evidenceIndex.skillEvidence) {
      if (
        !this.requirementMentionsCanonicalSkill(
          requirement.text,
          canonicalSkill,
        )
      ) {
        continue;
      }
      related.push(...skillEvidence);
    }
    return related;
  }

  private signal(params: {
    requirement: NormalizedJdRequirement;
    status: CoverageStatus;
    evidenceStrength: EvidenceStrength;
    cvEvidence: string[];
    rationale: string;
  }): FitRequirementSignal {
    return {
      requirementId: params.requirement.id,
      requirement: params.requirement.text,
      source: params.requirement.source,
      status: params.status,
      evidenceStrength: params.evidenceStrength,
      cvEvidence: dedupeStrings(params.cvEvidence).slice(0, 5),
      rationale: cleanText(params.rationale),
    };
  }

  private addSkillEvidence(
    skillEvidence: Map<string, string[]>,
    canonicalSkill: string,
    evidence: string,
  ): void {
    const values = skillEvidence.get(canonicalSkill) ?? [];
    values.push(cleanText(evidence));
    skillEvidence.set(canonicalSkill, dedupeStrings(values));
  }

  private createEvidenceItem(
    source: FitEvidenceItem['source'],
    text: string,
    canonicalSkill?: string,
  ): FitEvidenceItem {
    const cleaned = cleanText(text);
    return {
      source,
      text: cleaned,
      canonicalText: canonicalize(cleaned),
      canonicalSkill,
    };
  }

  private normalizeSkillLabel(skill: string): string {
    const cleaned = cleanText(skill);
    return CANONICAL_SKILL_ALIASES[canonicalize(cleaned)] || cleaned;
  }

  private canonicalSkill(skill: string): string {
    return canonicalize(this.normalizeSkillLabel(skill));
  }

  private requirementTerms(requirement: string): string[] {
    const normalized = this.normalizeSkillLabel(requirement);
    const canonicalNormalized = canonicalize(normalized);
    const aliases = Object.entries(CANONICAL_SKILL_ALIASES)
      .filter(([, value]) => canonicalize(value) === canonicalNormalized)
      .map(([alias]) => alias);

    return dedupeStrings([requirement, normalized, ...aliases]).filter(
      (term) => term.length >= 2,
    );
  }

  private textContainsTerm(text: string, term: string): boolean {
    const cleanedTerm = cleanText(term);
    if (!cleanedTerm) return false;
    const escaped = cleanedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#.]|$)`, 'i').test(
      text,
    );
  }

  private requirementMentionsCanonicalSkill(
    requirement: string,
    canonicalSkill: string,
  ): boolean {
    const tokens = canonicalize(requirement).split('_').filter(Boolean);
    return tokens.some(
      (token) =>
        token === canonicalSkill ||
        token.startsWith(`${canonicalSkill}.`) ||
        token.startsWith(`${canonicalSkill}+`) ||
        token.startsWith(`${canonicalSkill}#`),
    );
  }

  private experienceLabel(exp: CvExperience): string {
    const title = cleanText(exp.title) || 'Experience';
    const company = cleanText(exp.company);
    return company ? `${title} at ${company}` : title;
  }

  private hasAmbiguousTimeline(exp: CvExperience): boolean {
    const start = this.parseDate(exp.startDate);
    const end = this.isPresentDate(exp.endDate)
      ? { date: undefined, unreadable: false }
      : this.parseDate(exp.endDate);
    if (start.unreadable || end.unreadable) return true;
    if (start.date && end.date && end.date < start.date) return true;
    return false;
  }

  private parseDate(value?: string): ParsedDate {
    if (!value) return { unreadable: false };
    const cleaned = cleanText(value);
    const iso = cleaned.match(/^(\d{4})-(\d{2})$/);
    if (iso) {
      return {
        date: new Date(Number(iso[1]), Number(iso[2]) - 1),
        unreadable: false,
      };
    }
    const year = cleaned.match(/\b(20\d{2}|19\d{2})\b/);
    if (year) {
      return {
        date: new Date(Number(year[1]), 6),
        unreadable: false,
      };
    }
    return { unreadable: true };
  }

  private isPresentDate(value?: string): boolean {
    return !value || /present|now|current|hiện|hien/i.test(value);
  }

  private hasSeniorityMismatch(cvJson: CvJson, jdJson: JdJson): boolean {
    if (!jdJson.seniority || jdJson.seniority === 'unknown') return false;
    if (!cvJson.seniority || cvJson.seniority === 'unknown') return false;
    return SENIORITY_RANK[cvJson.seniority] < SENIORITY_RANK[jdJson.seniority];
  }

  private hasDomainGap(
    jdDomain: string | undefined,
    cvDomains: string[],
  ): boolean {
    if (!jdDomain || cvDomains.length === 0) return false;
    const jdCanonical = canonicalize(jdDomain);
    if (cvDomains.some((domain) => canonicalize(domain) === jdCanonical)) {
      return false;
    }
    const allDomains = [jdDomain, ...cvDomains].map((domain) =>
      canonicalize(domain),
    );
    if (
      allDomains.some((domain) =>
        SOFTWARE_DOMAIN_TERMS.some((term) =>
          domain.includes(canonicalize(term)),
        ),
      )
    ) {
      return false;
    }
    return true;
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

  private dedupeGaps(gaps: FitGap[]): FitGap[] {
    const seen = new Set<string>();
    return gaps.filter((gap) => {
      const key = `${gap.category}:${canonicalize(gap.relatedRequirement)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private dedupeRiskFlags(riskFlags: FitRiskFlag[]): FitRiskFlag[] {
    const seen = new Set<string>();
    return riskFlags.filter((flag) => {
      if (seen.has(flag.code)) return false;
      seen.add(flag.code);
      return true;
    });
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
