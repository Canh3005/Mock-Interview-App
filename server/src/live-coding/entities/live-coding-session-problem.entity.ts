import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { LiveCodingSession } from './live-coding-session.entity';
import { RunHistoryEntry } from './live-coding-session.entity';

export type ProblemPhase = 'READ' | 'APPROACH' | 'CODE' | 'DONE';

@Entity('live_coding_session_problems')
@Index(['sessionId', 'problemId'], { unique: true })
export class LiveCodingSessionProblem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  sessionId!: string;

  @ManyToOne(() => LiveCodingSession, (s) => s.sessionProblems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sessionId' })
  session!: LiveCodingSession;

  @Column({ type: 'varchar' })
  problemId!: string;

  @Column({ type: 'int' })
  order!: number;

  @Column({ type: 'varchar', length: 20, default: 'python' })
  language!: string;

  @Column({ type: 'varchar', length: 10, default: 'READ' })
  phase!: ProblemPhase;

  @Column({ type: 'text', nullable: true })
  approachText!: string | null;

  @Column({ type: 'text', nullable: true })
  finalCode!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  approachSubmittedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt!: Date | null;

  @Column({ type: 'boolean', default: false })
  hasTLE!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastRunAt!: Date | null;

  @Column({ type: 'jsonb', default: [] })
  runHistory!: RunHistoryEntry[];

  @Column({ type: 'jsonb', default: [] })
  unlockedHints!: number[];
}
