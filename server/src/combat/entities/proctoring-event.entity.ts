import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ProctoringSession } from './proctoring-session.entity';

export type ProctoringSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

@Entity('proctoring_events')
@Index(['proctoringSessionId', 'ts'])
export class ProctoringEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  clientEventId!: string;

  @Column({ type: 'uuid' })
  proctoringSessionId!: string;

  @ManyToOne(() => ProctoringSession, (session) => session.events, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'proctoringSessionId' })
  proctoringSession!: ProctoringSession;

  @Column({ type: 'bigint' })
  ts!: number;

  @Column({ type: 'varchar', length: 50 })
  eventType!: string;

  @Column({ type: 'varchar', length: 10 })
  severity!: ProctoringSeverity;

  @Column({ type: 'int', nullable: true })
  durationMs!: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
