import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SDSessionService } from './sd-session.service';
import { SDSessionController } from './sd-session.controller';
import { SDSession } from './entities/sd-session.entity';
import { SDProblem } from '../sd-problem/entities/sd-problem.entity';
import { InterviewSession } from '../interview/entities/interview-session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SDSession, SDProblem, InterviewSession])],
  controllers: [SDSessionController],
  providers: [SDSessionService],
  exports: [SDSessionService],
})
export class SDSessionModule {}
