import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProblemsService } from './problems.service';
import { ProblemsController } from './problems.controller';
import { Problem, ProblemSchema } from './schemas/problem.schema';
import { ProblemTemplate, ProblemTemplateSchema } from './schemas/problem-template.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Problem.name, schema: ProblemSchema },
      { name: ProblemTemplate.name, schema: ProblemTemplateSchema },
    ]),
  ],
  controllers: [ProblemsController],
  providers: [ProblemsService],
})
export class ProblemsModule {}
