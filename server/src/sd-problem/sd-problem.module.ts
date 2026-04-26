import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SDProblemService } from './sd-problem.service';
import {
  SDProblemController,
  SDProblemPublicController,
} from './sd-problem.controller';
import { SDProblem } from './entities/sd-problem.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SDProblem])],
  controllers: [SDProblemController, SDProblemPublicController],
  providers: [SDProblemService],
  exports: [SDProblemService],
})
export class SDProblemModule {}
