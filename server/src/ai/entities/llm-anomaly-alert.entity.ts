import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('llm_anomaly_alert')
export class LlmAnomalyAlert {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  userId!: string;

  @Column({ type: 'varchar', nullable: true })
  sessionId!: string | null;

  @Column({ type: 'varchar' })
  feature!: string;

  @Column({ type: 'int' })
  callCount!: number;

  @Column({ type: 'int' })
  threshold!: number;

  @Column({ default: false })
  resolved!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  notifiedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
