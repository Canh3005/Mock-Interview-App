import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TestCasesService } from './test-cases.service';
import { TestCasesController } from './test-cases.controller';
import { TestCase, TestCaseSchema } from './schemas/test-case.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: TestCase.name, schema: TestCaseSchema }]),
  ],
  controllers: [TestCasesController],
  providers: [TestCasesService],
})
export class TestCasesModule {}
