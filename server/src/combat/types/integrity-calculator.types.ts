export type AdjustmentType = 'mitigation' | 'aggravation';

export interface CorrelationAdjustment {
  type: AdjustmentType;
  points: number;
  reason: string;
}
