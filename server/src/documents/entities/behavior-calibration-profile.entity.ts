import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import type {
  CalibrationStatus,
  EvidenceStrictness,
  SourceCompleteness,
} from '../types/behavior-calibration.types';
import type {
  QuestionProbeCompetency,
  QuestionProbeLevel,
  QuestionProbeRoleFamily,
} from '../../question-bank/constants/question-bank-taxonomy.constants';

@Entity()
export class BehaviorCalibrationProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'varchar', nullable: true })
  cvId: string | null;

  @Column({ type: 'varchar', nullable: true })
  jdAnalysisId: string | null;

  @Column({ type: 'varchar', length: 20, default: 'partial' })
  status: CalibrationStatus;

  @Column({ type: 'jsonb' })
  sourceCompleteness: SourceCompleteness;

  @Column({ type: 'varchar', default: '' })
  roleFamily: QuestionProbeRoleFamily;

  @Column({ type: 'varchar', default: '' })
  targetRole: string;

  @Column({ type: 'varchar', default: '' })
  targetLevel: QuestionProbeLevel;

  @Column({ type: 'varchar', default: '' })
  profileLevel: QuestionProbeLevel;

  @Column({ type: 'boolean', default: false })
  levelMismatch: boolean;

  @Column({ type: 'jsonb', default: [] })
  levelExpectations: object[];

  @Column({ type: 'jsonb', default: [] })
  priorityCompetencies: QuestionProbeCompetency[];

  @Column({ type: 'jsonb', default: {} })
  competencyWeights: Record<string, number>;

  @Column({ type: 'jsonb', default: [] })
  previousWeakCompetencies: QuestionProbeCompetency[];

  @Column({ type: 'varchar', length: 20, default: 'standard' })
  evidenceStrictness: EvidenceStrictness;

  @Column({ type: 'jsonb', default: [] })
  calibrationNotes: string[];

  @Column({ type: 'jsonb', default: [] })
  cvTechStack: string[];

  @Column({ type: 'jsonb', default: [] })
  jdTechRequirements: string[];

  @Column({ type: 'jsonb', nullable: true })
  userFacingSummary: {
    focusAreas: string[];
    evidenceToPrep: string[];
    missingDataWarning?: string;
    levelMismatchWarning?: string;
  } | null;

  @Column({ type: 'varchar', default: 'behavior-calibration-v1' })
  internalVersion: string;

  @OneToMany('CandidateClaim', 'calibrationProfile')
  claims: unknown[];

  @OneToMany('RiskHypothesis', 'calibrationProfile')
  riskHypotheses: unknown[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
