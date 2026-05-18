import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InterviewSession } from '../../interview/entities/interview-session.entity';
import type {
  ActiveProbeSession,
  InterviewState,
  RenderedFollowUpsMap,
  RenderedQuestionsMap,
  StageProgress,
} from '../../behavior-session/types/behavior-session.types';

export type CandidateLevel = 'junior' | 'mid' | 'senior';
export type BehavioralSessionStatus = 'IN_PROGRESS' | 'SCORING' | 'COMPLETED';
export type BehavioralSessionMode = 'legacy' | 'probe_based';

@Entity('behavioral_sessions')
export class BehavioralSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  interviewSessionId: string;

  @ManyToOne(() => InterviewSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'interviewSessionId' })
  interviewSession: InterviewSession;

  @Column({ type: 'varchar', length: 10 })
  candidateLevel: CandidateLevel;

  @Column({ type: 'int', default: 1 })
  currentStage: number;

  @Column({ type: 'varchar', length: 20, default: 'IN_PROGRESS' })
  status: BehavioralSessionStatus;

  @Column({ type: 'jsonb', nullable: true })
  finalScore: Record<string, unknown> | null;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  // { "1": ["CULT_LEARNING", "CULT_CONFLICT"], "2": ["TECH_UNDERSTANDING"], ... }
  @Column({ type: 'jsonb', default: {} })
  coveredCompetencies: Record<string, string[]>;

  // { "1": "Stage 1 summary...", "2": "Stage 2 summary...", ... }
  @Column({ type: 'jsonb', default: {} })
  stageSummaries: Record<string, string>;

  // --- Columns dành riêng cho sessionMode = 'probe_based' (F032) ---
  // Tất cả nullable để không break sessions legacy

  @Column({ type: 'varchar', length: 15, default: 'legacy' })
  sessionMode: BehavioralSessionMode;

  @Column({ type: 'uuid', nullable: true })
  planId: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  interviewState: InterviewState | null;

  @Column({ type: 'int', default: 0 })
  currentStageIndex: number;

  @Column({ type: 'int', default: 0 })
  currentProbeIndex: number;

  @Column({ type: 'jsonb', nullable: true })
  stageProgress: StageProgress[] | null;

  @Column({ type: 'jsonb', nullable: true })
  activeProbeSession: ActiveProbeSession | null;

  /** probeId → rendered question text, pre-rendered tại session init */
  @Column({ type: 'jsonb', nullable: true })
  renderedQuestions: RenderedQuestionsMap | null;

  /** `${probeId}:${trigger}` → rendered follow-up/challenge text */
  @Column({ type: 'jsonb', nullable: true })
  renderedFollowUps: RenderedFollowUpsMap | null;

  /** Counter tăng dần cho mỗi InterviewTurn trong session này */
  @Column({ type: 'int', default: 0 })
  globalTurnCounter: number;
}
