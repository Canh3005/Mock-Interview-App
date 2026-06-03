import type {
  CoverageStatus,
  EvidenceStrength,
  FitRiskFlag,
} from '../types/fit-assessment.types';

export const FIT_ASSESSMENT_SCORING_VERSION = 'fit-assessment-v2.0.0';

export const STATUS_SCORE: Record<CoverageStatus, number> = {
  met: 100,
  partial: 60,
  unclear: 30,
  missing: 0,
};

export const EVIDENCE_SCORE: Record<EvidenceStrength, number> = {
  strong: 100,
  weak: 50,
  none: 0,
};

export const RISK_PENALTY: Record<FitRiskFlag['severity'], number> = {
  high: 10,
  medium: 5,
  low: 2,
};

export const CANONICAL_SKILL_ALIASES: Record<string, string> = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  node: 'Node.js',
  nodejs: 'Node.js',
  'node.js': 'Node.js',
  reactjs: 'React',
  'react.js': 'React',
};
