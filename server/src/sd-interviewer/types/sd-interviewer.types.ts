import type { SDPhase } from '../../sd-session/entities/sd-session.entity';

export interface TranscriptEntry {
  role: 'user' | 'ai' | 'summary' | 'system-trigger';
  content: string;
  timestamp: string;
  phase: SDPhase;
}

export interface ArchitectureJSON {
  nodes: { type: string }[];
  edges: unknown[];
}
