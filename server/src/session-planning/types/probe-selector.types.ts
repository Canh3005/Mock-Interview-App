import type { QuestionProbe } from '../../question-bank/entities/question-probe.entity';

export type ScoredProbe = {
  probe: QuestionProbe;
  score: number;
  personalizedQuestion?: string;
};

export type ConversationDepthBucket = 'intro' | 'mid_deep';
