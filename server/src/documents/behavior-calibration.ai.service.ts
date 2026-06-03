import { Injectable, Logger } from '@nestjs/common';
import { GroqService } from '../ai/groq.service';
import type {
  ClaimMiningOutput,
  BehavioralRiskOutput,
  SeededRisk,
  RawCandidateClaim,
  RawBehavioralRisk,
} from './types/behavior-calibration.types';
import type { FitAssessmentV2 } from './types/fit-assessment.types';
import { DOCUMENT_FIT_ASSESSMENT_MODEL } from './constants/document-ai.constants';
import {
  BEHAVIORAL_RISK_INSTRUCTION,
  CLAIM_MINING_INSTRUCTION,
} from './prompts/behavior-calibration.prompts';
import type { CvJson, JdJson } from './types/document-ai.types';

@Injectable()
export class BehaviorCalibrationAiService {
  private readonly logger = new Logger(BehaviorCalibrationAiService.name);

  constructor(private readonly groq: GroqService) {}

  async extractCandidateClaims({
    cvJson,
    jdJson,
    fitEvidenceHints,
  }: {
    cvJson: CvJson;
    jdJson?: JdJson;
    fitEvidenceHints?: string[];
  }): Promise<ClaimMiningOutput> {
    this.logger.log('BC-3: Extracting candidate claims via LLM...');

    const parts: string[] = [
      `CV structured data:\n${JSON.stringify(cvJson, null, 2)}`,
    ];
    if (jdJson) {
      parts.push(
        `JD context (for role/level awareness only — claims must come from CV):\n${JSON.stringify(jdJson, null, 2)}`,
      );
    }
    if (fitEvidenceHints?.length) {
      parts.push(
        `Pre-extracted evidence hints from fit assessment:\n${fitEvidenceHints.slice(0, 20).join('\n')}`,
      );
    }

    const result = await this.groq.generateJsonContent({
      model: DOCUMENT_FIT_ASSESSMENT_MODEL,
      contents: [{ role: 'user', parts: [{ text: parts.join('\n\n') }] }],
      config: {
        systemInstruction: CLAIM_MINING_INSTRUCTION,
        maxOutputTokens: 6144,
      },
    });

    return this._parseClaimMiningOutput(result);
  }

  async generateBehavioralRisks({
    claims,
    seededRisks,
    jdJson,
  }: {
    claims: RawCandidateClaim[];
    seededRisks: SeededRisk[];
    jdJson?: JdJson;
  }): Promise<BehavioralRiskOutput> {
    this.logger.log('BC-4b: Generating behavioral risks via LLM...');

    const parts: string[] = [
      `Candidate claims (from CV):\n${JSON.stringify(claims, null, 2)}`,
      `Already seeded risks (DO NOT duplicate these):\n${JSON.stringify(
        seededRisks.map((r) => r.riskType),
        null,
        2,
      )}`,
    ];
    if (jdJson) {
      parts.push(`JD context:\n${JSON.stringify(jdJson, null, 2)}`);
    }

    const result = await this.groq.generateJsonContent({
      model: DOCUMENT_FIT_ASSESSMENT_MODEL,
      contents: [{ role: 'user', parts: [{ text: parts.join('\n\n') }] }],
      config: {
        systemInstruction: BEHAVIORAL_RISK_INSTRUCTION,
        maxOutputTokens: 4096,
      },
    });

    return this._parseBehavioralRiskOutput(result);
  }

  private _parseClaimMiningOutput(raw: string): ClaimMiningOutput {
    try {
      const parsed = JSON.parse(raw || '{}') as Partial<ClaimMiningOutput>;
      const validClaimTypes = new Set([
        'led_team',
        'owned_feature',
        'improved_metric',
        'handled_incident',
        'cross_functional',
        'mentored',
        'conflict',
        'failure',
        'domain_experience',
      ]);
      const claims = (parsed.claims ?? [])
        .filter(
          (c): c is RawCandidateClaim =>
            !!c.claimType && validClaimTypes.has(c.claimType),
        )
        .map((c) => ({
          ...c,
          claimText: String(c.claimText || '').trim(),
          normalizedClaim: String(c.normalizedClaim || '').trim(),
          impliedCompetencies: Array.isArray(c.impliedCompetencies)
            ? c.impliedCompetencies
            : [],
          evidenceHints: Array.isArray(c.evidenceHints) ? c.evidenceHints : [],
          techContext: Array.isArray(c.techContext) ? c.techContext : [],
          riskTags: Array.isArray(c.riskTags) ? c.riskTags : [],
          sourceRef: c.sourceRef ?? { section: 'unknown' },
          sourceType: c.sourceType ?? 'cv',
        }));
      return {
        miningConfidence: this._normalizeConfidence(parsed.miningConfidence),
        claims,
        unmappedSignals: Array.isArray(parsed.unmappedSignals)
          ? parsed.unmappedSignals
          : [],
      };
    } catch {
      this.logger.warn('BC-3: Failed to parse claim mining output');
      return { miningConfidence: 'low', claims: [], unmappedSignals: [] };
    }
  }

  private _parseBehavioralRiskOutput(raw: string): BehavioralRiskOutput {
    try {
      const parsed = JSON.parse(raw || '{}') as Partial<BehavioralRiskOutput>;
      const validBehavioralRiskTypes = new Set([
        'overstated_ownership',
        'missing_business_impact',
        'weak_conflict_handling',
        'generic_answering',
        'poor_tradeoff_reasoning',
        'low_learning_agility',
        'communication_gap',
      ]);
      const hypotheses = (parsed.hypotheses ?? [])
        .filter(
          (h): h is RawBehavioralRisk =>
            !!h.riskType && validBehavioralRiskTypes.has(h.riskType),
        )
        .map((h) => ({
          ...h,
          rationale: String(h.rationale || '').trim(),
          relatedCompetencies: Array.isArray(h.relatedCompetencies)
            ? h.relatedCompetencies
            : [],
          suggestedProbeFocus: Array.isArray(h.suggestedProbeFocus)
            ? h.suggestedProbeFocus
            : [],
        }));
      const summary = parsed.userFacingSummary ?? {
        focusAreas: [],
        evidenceToPrep: [],
      };
      return {
        hypotheses,
        priorityCompetencies: Array.isArray(parsed.priorityCompetencies)
          ? parsed.priorityCompetencies
          : [],
        calibrationNotes: Array.isArray(parsed.calibrationNotes)
          ? parsed.calibrationNotes
          : [],
        userFacingSummary: {
          focusAreas: Array.isArray(summary.focusAreas)
            ? summary.focusAreas
            : [],
          evidenceToPrep: Array.isArray(summary.evidenceToPrep)
            ? summary.evidenceToPrep
            : [],
          missingDataWarning: summary.missingDataWarning ?? undefined,
        },
      };
    } catch {
      this.logger.warn('BC-4b: Failed to parse behavioral risk output');
      return {
        hypotheses: [],
        priorityCompetencies: [],
        calibrationNotes: ['behavioral_risk_generation_failed'],
        userFacingSummary: { focusAreas: [], evidenceToPrep: [] },
      };
    }
  }

  private _normalizeConfidence(value?: string): 'high' | 'medium' | 'low' {
    if (value === 'high' || value === 'medium' || value === 'low') return value;
    return 'low';
  }

  buildFitEvidenceHints(fitAssessment: FitAssessmentV2): string[] {
    return fitAssessment.requirementSignals
      .flatMap((s) => s.cvEvidence ?? [])
      .filter(Boolean)
      .slice(0, 20);
  }
}
