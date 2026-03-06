import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProblemsService } from './problems.service';
import { ProblemsController } from './problems.controller';
import { Problem } from './entities/problem.entity';
import { ProblemTemplate } from './entities/problem-template.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Problem, ProblemTemplate]),
  ],
  controllers: [ProblemsController],
  providers: [ProblemsService],
})
export class ProblemsModule {}
