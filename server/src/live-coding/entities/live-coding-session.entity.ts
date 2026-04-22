import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { InterviewSession } from '../../interview/entities/interview-session.entity';
import { LiveCodingSessionProblem } from './live-coding-session-problem.entity';

export type LiveCodingSessionStatus = 'IN_PROGRESS' | 'SCORING' | 'COMPLETED';

export interface RunResult {
  testCaseId: string;
  isHidden: boolean;
  status: 'AC' | 'WA' | 'TLE' | 'RE' | 'CE';
  timeMs: number | null;
  input?: string;
  stdout?: string;       // user print statements (cout/print in user code)
  output?: string;       // driver-formatted return value
  expectedOutput?: string;
  compileError?: string;
}

export interface RunHistoryEntry {
  runAt: string;
  results: RunResult[];
  hasTLE: boolean;
}

export interface AiMessage {
  role: 'ai' | 'user';
  content: string;
  trigger: 'TLE' | 'IDLE' | 'MANUAL';
  problemId: string;
  sentAt: string;
}

@Entity('live_coding_sessions')
export class LiveCodingSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  interviewSessionId!: string | null;

  @ManyToOne(() => InterviewSession, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'interviewSessionId' })
  interviewSession!: InterviewSession | null;

  @Column({ type: 'varchar', length: 20, default: 'IN_PROGRESS' })
  status!: LiveCodingSessionStatus;

  @Column({ type: 'varchar', length: 10, default: 'practice' })
  mode!: 'practice' | 'combat' | 'solo';

  @Column({ type: 'jsonb', default: [] })
  aiConversation!: AiMessage[];

  @Column({ type: 'jsonb', default: [] })
  idleEvents!: { problemId: string; at: string }[];

  @Column({ type: 'jsonb', nullable: true })
  finalScore!: Record<string, unknown> | null;

  @CreateDateColumn()
  startedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @OneToMany(() => LiveCodingSessionProblem, (sp) => sp.session, {
    cascade: true,
    eager: false,
  })
  sessionProblems!: LiveCodingSessionProblem[];
}
