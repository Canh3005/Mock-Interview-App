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
  ClaimType,
  ClaimSourceType,
  VerificationPriority,
} from '../types/behavior-calibration.types';
import type { QuestionProbeCompetency } from '../../question-bank/constants/question-bank-taxonomy.constants';

@Entity()
export class CandidateClaim {
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
  cvId: string | null;

  @Column({ type: 'varchar', nullable: true })
  jdAnalysisId: string | null;

  @Column({ type: 'varchar', length: 30 })
  sourceType: ClaimSourceType;

  @Column({ type: 'jsonb' })
  sourceRef: { localId: string; section: string; textHash?: string };

  @Column({ type: 'varchar', length: 30 })
  claimType: ClaimType;

  @Column({ type: 'text' })
  claimText: string;

  @Column({ type: 'jsonb', default: [] })
  impliedCompetencies: QuestionProbeCompetency[];

  @Column({ type: 'varchar', length: 10, default: 'medium' })
  verificationPriority: VerificationPriority;

  @Column({ type: 'jsonb', default: [] })
  techContext: string[];

  @Column({ type: 'jsonb', default: [] })
  riskTags: string[];

  @Column({ type: 'jsonb', default: [] })
  suggestedQuestions: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
