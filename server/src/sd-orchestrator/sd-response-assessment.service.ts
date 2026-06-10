import { Injectable, Logger } from '@nestjs/common';
import { GroqService } from '../ai/groq.service';
import type {
  SDClarificationAssessment,
  SDClarificationData,
  SDClarificationTracker,
  SDWalkthroughAssessment,
  SDGraphState,
  SDFlowPath,
  SDWalkthroughTracker,
  SDClarificationLeftoverJson,
  SDDeepDiveAssessment,
  SDProbe,
  SDWrapUpAssessment,
} from './types/sd-orchestrator.types';
import { SD_RESPONSE_ASSESSMENT_GROQ_MODEL } from './constants/sd-assessment.constants';

@Injectable()
export class SDResponseAssessmentService {
  private readonly logger = new Logger(SDResponseAssessmentService.name);

  constructor(private readonly groq: GroqService) {}

  // ─── Stage 1 — Clarification ────────────────────────────────────────────────
  // Implemented in Phase 1

  assessClarification(
    candidateText: string,
    data: SDClarificationData,
    tracker: SDClarificationTracker,
    coverageSignals: Record<string, string[]>,
    context: { language: string; level: string },
  ): Promise<SDClarificationAssessment> {
    void candidateText;
    void data;
    void tracker;
    void coverageSignals;
    void context;
    throw new Error(
      'SDResponseAssessmentService.assessClarification not yet implemented',
    );
  }

  // ─── Stage 2 — Walkthrough ──────────────────────────────────────────────────
  // Implemented in Phase 3

  assessWalkthrough(
    candidateText: string,
    graph: SDGraphState,
    flowPaths: SDFlowPath[],
    tracker: SDWalkthroughTracker,
    clarificationLeftover: SDClarificationLeftoverJson,
    isFirstTurn: boolean,
  ): Promise<SDWalkthroughAssessment> {
    void candidateText;
    void graph;
    void flowPaths;
    void tracker;
    void clarificationLeftover;
    void isFirstTurn;
    throw new Error(
      'SDResponseAssessmentService.assessWalkthrough not yet implemented',
    );
  }

  // ─── Stage 3 — Deep Dive ────────────────────────────────────────────────────
  // Implemented in Phase 4

  assessDeepDive(
    candidateText: string,
    graph: SDGraphState,
    activeProbe: SDProbe,
    cumulativeCoveredSignals: string[],
    clarificationLeftover: SDClarificationLeftoverJson,
  ): Promise<SDDeepDiveAssessment> {
    void candidateText;
    void graph;
    void activeProbe;
    void cumulativeCoveredSignals;
    void clarificationLeftover;
    throw new Error(
      'SDResponseAssessmentService.assessDeepDive not yet implemented',
    );
  }

  // ─── Stage 4 — Wrap-Up ──────────────────────────────────────────────────────
  // Implemented in Phase 5

  assessWrapUp(
    candidateText: string,
    activeScenario: SDProbe,
    clarificationLeftover: SDClarificationLeftoverJson,
  ): Promise<SDWrapUpAssessment> {
    void candidateText;
    void activeScenario;
    void clarificationLeftover;
    throw new Error(
      'SDResponseAssessmentService.assessWrapUp not yet implemented',
    );
  }

  // ─── Shared helper ──────────────────────────────────────────────────────────

  protected async callLLMJson<T>(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<T> {
    const raw = await this.groq.generateJsonContent({
      model: SD_RESPONSE_ASSESSMENT_GROQ_MODEL,
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      config: { systemInstruction: systemPrompt, maxOutputTokens: 800 },
    });
    return JSON.parse(raw) as T;
  }
}
