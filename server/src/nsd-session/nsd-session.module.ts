import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NSDSessionService } from './nsd-session.service';
import { NSDSessionController } from './nsd-session.controller';
import { NSDSession } from './entities/nsd-session.entity';
import { NSDProblemModule } from '../nsd-problem/nsd-problem.module';
import { InterviewSession } from '../interview/entities/interview-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([NSDSession, InterviewSession]),
    NSDProblemModule,
  ],
  controllers: [NSDSessionController],
  providers: [NSDSessionService],
  exports: [NSDSessionService],
})
export class NSDSessionModule {}
