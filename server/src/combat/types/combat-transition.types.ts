export type TransitionReason =
  | 'TIME_BUDGET_EXCEEDED'
  | 'MAX_TURNS_REACHED'
  | 'OFF_TOPIC_PERSISTENT'
  | 'CANDIDATE_CEILING';

export interface TransitionDecision {
  shouldTransition: boolean;
  reason?: TransitionReason;
  nextStage?: number;
  transitionPhrase?: string;
}
