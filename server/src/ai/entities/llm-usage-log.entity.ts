import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('llm_usage_log')
export class LlmUsageLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  model!: string;

  @Column({ type: 'varchar', nullable: true })
  feature!: string | null;

  @Column({ type: 'varchar', nullable: true })
  userId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  sessionId!: string | null;

  @Column({ type: 'int', nullable: true })
  inputTokens!: number | null;

  @Column({ type: 'int', nullable: true })
  outputTokens!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  costUsd!: number | null;

  @CreateDateColumn()
  createdAt!: Date;
}
