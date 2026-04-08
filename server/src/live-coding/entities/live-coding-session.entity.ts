import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InterviewSession } from '../../interview/entities/interview-session.entity';

export type LiveCodingSessionStatus = 'IN_PROGRESS' | 'SCORING' | 'COMPLETED';

@Entity('live_coding_sessions')
export class LiveCodingSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  interviewSessionId: string;

  @ManyToOne(() => InterviewSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'interviewSessionId' })
  interviewSession: InterviewSession;

  @Column({ type: 'varchar', length: 20, default: 'IN_PROGRESS' })
  status: LiveCodingSessionStatus;

  @Column({ type: 'jsonb', nullable: true })
  finalScore: Record<string, unknown> | null;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  // Metadata
  @Column({ type: 'text', nullable: true })
  problemStatement: string;

  @Column({ type: 'int', default: 0 })
  testCasesPassed: number;

  @Column({ type: 'int', default: 0 })
  totalTestCases: number;
}
