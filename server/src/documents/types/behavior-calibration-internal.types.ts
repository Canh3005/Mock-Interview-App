// ─── Static level expectation lookup ─────────────────────────────────────────
export type LevelKey = 'junior' | 'mid' | 'senior';

export interface LevelExpectationEntry {
  mustHaveSignals: string[];
  dealBreakers: string[];
  depthRequirement: string;
}
