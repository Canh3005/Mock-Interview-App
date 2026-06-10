import { Injectable, Logger } from '@nestjs/common';
import { GroqService } from '../../ai/groq.service';
import type {
  SDWrapUpAssessment,
  SDWrapUpIntentContext,
  SDProbe,
  SDClarificationLeftoverJson,
  SDCandidateIntent,
} from '../types/sd-orchestrator.types';
import { SD_ASSESSOR_GROQ_MODEL } from '../constants/sd-assessment.constants';
import type { LLMWrapUpOutput } from '../types/sd-assessment-llm.types';

@Injectable()
export class SDWrapUpAssessorService {
  private readonly logger = new Logger(SDWrapUpAssessorService.name);

  constructor(private readonly groq: GroqService) {}

  async assess(
    candidateText: string,
    activeScenario: SDProbe,
    clarificationLeftover: SDClarificationLeftoverJson,
    intentContext?: SDWrapUpIntentContext,
  ): Promise<SDWrapUpAssessment> {
    const systemPrompt = this._buildSystemPrompt(
      activeScenario,
      clarificationLeftover,
      intentContext,
    );
    const userPrompt = `Candidate said: "${candidateText}"\n\nRespond with JSON only.`;

    try {
      const raw = await this.groq.generateJsonContent({
        model: SD_ASSESSOR_GROQ_MODEL,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: { systemInstruction: systemPrompt, maxOutputTokens: 600 },
      });
      const parsed = JSON.parse(raw) as LLMWrapUpOutput;
      return this._mapToAssessment(parsed);
    } catch (err) {
      this.logger.warn(`Wrap-up assessor error: ${(err as Error).message}`);
      return this._fallbackAssessment();
    }
  }

  private _buildSystemPrompt(
    scenario: SDProbe,
    leftover: SDClarificationLeftoverJson,
    intentContext?: SDWrapUpIntentContext,
  ): string {
    const clarifiedFacts = leftover.requirementContract.disclosedFacts
      .map((f) => `${f.key}: ${f.value}`)
      .join(', ');

    const intentContextSection = intentContext
      ? this._buildIntentContextSection(intentContext)
      : '';

    return `You are an AI assessor for a system design wrap-up/scenario interview round.
${intentContextSection}
# Scenario being assessed
${scenario.primaryQuestionTemplate}

# Expected mitigations (natural phrases to listen for)
${scenario.expectedSignals.join(', ')}

# Red flags to watch for
${scenario.redFlags.join(', ')}

# Clarified requirements (original design constraints)
${clarifiedFacts || 'None'}

# Instructions
Analyze the candidate response and output JSON:
- candidateIntent: one of ['direct_answer', 'clarification_question', 'dont_know', 'off_topic']
- blastRadiusRecognized: candidate acknowledged who/what is affected and for how long.
- mitigationProposed: candidate proposed a concrete mitigation or adaptation.
- consistencyWithOriginalDesign: candidate's answer is consistent with their clarified requirements and original design decisions (does not introduce contradictions).
- mentionedMitigations: array of mitigation strings from the expected mitigations list that the candidate demonstrated IN THIS TURN. Use natural phrase matching.
- failureReasoning: 0.0-1.0 — quality of reasoning about failure modes.
- adaptationQuality: 0.0-1.0 — quality of proposed adaptations.
- curveballHandling: 0.0-1.0 — overall handling of the scenario.
- riskPrioritization: 0.0-1.0 — candidate prioritizes the right risks.
- consistencyScore: 0.0-1.0 — consistency with original design (1.0 = fully consistent).
- redFlags: array of red flag strings triggered.

Respond with raw JSON only. No markdown.`;
  }

  private _buildIntentContextSection({
    intentType,
    followUpReason,
    challengeDetail,
  }: SDWrapUpIntentContext): string {
    if (intentType === 'SCENARIO_CHALLENGE' && challengeDetail) {
      return (
        `\n# Current turn context\n` +
        `This turn is a CHALLENGE: "${challengeDetail}".\n` +
        `Focus assessment on whether the candidate adequately reconciles this with their original design.\n` +
        `Set redFlags to empty only if the candidate clearly resolves the contradiction.\n`
      );
    }
    if (intentType === 'SCENARIO_FOLLOW_UP' && followUpReason) {
      let hint: string;
      if (followUpReason === 'blastRadius') {
        hint = 'Pay particular attention to blastRadiusRecognized.';
      } else if (followUpReason === 'mitigation') {
        hint = 'Pay particular attention to mitigationProposed.';
      } else if (followUpReason === 'consistency') {
        hint = 'Pay particular attention to consistencyWithOriginalDesign.';
      } else {
        hint =
          'Assess whether the candidate gave a concrete, specific answer this turn.';
      }
      return (
        `\n# Current turn context\n` +
        `This turn is a FOLLOW-UP (reason: ${followUpReason}).\n` +
        `${hint}\n`
      );
    }
    return '';
  }

  private _mapToAssessment(parsed: LLMWrapUpOutput): SDWrapUpAssessment {
    const candidateIntent = this._toCandidateIntent(
      parsed.candidateIntent,
      'direct_answer',
    );
    return {
      candidateIntent,
      signals: {
        blastRadiusRecognized: Boolean(parsed.blastRadiusRecognized),
        mitigationProposed: Boolean(parsed.mitigationProposed),
        consistencyWithOriginalDesign: Boolean(
          parsed.consistencyWithOriginalDesign,
        ),
        mentionedMitigations: Array.isArray(parsed.mentionedMitigations)
          ? parsed.mentionedMitigations
          : [],
      },
      scoreDelta: {
        failureReasoning: Math.max(
          0,
          Math.min(1, parsed.failureReasoning ?? 0.3),
        ),
        adaptationQuality: Math.max(
          0,
          Math.min(1, parsed.adaptationQuality ?? 0.3),
        ),
        curveballHandling: Math.max(
          0,
          Math.min(1, parsed.curveballHandling ?? 0.3),
        ),
        riskPrioritization: Math.max(
          0,
          Math.min(1, parsed.riskPrioritization ?? 0.3),
        ),
        consistencyWithOriginalDesign: Math.max(
          0,
          Math.min(1, parsed.consistencyScore ?? 0.5),
        ),
      },
      redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
    };
  }

  private _toCandidateIntent(
    value: string,
    fallback: SDCandidateIntent,
  ): SDCandidateIntent {
    const validIntents: SDCandidateIntent[] = [
      'clarification_question',
      'requirement_summary',
      'architecture_walkthrough',
      'direct_answer',
      'dont_know',
      'off_topic',
      'ready_to_continue',
      'solution_leap',
    ];
    return validIntents.includes(value as SDCandidateIntent)
      ? (value as SDCandidateIntent)
      : fallback;
  }

  private _fallbackAssessment(): SDWrapUpAssessment {
    return {
      candidateIntent: 'direct_answer',
      signals: {
        blastRadiusRecognized: false,
        mitigationProposed: false,
        consistencyWithOriginalDesign: true,
        mentionedMitigations: [],
      },
      scoreDelta: {
        failureReasoning: 0.3,
        adaptationQuality: 0.3,
        curveballHandling: 0.3,
        riskPrioritization: 0.3,
        consistencyWithOriginalDesign: 0.5,
      },
      redFlags: [],
    };
  }
}
