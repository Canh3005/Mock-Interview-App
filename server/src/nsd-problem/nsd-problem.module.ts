import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NSDProblemService } from './nsd-problem.service';
import {
  NSDProblemController,
  NSDProblemPublicController,
} from './nsd-problem.controller';
import { NSDProblem } from './entities/nsd-problem.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NSDProblem])],
  controllers: [NSDProblemPublicController, NSDProblemController],
  providers: [NSDProblemService],
  exports: [NSDProblemService],
})
export class NSDProblemModule {}
