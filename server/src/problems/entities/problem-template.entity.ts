import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Problem } from './problem.entity';

@Entity()
@Index(['problemId', 'languageId'], { unique: true })
export class ProblemTemplate {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ name: 'problem_id' })
  problemId: string;

  @ManyToOne(() => Problem, (problem) => problem.templates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;

  @Column()
  languageId: string; // e.g., 'python', 'java', 'javascript'

  @Column({ type: 'text' })
  starterCode: string;

  @Column({ type: 'text' })
  solutionCode: string;

  @Column({ type: 'text' })
  driverCode: string;

  @Column({ type: 'int' })
  timeLimitMs: number;

  @Column({ type: 'int' })
  memoryLimitKb: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
