import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PracticeDSAController } from './practice-dsa.controller';
import { PracticeDSAService } from './practice-dsa.service';
import { LiveCodingSession } from '../live-coding/entities/live-coding-session.entity';
import { LiveCodingSessionProblem } from '../live-coding/entities/live-coding-session-problem.entity';
import { UserSolvedProblem } from './entities/user-solved-problem.entity';
import { LiveCodingModule } from '../live-coding/live-coding.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LiveCodingSession,
      LiveCodingSessionProblem,
      UserSolvedProblem,
    ]),
    LiveCodingModule,
  ],
  controllers: [PracticeDSAController],
  providers: [PracticeDSAService],
})
export class PracticeDSAModule {}
