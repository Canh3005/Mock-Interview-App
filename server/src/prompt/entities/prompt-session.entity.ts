import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InterviewSession } from '../../interview/entities/interview-session.entity';

export type PromptSessionStatus = 'IN_PROGRESS' | 'SCORING' | 'COMPLETED';

@Entity('prompt_sessions')
export class PromptSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  interviewSessionId: string;

  @ManyToOne(() => InterviewSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'interviewSessionId' })
  interviewSession: InterviewSession;

  @Column({ type: 'varchar', length: 20, default: 'IN_PROGRESS' })
  status: PromptSessionStatus;

  @Column({ type: 'jsonb', nullable: true })
  finalScore: Record<string, unknown> | null;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  // Metadata
  @Column({ type: 'text', nullable: true })
  promptDescription: string;

  @Column({ type: 'int', default: 1 })
  totalRounds: number;

  @Column({ type: 'int', default: 1 })
  currentRound: number;
}
