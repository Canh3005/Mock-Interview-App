import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BehaviorCalibrationProfile } from './behavior-calibration-profile.entity';
import type {
  HiringRiskType,
  RiskSeverity,
} from '../types/behavior-calibration.types';
import type { QuestionProbeCompetency } from '../../question-bank/constants/question-bank-taxonomy.constants';

@Entity()
export class RiskHypothesis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  calibrationProfileId: string;

  @ManyToOne(() => BehaviorCalibrationProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'calibrationProfileId' })
  calibrationProfile: BehaviorCalibrationProfile;

  @Column({ type: 'varchar', nullable: true })
  candidateClaimId: string | null;

  @Column({ type: 'varchar', length: 40 })
  riskType: HiringRiskType;

  @Column({ type: 'varchar', length: 10, default: 'medium' })
  severity: RiskSeverity;

  @Column({ type: 'text' })
  rationale: string;

  @Column({ type: 'jsonb', default: [] })
  relatedCompetencies: QuestionProbeCompetency[];

  @Column({ type: 'jsonb', default: [] })
  suggestedProbeFocus: string[];

  @Column({ type: 'jsonb', nullable: true })
  sourceRefs: object | null;

  @Column({ type: 'jsonb', nullable: true })
  probeSelectionHints: object | null;

  @Column({ type: 'jsonb', default: [] })
  evidenceNeededToReject: string[];

  @Column({ type: 'varchar', length: 30, default: 'cv' })
  source: 'cv' | 'jd' | 'system_inference';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
