import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import type {
  SDScoredStage,
  SDStageLeftoverJson,
} from '../types/sd-orchestrator.types';

@Entity('sd_stage_summaries')
@Index(['sessionId', 'stage'], { unique: true })
export class SDStageSummary {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  sessionId!: string;

  @Column({ type: 'varchar', length: 30 })
  stage!: SDScoredStage;

  @Column({ type: 'int', default: 0 })
  totalTurns!: number;

  @Column({ type: 'int', default: 0 })
  elapsedSeconds!: number;

  @Column({ type: 'jsonb', default: {} })
  scores!: Record<string, number>;

  @Column({ type: 'text', array: true, default: [] })
  redFlags!: string[];

  @Column({ type: 'jsonb', nullable: true })
  leftoverJson!: SDStageLeftoverJson | null;

  @CreateDateColumn()
  createdAt!: Date;
}
