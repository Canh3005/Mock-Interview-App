import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import type {
  NSDInterviewPhase,
  NSDPhaseSummaryRecord,
} from '../types/nsd.types';

@Entity('nsd_phase_summaries')
@Index(['sessionId', 'phase'], { unique: true })
export class NSDPhaseSummaryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  sessionId!: string;

  @Column({ type: 'varchar', length: 30 })
  phase!: NSDInterviewPhase;

  @Column({ type: 'jsonb' })
  summary!: NSDPhaseSummaryRecord;

  @CreateDateColumn()
  createdAt!: Date;
}
