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
import { User } from './user.entity';

@Entity()
@Index(['provider', 'providerId'], { unique: true })
export class Identity {
  @PrimaryColumn({ type: 'varchar' }) // Again, using varchar to be compatible with Mongo ObjectIDs string conversion
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.identities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  provider: string; // e.g., 'github'

  @Column()
  providerId: string; // The ID from the provider

  @Column({ type: 'jsonb', default: {} })
  profileData: unknown; // Raw profile info for extra fields

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
