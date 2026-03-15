import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTestCaseDto } from './dto/create-test-case.dto';
import { UpdateTestCaseDto } from './dto/update-test-case.dto';
import { TestCase } from './entities/test-case.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TestCasesService {
  constructor(
    @InjectRepository(TestCase)
    private testCaseRepository: Repository<TestCase>,
  ) {}

  async create(createTestCaseDto: CreateTestCaseDto) {
    const createdTestCase = this.testCaseRepository.create({
      id: uuidv4(),
      ...createTestCaseDto,
    });
    return this.testCaseRepository.save(createdTestCase);
  }

  async findAllByProblem(problemId: string) {
    return this.testCaseRepository.find({
      where: { problemId },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string) {
    const testCase = await this.testCaseRepository.findOne({ where: { id } });
    if (!testCase) {
      throw new NotFoundException(`TestCase #${id} not found`);
    }
    return testCase;
  }

  async update(id: string, updateTestCaseDto: UpdateTestCaseDto) {
    const testCaseToUpdate = await this.testCaseRepository.preload({
      id,
      ...updateTestCaseDto,
    });

    if (!testCaseToUpdate) {
      throw new NotFoundException(`TestCase #${id} not found`);
    }

    return this.testCaseRepository.save(testCaseToUpdate);
  }

  async remove(id: string) {
    const testCase = await this.findOne(id);
    await this.testCaseRepository.remove(testCase);
    return testCase;
  }

  async uploadBulk(problemId: string, file: Express.Multer.File) {
    // Placeholder logic for ZIP extraction and parsing
    // In production, this would use a library like yauzl to read the zip,
    // match 1.in with 1.out, and bulk insert into DB/S3.
    console.log(
      `Received bulk testcases file for problem ${problemId}`,
      file.originalname,
    );
    return {
      success: true,
      message: 'Bulk uploaded successfully (Placeholder)',
    };
  }
}
