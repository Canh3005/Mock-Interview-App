import type { QuestionProbe } from '../../question-bank/entities/question-probe.entity';

export type ScoredProbe = { probe: QuestionProbe; score: number };

export type ConversationDepthBucket = 'intro' | 'mid_deep';
