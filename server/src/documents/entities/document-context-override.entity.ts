import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('document_context_overrides')
@Index(['userId'], { unique: true })
export class DocumentContextOverride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'jsonb', nullable: true })
  cvJson: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  jdJson: Record<string, unknown> | null;

  @Column({ type: 'timestamptz', nullable: true })
  cvUpdatedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  jdUpdatedAt: Date | null;

  @Column({ default: true })
  updatedByUser: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
