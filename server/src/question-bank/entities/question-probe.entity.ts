import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  QuestionProbeCompetency,
  QuestionProbeFollowUpTrigger,
  QuestionProbeLanguage,
  QuestionProbeLevel,
  QuestionProbeRoleFamily,
  QuestionProbeStage,
  QuestionProbeStatus,
  QuestionProbeType,
} from '../constants/question-bank-taxonomy.constants';

export interface QuestionProbeLocalizedContent {
  title: string;
  displayQuestion: string;
  displayIntent: string;
  guidance: string[];
  commonMistakes: string[];
  labels: Record<string, string>;
}

export interface QuestionProbeFollowUp {
  trigger: QuestionProbeFollowUpTrigger;
  question: string;
  purpose: string;
}

export interface QuestionProbeScoringHint {
  scoreBand: string;
  description: string;
}

export interface QuestionProbeSourceReference {
  label: string;
  url?: string;
  note?: string;
}

export type QuestionProbeLocalizedContentMap = Partial<
  Record<QuestionProbeLanguage, QuestionProbeLocalizedContent>
>;

@Entity('question_probes')
export class QuestionProbe {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120, nullable: true, unique: true })
  code!: string | null;

  @Column({ type: 'text', array: true, default: [] })
  stages!: QuestionProbeStage[];

  @Column({ type: 'text', array: true, default: [] })
  roleFamilies!: QuestionProbeRoleFamily[];

  @Column({ type: 'text', array: true, default: [] })
  levels!: QuestionProbeLevel[];

  @Column({ type: 'varchar', length: 40, nullable: true })
  type!: QuestionProbeType | null;

  @Column({ type: 'text', array: true, default: [] })
  competencies!: QuestionProbeCompetency[];

  @Column({ type: 'text', array: true, default: [] })
  techTags!: string[];

  @Column({ type: 'int', nullable: true })
  difficulty!: number | null;

  @Column({ type: 'text', nullable: true })
  intent!: string | null;

  @Column({ type: 'text', nullable: true })
  primaryQuestion!: string | null;

  @Column({ type: 'jsonb', default: [] })
  expectedSignals!: string[];

  @Column({ type: 'jsonb', default: [] })
  redFlags!: string[];

  @Column({ type: 'jsonb', default: [] })
  scoringHints!: QuestionProbeScoringHint[];

  @Column({ type: 'jsonb', default: [] })
  followUps!: QuestionProbeFollowUp[];

  @Column({ type: 'jsonb', default: {} })
  localizedContent!: QuestionProbeLocalizedContentMap;

  @Column({ type: 'jsonb', default: [] })
  sourceReferences!: QuestionProbeSourceReference[];

  @Column({ type: 'varchar', length: 30, default: 'draft' })
  status!: QuestionProbeStatus;

  @Column({ type: 'varchar', nullable: true })
  createdBy!: string | null;

  @Column({ type: 'varchar', nullable: true })
  updatedBy!: string | null;

  @Column({ type: 'varchar', nullable: true })
  reviewedBy!: string | null;

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
