import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { QuestionProbeLanguage } from '../../question-bank/constants/question-bank-taxonomy.constants';

@Entity({ name: 'question_probe_embeddings', synchronize: false })
@Index('idx_question_probe_embeddings_probe_id', ['questionProbeId'])
export class QuestionProbeEmbedding {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'question_probe_id' })
  questionProbeId!: string;

  @Column({ type: 'int', name: 'question_probe_revision' })
  questionProbeRevision!: number;

  @Column({ type: 'varchar', length: 10 })
  language!: QuestionProbeLanguage;

  @Column({ type: 'varchar', length: 64, name: 'content_hash' })
  contentHash!: string;

  @Column({ type: 'text', name: 'canonical_text' })
  canonicalText!: string;

  @Column({ type: 'vector', length: 768, select: false })
  embedding!: number[];

  @Column({ type: 'varchar', length: 80, name: 'embedding_model' })
  embeddingModel!: string;

  @Column({ type: 'int', name: 'embedding_dimensions' })
  embeddingDimensions!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
