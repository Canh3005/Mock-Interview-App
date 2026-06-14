import { Module } from '@nestjs/common';
import { NSDInterviewerController } from './nsd-interviewer.controller';
import { NSDOrchestratorModule } from '../nsd-orchestrator/nsd-orchestrator.module';

@Module({
  imports: [NSDOrchestratorModule],
  controllers: [NSDInterviewerController],
})
export class NSDInterviewerModule {}
