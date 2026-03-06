import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateTestCaseDto } from './dto/create-test-case.dto';
import { UpdateTestCaseDto } from './dto/update-test-case.dto';
import { TestCase, TestCaseDocument } from './schemas/test-case.schema';

@Injectable()
export class TestCasesService {
  constructor(
    @InjectModel(TestCase.name) private testCaseModel: Model<TestCaseDocument>,
  ) {}

  async create(createTestCaseDto: CreateTestCaseDto) {
    const createdTestCase = new this.testCaseModel(createTestCaseDto);
    return createdTestCase.save();
  }

  async findAllByProblem(problemId: string) {
    return this.testCaseModel.find({ problemId }).sort({ createdAt: 1 }).exec();
  }

  async findOne(id: string) {
    const testCase = await this.testCaseModel.findById(id).exec();
    if (!testCase) {
      throw new NotFoundException(`TestCase #${id} not found`);
    }
    return testCase;
  }

  async update(id: string, updateTestCaseDto: UpdateTestCaseDto) {
    const existingTestCase = await this.testCaseModel
      .findByIdAndUpdate(id, updateTestCaseDto, { new: true })
      .exec();
    if (!existingTestCase) {
      throw new NotFoundException(`TestCase #${id} not found`);
    }
    return existingTestCase;
  }

  async remove(id: string) {
    const deletedTestCase = await this.testCaseModel.findByIdAndDelete(id).exec();
    if (!deletedTestCase) {
      throw new NotFoundException(`TestCase #${id} not found`);
    }
    return deletedTestCase;
  }

  async uploadBulk(problemId: string, file: Express.Multer.File) {
    // Placeholder logic for ZIP extraction and parsing
    // In production, this would use a library like yauzl to read the zip,
    // match 1.in with 1.out, and bulk insert into DB/S3.
    console.log(`Received bulk testcases file for problem ${problemId}`, file.originalname);
    return { success: true, message: 'Bulk uploaded successfully (Placeholder)' };
  }
}
