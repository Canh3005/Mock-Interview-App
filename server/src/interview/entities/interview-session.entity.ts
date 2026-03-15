import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type CandidateLevel = 'junior' | 'mid' | 'senior';
export type InterviewMode = 'practice' | 'combat';
export type SessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';

@Entity('interview_sessions')
export class InterviewSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'varchar', length: 10 })
  mode: InterviewMode;

  @Column({ type: 'jsonb', default: [] })
  rounds: string[];

  @Column({ type: 'varchar', length: 10, nullable: true })
  candidateLevel: CandidateLevel;

  @Column({ type: 'varchar', length: 20, default: 'IN_PROGRESS' })
  status: SessionStatus;

  @Column({ type: 'text', nullable: true })
  cvContextSnapshot: string;

  @Column({ type: 'text', nullable: true })
  jdContextSnapshot: string;

  @Column({ type: 'jsonb', nullable: true })
  finalScorecard: Record<string, unknown>;

  @CreateDateColumn()
  startedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt: Date;
}
