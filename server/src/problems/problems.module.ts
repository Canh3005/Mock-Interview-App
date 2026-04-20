import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProblemsService } from './problems.service';
import {
  ProblemsController,
  PublicProblemsController,
} from './problems.controller';
import { Problem } from './entities/problem.entity';
import { ProblemTemplate } from './entities/problem-template.entity';
import { TestCase } from '../test-cases/entities/test-case.entity';
import { JudgeModule } from '../judge/judge.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Problem, ProblemTemplate, TestCase]),
    JudgeModule,
  ],
  controllers: [ProblemsController, PublicProblemsController],
  providers: [ProblemsService],
  exports: [ProblemsService],
})
export class ProblemsModule {}
