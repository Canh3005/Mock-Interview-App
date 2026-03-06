import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TestCasesService } from './test-cases.service';
import { CreateTestCaseDto } from './dto/create-test-case.dto';
import { UpdateTestCaseDto } from './dto/update-test-case.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/entities/user.entity';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class TestCasesController {
  constructor(private readonly testCasesService: TestCasesService) {}

  @Post('problems/:problemId/testcases')
  create(@Param('problemId') problemId: string, @Body() createTestCaseDto: CreateTestCaseDto) {
    // Override problemId from path
    return this.testCasesService.create({ ...createTestCaseDto, problemId } as any);
  }

  @Get('problems/:problemId/testcases')
  findAllByProblem(@Param('problemId') problemId: string) {
    return this.testCasesService.findAllByProblem(problemId);
  }

  @Get('testcases/:id')
  findOne(@Param('id') id: string) {
    return this.testCasesService.findOne(id);
  }

  @Patch('testcases/:id')
  update(@Param('id') id: string, @Body() updateTestCaseDto: UpdateTestCaseDto) {
    return this.testCasesService.update(id, updateTestCaseDto);
  }

  @Delete('testcases/:id')
  remove(@Param('id') id: string) {
    return this.testCasesService.remove(id);
  }

  @Post('problems/:problemId/testcases/upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadBulk(
    @Param('problemId') problemId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.testCasesService.uploadBulk(problemId, file);
  }
}
