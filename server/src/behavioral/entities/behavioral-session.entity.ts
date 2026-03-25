import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InterviewSession } from '../../interview/entities/interview-session.entity';

export type CandidateLevel = 'junior' | 'mid' | 'senior';
export type BehavioralSessionStatus = 'IN_PROGRESS' | 'COMPLETED';

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
}
