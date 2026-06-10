import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  SDClarificationData,
  SDFlowPath,
  SDProbe,
} from '../../sd-orchestrator/types/sd-orchestrator.types';

export type SDProblemTargetLevel = 'mid' | 'senior' | 'staff';
export type SDProblemDifficulty = 'medium' | 'hard';

export interface ScalingConstraints {
  peakQPS?: number;
  dau?: number;
  readWriteRatio?: string;
  storageTarget?: string;
  p99Latency?: string;
}

export interface CurveBallScenario {
  trigger: string;
  prompt: string;
  expectedAdaptation: string;
}

export interface ReferenceArchitecture {
  nodes: unknown[];
  edges: unknown[];
}

@Entity('sd_problems')
export class SDProblem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  context!: string | null;

  @Column()
  domain!: string;

  @Column({ type: 'text', array: true, default: [] })
  targetRole!: string[];

  @Column({ type: 'varchar', length: 10 })
  targetLevel!: SDProblemTargetLevel;

  @Column({ type: 'varchar', length: 10 })
  difficulty!: SDProblemDifficulty;

  @Column({ type: 'int' })
  estimatedDuration!: number;

  @Column({ type: 'jsonb', nullable: true })
  scalingConstraints!: ScalingConstraints | null;

  @Column({ type: 'text', array: true, default: [] })
  expectedComponents!: string[];

  @Column({ type: 'jsonb', nullable: true })
  referenceArchitecture!: ReferenceArchitecture | null;

  @Column({ type: 'jsonb', default: [] })
  curveBallScenarios!: CurveBallScenario[];

  @Column({ type: 'jsonb', nullable: true })
  clarificationData!: SDClarificationData | null;

  @Column({ type: 'jsonb', default: [] })
  flowPaths!: SDFlowPath[];

  @Column({ type: 'jsonb', default: [] })
  probeBank!: SDProbe[];

  @Column({ type: 'text', array: true, default: [] })
  tags!: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
