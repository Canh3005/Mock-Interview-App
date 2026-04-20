import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_solved_problems')
@Index(['userId', 'problemId'], { unique: true })
export class UserSolvedProblem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar' })
  problemId: string;

  @CreateDateColumn()
  solvedAt: Date;
}
