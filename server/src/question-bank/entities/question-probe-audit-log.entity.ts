import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { QuestionProbeStatus } from '../constants/question-bank-taxonomy.constants';
import { QuestionProbe } from './question-probe.entity';

export type QuestionProbeAuditAction =
  | 'created'
  | 'updated'
  | 'reopened_draft'
  | 'submitted_review'
  | 'published'
  | 'marked_needs_revision'
  | 'retired';

@Entity('question_probe_audit_logs')
export class QuestionProbeAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  probeId!: string;

  @ManyToOne(() => QuestionProbe, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'probeId' })
  probe!: QuestionProbe;

  @Column({ type: 'varchar' })
  actorId!: string;

  @Column({ type: 'varchar', length: 40 })
  action!: QuestionProbeAuditAction;

  @Column({ type: 'varchar', length: 30, nullable: true })
  previousStatus!: QuestionProbeStatus | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  nextStatus!: QuestionProbeStatus | null;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ type: 'jsonb', default: {} })
  snapshot!: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;
}
