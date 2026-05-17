import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type SessionRiskOutcomeStatus =
  | 'probed'
  | 'confirmed'
  | 'dismissed'
  | 'reduced';

@Entity()
export class SessionRiskOutcome {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @Column()
  riskId: string;

  @Column()
  userId: string;

  @Column({ type: 'varchar', length: 20 })
  status: SessionRiskOutcomeStatus;

  @Column({ type: 'text', nullable: true })
  evidenceQuote: string | null;

  @Column({ type: 'varchar', nullable: true })
  turnId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
