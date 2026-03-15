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
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.jdAnalyses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  fileUrl: string;

  @Column()
  originalName: string;

  @Column({ type: 'jsonb', nullable: true })
  parsedJson: any;

  @Column({ type: 'int', nullable: true })
  fitScore: number;

  @Column({ type: 'jsonb', nullable: true })
  matchReport: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
