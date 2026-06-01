import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import type {
  SDStage,
  SDGraphState,
  SDGraphMetrics,
} from '../types/sd-orchestrator.types';

@Entity('sd_graph_snapshots')
@Index(['sessionId', 'stage'])
export class SDGraphSnapshotEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  sessionId!: string;

  @Column({ type: 'varchar', length: 30 })
  stage!: SDStage;

  @Column({ type: 'jsonb' })
  graph!: SDGraphState;

  @Column({ type: 'jsonb' })
  metrics!: SDGraphMetrics;

  @CreateDateColumn()
  capturedAt!: Date;
}
