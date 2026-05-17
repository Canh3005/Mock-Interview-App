import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentsAiService } from './documents.ai.service';
import { DocumentContextService } from './document-context.service';
import { FitAssessmentService } from './fit-assessment.service';
import { BehaviorCalibrationAiService } from './behavior-calibration.ai.service';
import { BehaviorCalibrationService } from './behavior-calibration.service';
import { DOCUMENT_PARSING_QUEUE } from '../jobs/jobs.constants';
import { DocumentContextOverride } from './entities/document-context-override.entity';
import { BehaviorCalibrationProfile } from './entities/behavior-calibration-profile.entity';
import { CandidateClaim } from './entities/candidate-claim.entity';
import { RiskHypothesis } from './entities/risk-hypothesis.entity';
import { SessionClaimOutcome } from './entities/session-claim-outcome.entity';
import { SessionRiskOutcome } from './entities/session-risk-outcome.entity';
import { UserCv } from '../users/entities/user-cv.entity';
import { JdAnalysis } from '../users/entities/jd-analysis.entity';
import { UserProfile } from '../users/entities/user-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserCv,
      JdAnalysis,
      DocumentContextOverride,
      BehaviorCalibrationProfile,
      CandidateClaim,
      RiskHypothesis,
      SessionClaimOutcome,
      SessionRiskOutcome,
      UserProfile,
    ]),
    BullModule.registerQueueAsync({ name: DOCUMENT_PARSING_QUEUE }),
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    DocumentsAiService,
    DocumentContextService,
    FitAssessmentService,
    BehaviorCalibrationAiService,
    BehaviorCalibrationService,
  ],
  exports: [
    DocumentsService,
    DocumentsAiService,
    DocumentContextService,
    FitAssessmentService,
    BehaviorCalibrationService,
  ],
})
export class DocumentsModule {}
