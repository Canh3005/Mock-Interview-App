export type SessionPlanningRagSource =
  | 'profile_focus'
  | 'claim_verification'
  | 'risk_rejection';

export interface SessionPlanningRagSignal {
  similarity: number;
  source: SessionPlanningRagSource;
  queryLabel: string;
  reason: string;
}

export interface SessionPlanningRagQuerySource {
  source: SessionPlanningRagSource;
  label: string;
  text: string;
}
