import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import type {
  InterviewDepth,
  PersonaPolicy,
  PressureProfile,
  StageProbeAllocation,
} from '../types/session-plan.types';
import type {
  QuestionProbeLanguage,
  QuestionProbeLevel,
  QuestionProbeRoleFamily,
} from '../../question-bank/constants/question-bank-taxonomy.constants';

@Entity('session_plans')
export class SessionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  sessionId: string;

  @Column()
  userId: string;

  @Column()
  calibrationProfileId: string;

  @Column({ type: 'varchar' })
  roleFamily: QuestionProbeRoleFamily;

  @Column({ type: 'varchar' })
  targetRole: string;

  @Column({ type: 'varchar' })
  targetLevel: QuestionProbeLevel;

  @Column({ type: 'varchar', length: 10 })
  language: QuestionProbeLanguage;

  @Column({ type: 'int' })
  durationMinutes: number;

  @Column({ type: 'varchar', length: 10 })
  depth: InterviewDepth;

  @Column({ type: 'jsonb' })
  personaPolicy: PersonaPolicy;

  @Column({ type: 'jsonb' })
  pressureProfile: PressureProfile;

  @Column({ type: 'jsonb' })
  stageAllocations: StageProbeAllocation[];

  @Column({ type: 'varchar', default: 'session-plan-v1' })
  planVersion: string;

  @CreateDateColumn()
  createdAt: Date;
}
