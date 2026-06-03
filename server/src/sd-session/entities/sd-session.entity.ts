import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SDProblem } from '../../sd-problem/entities/sd-problem.entity';

export type SDPhase =
  | 'CLARIFICATION'
  | 'DESIGN_DRAWING'
  | 'DESIGN_WALKTHROUGH'
  | 'DEEP_DIVE'
  | 'WRAP_UP'
  | 'EVALUATING'
  | 'COMPLETED';

export type SDSessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';

@Entity('sd_sessions')
export class SDSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  interviewSessionId!: string;

  @Column({ type: 'uuid' })
  problemId!: string;

  @ManyToOne(() => SDProblem, { eager: false })
  @JoinColumn({ name: 'problemId' })
  problem!: SDProblem;

  @Column({ type: 'varchar', length: 20, default: 'CLARIFICATION' })
  phase!: SDPhase;

  @Column({ type: 'boolean', default: true })
  enableCurveball!: boolean;

  @Column({ type: 'varchar', length: 20, default: 'mid', nullable: true })
  targetLevel!: string;

  @Column({ type: 'varchar', length: 5, default: 'vi' })
  language!: string; // 'vi' | 'en' | 'ja'

  @Column({ type: 'int' })
  durationMinutes!: number;

  @Column({ type: 'jsonb', nullable: true })
  architectureJSON!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', default: [] })
  transcriptHistory!: Record<string, unknown>[];

  @Column({ type: 'varchar', length: 20, default: 'IN_PROGRESS' })
  status!: SDSessionStatus;

  @Column({ type: 'int', default: 0 })
  hintsUsed!: number;

  @Column({ type: 'timestamptz', nullable: true })
  curveballInjectedAt!: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  curveballArchitectureSnapshot!: { nodes: unknown[]; edges: unknown[] } | null;

  @Column({ type: 'jsonb', nullable: true })
  stageState!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  evaluationResult!: Record<string, unknown> | null;

  @Column({ type: 'timestamptz', nullable: true })
  stageStartedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
