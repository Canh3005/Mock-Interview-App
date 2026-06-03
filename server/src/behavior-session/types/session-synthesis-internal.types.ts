import type { QuestionProbeStage } from '../../question-bank/constants/question-bank-taxonomy.constants';
import type { ProbeRunSummary } from './behavior-session.types';

export interface ProbeRunWithStage {
  run: ProbeRunSummary;
  stage: QuestionProbeStage;
}

export interface LogGroup {
  candidateAnswerQuotes: string[];
  followUpReasons: string[];
}
