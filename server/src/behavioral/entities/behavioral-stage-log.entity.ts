import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BehavioralSession } from './behavioral-session.entity';

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
}
