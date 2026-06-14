import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NSDProblem } from '../../nsd-problem/entities/nsd-problem.entity';
import { InterviewSession } from '../../interview/entities/interview-session.entity';
import type {
  NSDPhase,
  NSDSessionStatus,
  NSDCanvasState,
  NSDPhase1Progress,
  NSDPhase2Progress,
  NSDPhase3Progress,
  NSDPhase4Progress,
  NSDPhase5Progress,
  NSDEvaluationResult,
} from '../../nsd-orchestrator/types/nsd.types';

@Entity('nsd_sessions')
export class NSDSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  interviewSessionId!: string;

  @Column({ type: 'uuid' })
  problemId!: string;

  @ManyToOne(() => NSDProblem, { eager: false })
  @JoinColumn({ name: 'problemId' })
  problem!: NSDProblem;

  @ManyToOne(() => InterviewSession, { eager: false })
  @JoinColumn({ name: 'interviewSessionId' })
  interviewSession!: InterviewSession;

  @Column({ type: 'varchar', length: 30, default: 'PHASE_1_FR' })
  phase!: NSDPhase;

  @Column({ type: 'varchar', length: 20, default: 'IN_PROGRESS' })
  status!: NSDSessionStatus;

  // Shared canvas for Phase 4 + Phase 5
  @Column({ type: 'jsonb', nullable: true })
  canvasJSON!: NSDCanvasState | null;

  // Per-phase progress — separate columns for type-safe access, null until phase starts
  @Column({ type: 'jsonb', nullable: true })
  phase1Progress!: NSDPhase1Progress | null;

  @Column({ type: 'jsonb', nullable: true })
  phase2Progress!: NSDPhase2Progress | null;

  @Column({ type: 'jsonb', nullable: true })
  phase3Progress!: NSDPhase3Progress | null;

  @Column({ type: 'jsonb', nullable: true })
  phase4Progress!: NSDPhase4Progress | null;

  @Column({ type: 'jsonb', nullable: true })
  phase5Progress!: NSDPhase5Progress | null;

  @Column({ type: 'jsonb', nullable: true })
  evaluationResult!: NSDEvaluationResult | null;

  @Column({ type: 'timestamptz', nullable: true })
  phaseStartedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
