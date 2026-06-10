import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SDTurnRecord } from './entities/sd-turn-record.entity';
import { SDStageSummary } from './entities/sd-stage-summary.entity';
import { SDGraphSnapshotEntity } from './entities/sd-graph-snapshot.entity';
import { SDOrchestratorService } from './sd-orchestrator.service';
import { SDPolicyEngineService } from './sd-policy-engine.service';
import { SDResponseAssessmentService } from './sd-response-assessment.service';
import { SDQuestionRendererService } from './sd-question-renderer.service';
import { SDDrawingTransitionService } from './sd-drawing-transition.service';
import { SDClarificationPlannerService } from './planners/sd-clarification-planner.service';
import { SDClarificationAssessorService } from './assessors/sd-clarification-assessor.service';
import { SDWalkthroughPlannerService } from './planners/sd-walkthrough-planner.service';
import { SDWalkthroughAssessorService } from './assessors/sd-walkthrough-assessor.service';
import { SDDeepDivePlannerService } from './planners/sd-deep-dive-planner.service';
import { SDDeepDiveAssessorService } from './assessors/sd-deep-dive-assessor.service';
import { SDWrapUpPlannerService } from './planners/sd-wrap-up-planner.service';
import { SDWrapUpAssessorService } from './assessors/sd-wrap-up-assessor.service';
import { SDGraphAnalysisService } from './assessors/sd-graph-analysis.service';
import { SDSession } from '../sd-session/entities/sd-session.entity';
import { SDProblem } from '../sd-problem/entities/sd-problem.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SDTurnRecord,
      SDStageSummary,
      SDGraphSnapshotEntity,
      SDSession,
      SDProblem,
    ]),
    AiModule,
  ],
  providers: [
    SDOrchestratorService,
    SDPolicyEngineService,
    SDResponseAssessmentService,
    SDQuestionRendererService,
    SDDrawingTransitionService,
    SDClarificationPlannerService,
    SDClarificationAssessorService,
    SDWalkthroughPlannerService,
    SDWalkthroughAssessorService,
    SDDeepDivePlannerService,
    SDDeepDiveAssessorService,
    SDWrapUpPlannerService,
    SDWrapUpAssessorService,
    SDGraphAnalysisService,
  ],
  exports: [SDOrchestratorService],
})
export class SDOrchestratorModule {}
