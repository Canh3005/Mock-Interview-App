import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { Problem, ProblemDocument, ProblemStatus } from './schemas/problem.schema';
import { ProblemTemplate, ProblemTemplateDocument } from './schemas/problem-template.schema';

@Injectable()
export class ProblemsService {
  constructor(
    @InjectModel(Problem.name) private problemModel: Model<ProblemDocument>,
    @InjectModel(ProblemTemplate.name) private problemTemplateModel: Model<ProblemTemplateDocument>,
  ) {}

  async create(createProblemDto: CreateProblemDto) {
    const createdProblem = new this.problemModel(createProblemDto);
    return createdProblem.save();
  }

  async findAll(page = 1, limit = 10, search = '', difficulty = '') {
    const query: any = {};
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    if (difficulty) {
      query.difficulty = difficulty;
    }

    const total = await this.problemModel.countDocuments(query);
    const problems = await this.problemModel
      .find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    return { total, page, limit, data: problems };
  }

  async findOne(id: string) {
    const problem = await this.problemModel.findById(id).exec();
    if (!problem) {
      throw new NotFoundException(`Problem #${id} not found`);
    }
    return problem;
  }

  async update(id: string, updateProblemDto: UpdateProblemDto) {
    const existingProblem = await this.problemModel
      .findByIdAndUpdate(id, updateProblemDto, { new: true })
      .exec();
    if (!existingProblem) {
      throw new NotFoundException(`Problem #${id} not found`);
    }
    return existingProblem;
  }

  async remove(id: string) {
    const deletedProblem = await this.problemModel.findByIdAndDelete(id).exec();
    if (!deletedProblem) {
      throw new NotFoundException(`Problem #${id} not found`);
    }
    await this.problemTemplateModel.deleteMany({ problemId: id }).exec();
    return deletedProblem;
  }

  async verify(id: string, solutionCode: string) {
    // Placeholder for actual Engine Verification logic
    const problem = await this.problemModel.findById(id).exec();
    if (!problem) {
      throw new NotFoundException(`Problem #${id} not found`);
    }
    // Assume verification passed for now
    problem.status = ProblemStatus.VERIFIED;
    return problem.save();
  }
}
