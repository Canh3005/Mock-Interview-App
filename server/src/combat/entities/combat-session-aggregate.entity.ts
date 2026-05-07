import {
  Entity,
  Column,
  PrimaryColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InterviewSession } from '../../interview/entities/interview-session.entity';

@Entity('combat_session_aggregate')
export class CombatSessionAggregate {
  @PrimaryColumn({ type: 'uuid', name: 'interview_session_id' })
  interviewSessionId: string;

  @ManyToOne(() => InterviewSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'interview_session_id' })
  interviewSession: InterviewSession;

  // ── Eye tracking ────────────────────────────────────────────────────────────
  @Column({ type: 'int', default: 0 })
  eyeTotalFrames: number;

  @Column({ type: 'int', default: 0 })
  eyeScreenFrames: number;

  // ── Filler words ────────────────────────────────────────────────────────────
  @Column({ type: 'float', default: 0 })
  fillerRateSum: number;

  @Column({ type: 'int', default: 0 })
  fillerFrameCount: number;

  /** { word: occurrenceCount } */
  @Column({ type: 'jsonb', default: '{}' })
  fillerWordCounts: Record<string, number>;

  // ── Expressions ─────────────────────────────────────────────────────────────
  @Column({ type: 'int', default: 0 })
  exprConfidentCount: number;

  @Column({ type: 'int', default: 0 })
  exprStressedCount: number;

  @Column({ type: 'int', default: 0 })
  exprTotalValid: number;

  /** Minutes (from session start) that had at least one stressed frame */
  @Column({ type: 'int', array: true, default: '{}' })
  stressPeakMinutes: number[];

  @Column({ type: 'bigint', nullable: true })
  sessionStartTs: number | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
