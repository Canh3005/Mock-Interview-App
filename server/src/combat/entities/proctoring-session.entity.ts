import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('proctoring_sessions')
export class ProctoringSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  interviewSessionId!: string;

  @Column({ type: 'int', default: 0 })
  highFlagCount!: number;

  @Column({ type: 'int', default: 0 })
  mediumFlagCount!: number;

  @Column({ type: 'int', default: 0 })
  lowFlagCount!: number;

  @Column({ type: 'int', default: 100 })
  integrityScore!: number;

  @Column({ type: 'jsonb', nullable: true })
  summary!: Record<string, unknown> | null;

  @OneToMany(
    'ProctoringEvent',
    (event: { proctoringSession: ProctoringSession }) =>
      event.proctoringSession,
  )
  events!: Array<{ proctoringSession: ProctoringSession }>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
