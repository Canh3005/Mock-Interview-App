import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
export class JdAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User, (user) => user.jdAnalyses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ nullable: true })
  fileUrl!: string;

  @Column()
  originalName!: string;

  @Column({ type: 'jsonb', nullable: true })
  parsedJson: any;

  @Column({ type: 'varchar', length: 20, default: 'completed' })
  processingStatus!: 'processing' | 'completed' | 'failed';

  @Column({ type: 'text', nullable: true })
  parseError!: string | null;

  @Column({ type: 'varchar', nullable: true })
  parsedTextHash!: string | null;

  @Column({ type: 'int', nullable: true })
  fitScore!: number | null;

  @Column({ type: 'jsonb', nullable: true })
  matchReport: any;

  @Column({ type: 'varchar', length: 20, default: 'not_ready' })
  assessmentStatus!: 'not_ready' | 'completed' | 'failed';

  @Column({ type: 'text', nullable: true })
  assessmentError!: string | null;

  @Column({ type: 'varchar', nullable: true })
  cvId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  scoringVersion!: string | null;

  @Column({ type: 'varchar', nullable: true })
  assessmentModel!: string | null;

  @Column({ type: 'varchar', nullable: true })
  assessmentConfidence!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  fitAssessment: any;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
