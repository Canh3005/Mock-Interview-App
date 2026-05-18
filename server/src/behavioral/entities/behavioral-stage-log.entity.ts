import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BehavioralSession } from './behavioral-session.entity';
import type { QuestionProbeFollowUpTrigger } from '../../question-bank/constants/question-bank-taxonomy.constants';
import type { InterviewTurnType } from '../../behavior-session/types/behavior-session.types';
import type { ProbeScoringResult } from '../../question-bank/types/question-practice-scoring.types';

export type LogRole = 'USER' | 'AI_FACILITATOR' | 'SYSTEM';

@Entity('behavioral_stage_logs')
export class BehavioralStageLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  behavioralSessionId: string;

  @ManyToOne(() => BehavioralSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'behavioralSessionId' })
  behavioralSession: BehavioralSession;

  @Column({ type: 'int' })
  stageNumber: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  stageName: string | null;

  @Column({ type: 'varchar', length: 20 })
  role: LogRole;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 10, default: 'text' })
  inputType: 'text' | 'voice';

  @Column({ type: 'text', nullable: true })
  voiceTranscript: string | null;

  @Column({ type: 'boolean', default: false })
  isTruncated: boolean;

  @Column({ type: 'float', nullable: true })
  relevanceScore: number | null;

  @Column({ type: 'text', array: true, default: [] })
  qualityFlags: string[];

  @CreateDateColumn()
  timestamp: Date;

  // --- Columns dành riêng cho sessionMode = 'probe_based' (F032) ---
  // Tất cả nullable để không break logs legacy

  @Column({ type: 'uuid', nullable: true })
  probeId: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  turnType: InterviewTurnType | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  followUpTrigger: QuestionProbeFollowUpTrigger | null;

  @Column({ type: 'text', nullable: true })
  challengeReason: string | null;

  @Column({ type: 'jsonb', nullable: true })
  probeScoringResult: ProbeScoringResult | null;

  /** Reset về 0 khi chuyển probe */
  @Column({ type: 'int', default: 0 })
  probeTurnIndex: number;

  /** Tăng dần xuyên suốt session, dùng để reconstruct turnHistory theo thứ tự */
  @Column({ type: 'int', nullable: true })
  globalTurnIndex: number | null;
}
