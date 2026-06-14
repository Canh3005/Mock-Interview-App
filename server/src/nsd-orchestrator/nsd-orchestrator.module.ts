import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { NSDTurnRecordEntity } from './entities/nsd-turn-record.entity';
import { NSDPhaseSummaryEntity } from './entities/nsd-phase-summary.entity';
import { NSDOrchestratorService } from './nsd-orchestrator.service';
import { NSDPolicyEngineService } from './services/nsd-policy-engine.service';
import { NSDCanvasAnalyzerService } from './services/nsd-canvas-analyzer.service';
import { NSDResponderService } from './services/nsd-responder.service';
import { NSDAssessorService } from './services/nsd-assessor.service';
import { NSDRenderService } from './services/nsd-render.service';
import { NSDTurnPersisterService } from './services/nsd-turn-persister.service';
import { NSDStreamService } from './services/nsd-stream.service';
import { NSDGroupTurnService } from './services/nsd-group-turn.service';
import { NSDPhaseTransitionService } from './services/nsd-phase-transition.service';
import { NSDPhase1Service } from './phases/nsd-phase1.service';
import { NSDPhase2Service } from './phases/nsd-phase2.service';
import { NSDPhase3Service } from './phases/nsd-phase3.service';
import { NSDPhase4Service } from './phases/nsd-phase4.service';
import { NSDPhase5Service } from './phases/nsd-phase5.service';
import { NSDSessionModule } from '../nsd-session/nsd-session.module';
import { AiModule } from '../ai/ai.module';
import { NSD_EVALUATION_QUEUE } from '../jobs/jobs.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([NSDTurnRecordEntity, NSDPhaseSummaryEntity]),
    BullModule.registerQueue({ name: NSD_EVALUATION_QUEUE }),
    NSDSessionModule,
    AiModule,
  ],
  providers: [
    NSDOrchestratorService,
    NSDPolicyEngineService,
    NSDCanvasAnalyzerService,
    NSDResponderService,
    NSDAssessorService,
    NSDRenderService,
    NSDTurnPersisterService,
    NSDStreamService,
    NSDGroupTurnService,
    NSDPhaseTransitionService,
    NSDPhase1Service,
    NSDPhase2Service,
    NSDPhase3Service,
    NSDPhase4Service,
    NSDPhase5Service,
  ],
  exports: [NSDOrchestratorService, NSDTurnPersisterService],
})
export class NSDOrchestratorModule {}
