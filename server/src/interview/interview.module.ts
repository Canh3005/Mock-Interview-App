import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import { InterviewSession } from './entities/interview-session.entity';
import { BehavioralSession } from '../behavioral/entities/behavioral-session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InterviewSession, BehavioralSession])],
  controllers: [InterviewController],
  providers: [InterviewService],
  exports: [InterviewService],
})
export class InterviewModule {}
