import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { QuestionProbeLanguage } from '../constants/question-bank-taxonomy.constants';
import {
  QuestionProbeLocalizedContent,
  QuestionProbeScoringHint,
} from './question-probe.entity';

export type QuestionPracticeAttemptStatus =
  | 'pending_feedback'
  | 'processing'
  | 'feedback_ready'
  | 'feedback_failed';

export type QuestionPracticeAnswerInputType = 'text' | 'voice';

export interface QuestionPracticeProbeSnapshot {
  probeId: string;
  probeCode: string | null;
  probeRevision: number;
  resolvedQuestionLocale: QuestionProbeLanguage;
  publicContent: QuestionProbeLocalizedContent | null;
  canonical: {
    intent: string | null;
    primaryQuestion: string | null;
    roleFamilies: string[];
    levels: string[];
    type: string | null;
    competencies: string[];
    techTags: string[];
    difficulty: number | null;
  };
  rubric: {
    expectedSignals: string[];
    redFlags: string[];
    scoringHints: QuestionProbeScoringHint[];
  };
}

@Entity('question_practice_attempts')
@Index(['candidateId', 'clientSubmissionId'], { unique: true })
export class QuestionPracticeAttempt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  candidateId!: string;

  @Column({ type: 'uuid' })
  probeId!: string;

  @Column({ type: 'varchar', length: 120 })
  clientSubmissionId!: string;

  @Column({ type: 'varchar', length: 20, default: 'text' })
  answerInputType!: QuestionPracticeAnswerInputType;

  @Column({ type: 'text' })
  answerText!: string;

  @Column({ type: 'varchar', length: 10 })
  displayLocale!: QuestionProbeLanguage;

  @Column({ type: 'varchar', length: 10 })
  resolvedQuestionLocale!: QuestionProbeLanguage;

  @Column({ type: 'varchar', length: 10 })
  feedbackLocale!: QuestionProbeLanguage;

  @Column({ type: 'varchar', length: 30, default: 'pending_feedback' })
  status!: QuestionPracticeAttemptStatus;

  @Column({ type: 'jsonb' })
  probeSnapshot!: QuestionPracticeProbeSnapshot;

  @Column({ type: 'timestamptz' })
  submittedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
