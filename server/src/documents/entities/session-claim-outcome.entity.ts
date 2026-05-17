import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type SessionClaimOutcomeStatus =
  | 'probed'
  | 'supported'
  | 'contradicted'
  | 'insufficient_evidence';

@Entity()
export class SessionClaimOutcome {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @Column()
  claimId: string;

  @Column()
  userId: string;

  @Column({ type: 'varchar', length: 30 })
  status: SessionClaimOutcomeStatus;

  @Column({ type: 'text', nullable: true })
  evidenceQuote: string | null;

  @Column({ type: 'varchar', nullable: true })
  turnId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
