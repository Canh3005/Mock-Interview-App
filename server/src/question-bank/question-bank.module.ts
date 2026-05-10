import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterviewSet } from './entities/interview-set.entity';
import { QuestionProbeAuditLog } from './entities/question-probe-audit-log.entity';
import { QuestionProbe } from './entities/question-probe.entity';
import { InterviewSetCurationService } from './interview-set-curation.service';
import { QuestionBankAdminController } from './question-bank-admin.controller';
import { QuestionBankController } from './question-bank.controller';
import { QuestionBankService } from './question-bank.service';
import { QuestionProbeAuditService } from './question-probe-audit.service';
import { QuestionProbeCurationService } from './question-probe-curation.service';
import { QuestionProbeValidationService } from './question-probe-validation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuestionProbe,
      QuestionProbeAuditLog,
      InterviewSet,
    ]),
  ],
  controllers: [QuestionBankController, QuestionBankAdminController],
  providers: [
    QuestionBankService,
    QuestionProbeValidationService,
    QuestionProbeAuditService,
    QuestionProbeCurationService,
    InterviewSetCurationService,
  ],
  exports: [
    QuestionBankService,
    QuestionProbeValidationService,
    QuestionProbeCurationService,
    InterviewSetCurationService,
  ],
})
export class QuestionBankModule {}
