import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import type {
  SDStage,
  SDIntentType,
  SDCandidateIntent,
  SDDecisionAction,
} from '../types/sd-orchestrator.types';

@Entity('sd_turn_records')
@Index(['sessionId', 'stage'])
@Index(['sessionId', 'turnIndex'])
export class SDTurnRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  sessionId!: string;

  @Column({ type: 'varchar', length: 30 })
  stage!: SDStage;

  @Column({ type: 'int' })
  turnIndex!: number;

  @Column({ type: 'varchar', length: 40 })
  intentType!: SDIntentType;

  @Column({ type: 'jsonb', default: {} })
  intentTargetJson!: Record<string, unknown>;

  @Column({ type: 'text' })
  promptRendered!: string;

  @Column({ type: 'text', default: '' })
  candidateAnswer!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  candidateIntent!: SDCandidateIntent | null;

  @Column({ type: 'jsonb', default: {} })
  signalsJson!: Record<string, unknown>;

  @Column({ type: 'jsonb', default: {} })
  scoreDeltas!: Record<string, number>;

  @Column({ type: 'jsonb', nullable: true })
  extraJson!: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  action!: SDDecisionAction | null;

  @Column({ type: 'text', nullable: true })
  decisionReason!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
