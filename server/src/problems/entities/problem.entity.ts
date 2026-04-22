import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ProblemTemplate } from './problem-template.entity';
import { TestCase } from '../../test-cases/entities/test-case.entity';

export enum ProblemDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum ProblemStatus {
  DRAFT = 'DRAFT',
  VERIFIED = 'VERIFIED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

@Entity()
export class Problem {
  @PrimaryColumn({ type: 'varchar' }) // UUID string or backward-compatible MongoDB ObjectId string
  id: string;

  @Column()
  title: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'enum', enum: ProblemDifficulty })
  difficulty: ProblemDifficulty;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', array: true, default: [] })
  constraints: string[];

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  timeLimitMultiplier: number;

  @Column({ type: 'enum', enum: ProblemStatus, default: ProblemStatus.DRAFT })
  status: ProblemStatus;

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @Column({ type: 'text', array: true, default: [] })
  hints: string[];

  @OneToMany(
    () => ProblemTemplate,
    (template: ProblemTemplate) => template.problem,
    { cascade: true },
  )
  templates: ProblemTemplate[];

  @OneToMany(() => TestCase, (testCase: TestCase) => testCase.problem, {
    cascade: true,
  })
  testCases: TestCase[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
