import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class FitAssessmentRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  jdAnalysisId: string;

  @Column({ type: 'varchar', nullable: true })
  jdOriginalName: string | null;

  @Column({ type: 'varchar', nullable: true })
  cvId: string | null;

  @Column({ type: 'int', nullable: true })
  fitScore: number | null;

  @Column({ type: 'jsonb', nullable: true })
  matchReport: unknown;

  @Column({ type: 'varchar', length: 20 })
  assessmentStatus: 'completed' | 'failed';

  @Column({ type: 'text', nullable: true })
  assessmentError: string | null;

  @Column({ type: 'varchar', nullable: true })
  scoringVersion: string | null;

  @Column({ type: 'varchar', nullable: true })
  assessmentModel: string | null;

  @Column({ type: 'varchar', nullable: true })
  assessmentConfidence: string | null;

  @Column({ type: 'jsonb', nullable: true })
  fitAssessment: unknown;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
