import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column({ nullable: true })
  role: string;

  @Column({ nullable: true })
  seniority: string;

  @Column({ nullable: true })
  domain: string;

  @Column({ type: 'jsonb', nullable: true })
  experience: any; // e.g. [{ company: string, role: string, duration: string, responsibilities: string[] }]

  @Column({ type: 'jsonb', nullable: true })
  techStack: string[];

  // Radar chart metrics (1-100)
  @Column({ type: 'int', default: 0 })
  systemDesignScore: number;

  @Column({ type: 'int', default: 0 })
  dsaScore: number;

  @Column({ type: 'int', default: 0 })
  englishScore: number;

  @Column({ type: 'int', default: 0 })
  softSkillScore: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
