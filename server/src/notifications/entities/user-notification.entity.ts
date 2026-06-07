import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('user_notification')
export class UserNotification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  userId!: string;

  @Column({ type: 'varchar' })
  type!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
