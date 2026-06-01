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
  SDCurveball,
} from './types/sd-orchestrator.types';

const GROQ_MODEL = 'llama-3.3-70b-versatile';

@Injectable()
export class SDResponseAssessmentService {
  private readonly logger = new Logger(SDResponseAssessmentService.name);

  constructor(private readonly groq: GroqService) {}

  // ─── Stage 1 — Clarification ────────────────────────────────────────────────
  // Implemented in Phase 1

  async assessClarification(
    _candidateText: string,
    _data: SDClarificationData,
    _tracker: SDClarificationTracker,
    _coverageSignals: Record<string, string[]>,
    _context: { language: string; level: string },
  ): Promise<SDClarificationAssessment> {
    throw new Error(
      'SDResponseAssessmentService.assessClarification not yet implemented',
    );
  }

  // ─── Stage 2 — Walkthrough ──────────────────────────────────────────────────
  // Implemented in Phase 3

  async assessWalkthrough(
    _candidateText: string,
    _graph: SDGraphState,
    _flowPaths: SDFlowPath[],
    _tracker: SDWalkthroughTracker,
    _clarificationLeftover: SDClarificationLeftoverJson,
    _isFirstTurn: boolean,
  ): Promise<SDWalkthroughAssessment> {
    throw new Error(
      'SDResponseAssessmentService.assessWalkthrough not yet implemented',
    );
  }

  // ─── Stage 3 — Deep Dive ────────────────────────────────────────────────────
  // Implemented in Phase 4

  async assessDeepDive(
    _candidateText: string,
    _graph: SDGraphState,
    _activeProbe: SDProbe,
    _cumulativeCoveredSignals: string[],
    _clarificationLeftover: SDClarificationLeftoverJson,
  ): Promise<SDDeepDiveAssessment> {
    throw new Error(
      'SDResponseAssessmentService.assessDeepDive not yet implemented',
    );
  }

  // ─── Stage 4 — Wrap-Up ──────────────────────────────────────────────────────
  // Implemented in Phase 5

  async assessWrapUp(
    _candidateText: string,
    _activeScenario: SDCurveball | SDProbe,
    _currentGraph: SDGraphState,
    _baseGraph: SDGraphState,
    _clarificationLeftover: SDClarificationLeftoverJson,
  ): Promise<SDWrapUpAssessment> {
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
      model: GROQ_MODEL,
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      config: { systemInstruction: systemPrompt, maxOutputTokens: 800 },
    });
    return JSON.parse(raw) as T;
  }
}
