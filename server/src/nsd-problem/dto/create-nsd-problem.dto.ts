import type {
  NSDPhase1Data,
  NSDPhase2Data,
  NSDPhase3Data,
  NSDPhase4Data,
  NSDPhase5Data,
} from '../../nsd-orchestrator/types/nsd.types';
import type { NSDProblemTargetLevel } from '../entities/nsd-problem.entity';

export class CreateNSDProblemDto {
  title!: string;
  domain!: string;
  targetLevel!: NSDProblemTargetLevel;
  estimatedDurationMinutes!: number;
  tags?: string[];
  isActive?: boolean;
  phase1Data?: NSDPhase1Data;
  phase2Data?: NSDPhase2Data;
  phase3Data?: NSDPhase3Data;
  phase4Data?: NSDPhase4Data;
  phase5Data?: NSDPhase5Data;
}
