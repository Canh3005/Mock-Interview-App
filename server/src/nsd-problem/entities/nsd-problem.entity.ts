import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  NSDPhase1Data,
  NSDPhase2Data,
  NSDPhase3Data,
  NSDPhase4Data,
  NSDPhase5Data,
} from '../../nsd-orchestrator/types/nsd.types';

export type NSDProblemTargetLevel = 'mid' | 'senior' | 'staff';

@Entity('nsd_problems')
export class NSDProblem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column()
  domain!: string;

  @Column({ type: 'varchar', length: 10 })
  targetLevel!: NSDProblemTargetLevel;

  @Column({ type: 'int' })
  estimatedDurationMinutes!: number;

  @Column({ type: 'text', array: true, default: [] })
  tags!: string[];

  @Column({ default: true })
  isActive!: boolean;

  // 5 separate JSONB columns — partial update per phase, null for incomplete problems
  @Column({ type: 'jsonb', nullable: true })
  phase1Data!: NSDPhase1Data | null;

  @Column({ type: 'jsonb', nullable: true })
  phase2Data!: NSDPhase2Data | null;

  @Column({ type: 'jsonb', nullable: true })
  phase3Data!: NSDPhase3Data | null;

  @Column({ type: 'jsonb', nullable: true })
  phase4Data!: NSDPhase4Data | null;

  @Column({ type: 'jsonb', nullable: true })
  phase5Data!: NSDPhase5Data | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
