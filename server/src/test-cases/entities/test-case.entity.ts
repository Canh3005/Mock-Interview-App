import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Problem } from '../../problems/entities/problem.entity';

@Entity()
export class TestCase {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ name: 'problem_id' })
  problemId: string;

  @ManyToOne(() => Problem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;

  @Column({ type: 'text' })
  inputData: string;

  @Column({ type: 'text' })
  expectedOutput: string;

  @Column({ default: false })
  isHidden: boolean;

  @Column({ type: 'int', default: 1 })
  weight: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
