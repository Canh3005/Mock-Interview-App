import type { QuestionProbe } from '../../question-bank/entities/question-probe.entity';
import type { SessionPlanningRagSignal } from '../rag/session-planning-rag.types';

export type ScoredProbe = {
  probe: QuestionProbe;
  score: number;
  personalizedQuestion?: string;
  ragSignal?: SessionPlanningRagSignal;
};

export type ConversationDepthBucket = 'intro' | 'mid_deep';
