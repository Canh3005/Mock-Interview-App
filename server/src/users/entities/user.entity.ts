import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Identity } from './identity.entity';
import { UserProfile } from './user-profile.entity';
import { UserCv } from './user-cv.entity';
import { JdAnalysis } from './jd-analysis.entity';

export enum Role {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity()
export class User {
  @PrimaryColumn({ type: 'varchar' }) // Keep the same string format as MongoDB ObjectId or use a generated UUID strategy
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  passwordHash?: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true })
  refreshTokenHash: string;

  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role: Role;

  @OneToMany(() => Identity, (identity) => identity.user)
  identities: Identity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => UserProfile, (profile) => profile.user)
  profile: UserProfile;

  @OneToMany(() => UserCv, (cv) => cv.user)
  cvs: UserCv[];

  @OneToMany(() => JdAnalysis, (jd) => jd.user)
  jdAnalyses: JdAnalysis[];
}
