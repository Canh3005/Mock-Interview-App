import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import type {
  NSDInterviewPhase,
  NSDTurnAction,
  NSDEvalLevel,
  NSDFillEvent,
  NSDExtraNodeEvent,
  NSDItemCounters,
} from '../types/nsd.types';

@Entity('nsd_turn_records')
@Index(['sessionId', 'phase'])
@Index(['sessionId', 'turnIndex'])
export class NSDTurnRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  sessionId!: string;

  @Column({ type: 'varchar', length: 30 })
  phase!: NSDInterviewPhase;

  @Column({ type: 'int' })
  turnIndex!: number;

  @Column({ type: 'varchar', length: 40 })
  action!: NSDTurnAction;

  @Column({ type: 'varchar', length: 100, nullable: true })
  itemKey!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  questionKey!: string | null;

  @Column({ type: 'text', default: '' })
  candidateAnswer!: string;

  @Column({ type: 'text', default: '' })
  responseText!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  evalLevel!: NSDEvalLevel | null;

  @Column({ type: 'jsonb', nullable: true })
  countersSnapshot!: NSDItemCounters[] | null;

  @Column({ type: 'jsonb', default: [] })
  fillEvents!: NSDFillEvent[];

  @Column({ type: 'jsonb', default: [] })
  extraNodeEvents!: NSDExtraNodeEvent[];

  @CreateDateColumn()
  createdAt!: Date;
}
