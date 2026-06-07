import { Injectable, Logger } from '@nestjs/common';
import { GroqService } from '../ai/groq.service';
import type {
  StructuredClaim,
  EnrichedClaimOutput,
  ClaimEnrichment,
  SeededRisk,
  RiskEnrichmentOutput,
  SeededRiskEnrichment,
  AdditionalRisk,
  HiringRiskType,
} from './types/behavior-calibration.types';
import { DOCUMENT_FIT_ASSESSMENT_MODEL } from './constants/document-ai.constants';
import {
  CLAIM_ENRICHMENT_INSTRUCTION,
  RISK_ENRICHMENT_INSTRUCTION,
} from './prompts/behavior-calibration.prompts';
import type { JdJson } from './types/document-ai.types';

const VALID_CLAIM_TYPES = new Set([
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

const ADDITIONAL_RISK_TYPES = new Set<HiringRiskType>([
  'overstated_ownership',
  'missing_business_impact',
  'weak_conflict_handling',
  'generic_answering',
  'poor_tradeoff_reasoning',
  'low_learning_agility',
  'communication_gap',
]);

@Injectable()
export class BehaviorCalibrationAiService {
  private readonly logger = new Logger(BehaviorCalibrationAiService.name);

  constructor(private readonly groq: GroqService) {}

  async enrichCandidateClaims(
    structuredClaims: StructuredClaim[],
    jdJson?: JdJson,
  ): Promise<EnrichedClaimOutput> {
    this.logger.log('BC-2: Enriching candidate claims via LLM...');

    const claimInputs = structuredClaims.map((c) => ({
      localId: c.localId,
      claimText: c.claimText,
      techContext: c.techContext,
    }));

    const parts: string[] = [
      `Claims to enrich:\n${JSON.stringify(claimInputs, null, 2)}`,
    ];
    if (jdJson) {
      parts.push(
        `JD context (role/level awareness only):\n${JSON.stringify(
          {
            role: jdJson.role,
            seniority: jdJson.seniority,
            requiredCompetencies: jdJson.requiredCompetencies,
          },
          null,
          2,
        )}`,
      );
    }

    const result = await this.groq.generateJsonContent({
      model: DOCUMENT_FIT_ASSESSMENT_MODEL,
      contents: [{ role: 'user', parts: [{ text: parts.join('\n\n') }] }],
      config: {
        systemInstruction: CLAIM_ENRICHMENT_INSTRUCTION,
        maxOutputTokens: 4096,
      },
    });

    return this._parseClaimEnrichmentOutput(result, structuredClaims);
  }

  async enrichAndExtendRisks(
    seededRisks: SeededRisk[],
    enrichedClaims: {
      localId: string;
      claimText: string;
      impliedCompetencies?: string[];
    }[],
    jdJson?: JdJson,
  ): Promise<RiskEnrichmentOutput> {
    this.logger.log(
      'BC-4: Enriching risks and detecting additional behavioral risks via LLM...',
    );

    const claimInputs = enrichedClaims.map((c) => ({
      localId: c.localId,
      claimText: c.claimText,
      impliedCompetencies: c.impliedCompetencies ?? [],
    }));

    const seededInput = seededRisks.map((r) => ({
      localRiskId: r.localRiskId,
      riskType: r.riskType,
      rationale: r.rationale,
    }));

    const parts: string[] = [
      `Seeded risks:\n${JSON.stringify(seededInput, null, 2)}`,
      `Candidate claims:\n${JSON.stringify(claimInputs, null, 2)}`,
    ];
    if (jdJson) {
      parts.push(
        `JD context:\n${JSON.stringify(
          {
            role: jdJson.role,
            seniority: jdJson.seniority,
            requiredCompetencies: jdJson.requiredCompetencies,
          },
          null,
          2,
        )}`,
      );
    }

    const result = await this.groq.generateJsonContent({
      model: DOCUMENT_FIT_ASSESSMENT_MODEL,
      contents: [{ role: 'user', parts: [{ text: parts.join('\n\n') }] }],
      config: {
        systemInstruction: RISK_ENRICHMENT_INSTRUCTION,
        maxOutputTokens: 4096,
      },
    });

    return this._parseRiskEnrichmentOutput(result);
  }

  private _parseClaimEnrichmentOutput(
    raw: string,
    structuredClaims: StructuredClaim[],
  ): EnrichedClaimOutput {
    const localIdSet = new Set(structuredClaims.map((c) => c.localId));
    try {
      const parsed = JSON.parse(raw || '{}') as { enrichments?: unknown[] };
      const enrichments: ClaimEnrichment[] = (parsed.enrichments ?? [])
        .filter(
          (e): e is Record<string, unknown> =>
            !!e &&
            typeof e === 'object' &&
            typeof (e as Record<string, unknown>).localId === 'string' &&
            localIdSet.has((e as Record<string, unknown>).localId as string),
        )
        .map((e) => ({
          localId: e.localId as string,
          claimType: VALID_CLAIM_TYPES.has(String(e.claimType))
            ? (e.claimType as ClaimEnrichment['claimType'])
            : 'domain_experience',
          impliedCompetencies: Array.isArray(e.impliedCompetencies)
            ? (e.impliedCompetencies as ClaimEnrichment['impliedCompetencies'])
            : [],
          riskTags: Array.isArray(e.riskTags) ? (e.riskTags as string[]) : [],
          suggestedQuestions: Array.isArray(e.suggestedQuestions)
            ? (e.suggestedQuestions as string[]).filter(
                (q) => typeof q === 'string' && q.trim().length > 0,
              )
            : [],
        }));
      return { enrichments };
    } catch {
      this.logger.warn(
        'BC-2: Failed to parse claim enrichment output — returning empty enrichments',
      );
      return { enrichments: [] };
    }
  }

  private _parseRiskEnrichmentOutput(raw: string): RiskEnrichmentOutput {
    try {
      const parsed = JSON.parse(raw || '{}') as {
        seededRiskEnrichments?: unknown[];
        additionalRisks?: unknown[];
        userFacingSummary?: {
          focusAreas?: unknown[];
          evidenceToPrep?: unknown[];
        };
      };

      const seededRiskEnrichments: SeededRiskEnrichment[] = (
        parsed.seededRiskEnrichments ?? []
      )
        .filter(
          (e): e is Record<string, unknown> =>
            !!e &&
            typeof e === 'object' &&
            typeof (e as Record<string, unknown>).localRiskId === 'string',
        )
        .map((e) => ({
          localRiskId: e.localRiskId as string,
          suggestedProbeFocus: Array.isArray(e.suggestedProbeFocus)
            ? (e.suggestedProbeFocus as string[])
            : [],
        }));

      const additionalRisks: AdditionalRisk[] = (parsed.additionalRisks ?? [])
        .filter(
          (h): h is Record<string, unknown> =>
            !!h &&
            typeof h === 'object' &&
            typeof (h as Record<string, unknown>).riskType === 'string' &&
            ADDITIONAL_RISK_TYPES.has(
              (h as Record<string, unknown>).riskType as HiringRiskType,
            ),
        )
        .map((h) => ({
          riskType: h.riskType as HiringRiskType,
          candidateClaimLocalId:
            typeof h.candidateClaimLocalId === 'string'
              ? h.candidateClaimLocalId
              : '',
          rationale: typeof h.rationale === 'string' ? h.rationale.trim() : '',
          suggestedProbeFocus: Array.isArray(h.suggestedProbeFocus)
            ? (h.suggestedProbeFocus as string[])
            : [],
        }));

      const summary = parsed.userFacingSummary ?? {};
      return {
        seededRiskEnrichments,
        additionalRisks,
        userFacingSummary: {
          focusAreas: Array.isArray(summary.focusAreas)
            ? (summary.focusAreas as string[])
            : [],
          evidenceToPrep: Array.isArray(summary.evidenceToPrep)
            ? (summary.evidenceToPrep as string[])
            : [],
        },
      };
    } catch {
      this.logger.warn('BC-4: Failed to parse risk enrichment output');
      return {
        seededRiskEnrichments: [],
        additionalRisks: [],
        userFacingSummary: { focusAreas: [], evidenceToPrep: [] },
      };
    }
  }
}
