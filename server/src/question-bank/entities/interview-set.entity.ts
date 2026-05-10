import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  QuestionProbeCompetency,
  QuestionProbeLevel,
  QuestionProbeRoleFamily,
  QuestionProbeStage,
  QuestionProbeStatus,
} from '../constants/question-bank-taxonomy.constants';
import { QuestionProbeLocalizedContentMap } from './question-probe.entity';

export interface InterviewSetSlotRule {
  stage: QuestionProbeStage;
  type?: string;
  competency?: QuestionProbeCompetency;
  count: number;
}

@Entity('interview_sets')
export class InterviewSet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120, nullable: true, unique: true })
  code!: string | null;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'jsonb', default: {} })
  localizedContent!: QuestionProbeLocalizedContentMap;

  @Column({ type: 'varchar', length: 30 })
  roleFamily!: QuestionProbeRoleFamily;

  @Column({ type: 'varchar', length: 20 })
  level!: QuestionProbeLevel;

  @Column({ type: 'int' })
  durationMinutes!: number;

  @Column({ type: 'int' })
  difficulty!: number;

  @Column({ type: 'text', array: true, default: [] })
  stages!: QuestionProbeStage[];

  @Column({ type: 'text', array: true, default: [] })
  competencies!: QuestionProbeCompetency[];

  @Column({ type: 'int' })
  questionCount!: number;

  @Column({ type: 'uuid', array: true, default: [] })
  probeIds!: string[];

  @Column({ type: 'jsonb', default: [] })
  slotRules!: InterviewSetSlotRule[];

  @Column({ type: 'varchar', length: 30, default: 'draft' })
  status!: QuestionProbeStatus;

  @Column({ type: 'varchar', nullable: true })
  createdBy!: string | null;

  @Column({ type: 'varchar', nullable: true })
  updatedBy!: string | null;

  @Column({ type: 'int', default: 1 })
  revision!: number;

  @Column({ type: 'text', nullable: true })
  lastTransitionReason!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  retiredAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
