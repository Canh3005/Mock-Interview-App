import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterviewSet } from './entities/interview-set.entity';
import { QuestionPracticeAttempt } from './entities/question-practice-attempt.entity';
import { QuestionProbeAuditLog } from './entities/question-probe-audit-log.entity';
import { QuestionProbe } from './entities/question-probe.entity';
import { InterviewSetCurationService } from './interview-set-curation.service';
import { QuestionBankAdminController } from './question-bank-admin.controller';
import { QuestionBankController } from './question-bank.controller';
import { QuestionBankDetailService } from './question-bank-detail.service';
import { QuestionBankPublicBrowseService } from './question-bank-public-browse.service';
import { QuestionBankPublicProjectionService } from './question-bank-public-projection.service';
import { QuestionBankRelatedService } from './question-bank-related.service';
import { QuestionBankService } from './question-bank.service';
import { QuestionProbeAuditService } from './question-probe-audit.service';
import { QuestionProbeCurationService } from './question-probe-curation.service';
import { QuestionProbeValidationService } from './question-probe-validation.service';
import { QuestionPracticeAttemptService } from './question-practice-attempt.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuestionProbe,
      QuestionPracticeAttempt,
      QuestionProbeAuditLog,
      InterviewSet,
    ]),
  ],
  controllers: [QuestionBankController, QuestionBankAdminController],
  providers: [
    QuestionBankService,
    QuestionBankPublicBrowseService,
    QuestionBankDetailService,
    QuestionBankPublicProjectionService,
    QuestionBankRelatedService,
    QuestionPracticeAttemptService,
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
    QuestionProbeValidationService,
    QuestionProbeCurationService,
    InterviewSetCurationService,
  ],
})
export class QuestionBankModule {}
