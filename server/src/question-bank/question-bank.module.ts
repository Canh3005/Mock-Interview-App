import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QUESTION_PRACTICE_SCORING_QUEUE } from '../jobs/jobs.constants';
import { InterviewSet } from './entities/interview-set.entity';
import { QuestionPracticeAttempt } from './entities/question-practice-attempt.entity';
import { QuestionProbeAuditLog } from './entities/question-probe-audit-log.entity';
import { QuestionProbe } from './entities/question-probe.entity';
import { QuestionBankAdminController } from './controllers/question-bank-admin.controller';
import { QuestionBankController } from './controllers/question-bank.controller';
import { QuestionBankService } from './services/question-bank.service';
import { InterviewSetCurationService } from './services/curation/interview-set-curation.service';
import { QuestionProbeAuditService } from './services/curation/question-probe-audit.service';
import { QuestionProbeCurationService } from './services/curation/question-probe-curation.service';
import { QuestionProbeValidationService } from './services/curation/question-probe-validation.service';
import { QuestionPracticeAttemptService } from './services/practice/question-practice-attempt.service';
import { QuestionPracticeFeedbackService } from './services/practice/question-practice-feedback.service';
import { QuestionBankDetailService } from './services/public/question-bank-detail.service';
import { QuestionBankPublicBrowseService } from './services/public/question-bank-public-browse.service';
import { QuestionBankPublicProjectionService } from './services/public/question-bank-public-projection.service';
import { QuestionBankRelatedService } from './services/public/question-bank-related.service';
import { QuestionPracticeScoringResultService } from './services/scoring/question-practice-scoring-result.service';
import { QuestionPracticeScoringService } from './services/scoring/question-practice-scoring.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuestionProbe,
      QuestionPracticeAttempt,
      QuestionProbeAuditLog,
      InterviewSet,
    ]),
    BullModule.registerQueueAsync({ name: QUESTION_PRACTICE_SCORING_QUEUE }),
  ],
  controllers: [QuestionBankController, QuestionBankAdminController],
  providers: [
    QuestionBankService,
    QuestionBankPublicBrowseService,
    QuestionBankDetailService,
    QuestionBankPublicProjectionService,
    QuestionBankRelatedService,
    QuestionPracticeAttemptService,
    QuestionPracticeFeedbackService,
    QuestionPracticeScoringService,
    QuestionPracticeScoringResultService,
    QuestionProbeValidationService,
    QuestionProbeAuditService,
    QuestionProbeCurationService,
    InterviewSetCurationService,
  ],
  exports: [
    QuestionBankService,
    QuestionBankPublicBrowseService,
    QuestionBankDetailService,
    QuestionBankPublicProjectionService,
    QuestionBankRelatedService,
    QuestionPracticeAttemptService,
    QuestionPracticeFeedbackService,
    QuestionPracticeScoringService,
    QuestionPracticeScoringResultService,
    QuestionProbeValidationService,
    QuestionProbeCurationService,
    InterviewSetCurationService,
  ],
})
export class QuestionBankModule {}
