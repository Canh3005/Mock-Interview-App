import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  Body,
  UseGuards,
  Req,
  Res,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentUploadType } from './enums/document-upload-type.enum.js';
import type { CvJson, JdJson } from './types/document-ai.types';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import {
  documentStorage,
  MAX_DOCUMENT_FILE_SIZE,
} from './constants/document-upload.constants';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload CV or JD (PDF or Image)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        type: {
          type: 'string',
          enum: Object.values(DocumentUploadType),
          description: 'Type of the document being uploaded (CV or JD)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded and job queued successfully.',
  })
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', documentStorage))
  async uploadFile(
    @Req() req: { user: { id: string } },
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: MAX_DOCUMENT_FILE_SIZE,
            message: 'File size must be less than or equal to 5MB.',
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('type') uploadType: DocumentUploadType,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }
    if (
      uploadType !== DocumentUploadType.CV &&
      uploadType !== DocumentUploadType.JD
    ) {
      throw new BadRequestException(
        'Invalid upload type. Must be "CV" or "JD".',
      );
    }

    const userId = req.user.id;
    return this.documentsService.queueDocumentForParsing(
      userId,
      file,
      uploadType,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update parsed JSON of the latest completed CV record',
  })
  @Patch('cv/current')
  async updateCvJson(
    @Req() req: { user: { id: string } },
    @Body() body: CvJson,
  ): Promise<void> {
    await this.documentsService.updateCvJson(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update parsed JSON of the latest completed JD record',
  })
  @Patch('jd/current')
  async updateJdJson(
    @Req() req: { user: { id: string } },
    @Body() body: JdJson,
  ): Promise<void> {
    await this.documentsService.updateJdJson(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get latest CV and JD context for the current user',
  })
  @Get('context')
  async getDocumentContext(@Req() req: { user: { id: string } }) {
    return this.documentsService.getDocumentContext(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get JD assessment history for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of past JD assessments with fitScore and matchReport.',
  })
  @Get('history')
  async getHistory(@Req() req: { user: { id: string } }) {
    return this.documentsService.getAssessmentHistory(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a JD assessment record' })
  @ApiResponse({ status: 200, description: 'Assessment deleted.' })
  @Delete('history/:id')
  async deleteHistory(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.documentsService.deleteAssessment(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'SSE stream for document parse result by jobId' })
  @Get('jobs/:jobId/stream')
  async streamParseResult(
    @Param('jobId') jobId: string,
    @Req() req: { user: { id: string } },
    @Res() res: Response,
  ): Promise<void> {
    await this.documentsService.streamParseResult(jobId, req.user.id, res);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Run CV/JD compatibility assessment' })
  @Post('compatibility-assessment')
  async runCompatibilityAssessment(@Req() req: { user: { id: string } }) {
    return this.documentsService.runCompatibilityAssessment(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get latest behavior calibration summary for current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Behavior calibration summary (user-facing only).',
  })
  @Get('calibration/latest')
  async getCalibrationLatest(@Req() req: { user: { id: string } }) {
    return this.documentsService.getCalibrationLatest(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'SSE stream — notifies when calibration completes' })
  @Get('calibration/stream')
  async streamCalibrationStatus(
    @Req() req: { user: { id: string } },
    @Res() res: Response,
  ): Promise<void> {
    await this.documentsService.streamCalibrationStatus(req.user.id, res);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current calibration profile + claims + risks' })
  @Get('calibration/current')
  async getCalibrationCurrent(@Req() req: { user: { id: string } }) {
    return this.documentsService.getCalibrationCurrent(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update calibration profile fields' })
  @Patch('calibration/:profileId')
  async updateCalibrationProfile(
    @Req() req: { user: { id: string } },
    @Param('profileId') profileId: string,
    @Body() body: Record<string, unknown>,
  ): Promise<void> {
    await this.documentsService.updateCalibrationProfile(
      req.user.id,
      profileId,
      body,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a new candidate claim to a profile' })
  @Post('calibration/:profileId/claims')
  async addClaim(
    @Req() req: { user: { id: string } },
    @Param('profileId') profileId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.documentsService.addClaim(req.user.id, profileId, body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a candidate claim' })
  @Patch('claims/:claimId')
  async updateClaim(
    @Req() req: { user: { id: string } },
    @Param('claimId') claimId: string,
    @Body() body: Record<string, unknown>,
  ): Promise<void> {
    await this.documentsService.updateClaim(req.user.id, claimId, body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a candidate claim' })
  @Delete('claims/:claimId')
  async deleteClaim(
    @Req() req: { user: { id: string } },
    @Param('claimId') claimId: string,
  ): Promise<void> {
    await this.documentsService.deleteClaim(req.user.id, claimId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a new risk hypothesis to a profile' })
  @Post('calibration/:profileId/risks')
  async addRisk(
    @Req() req: { user: { id: string } },
    @Param('profileId') profileId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.documentsService.addRisk(req.user.id, profileId, body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a risk hypothesis' })
  @Patch('risks/:riskId')
  async updateRisk(
    @Req() req: { user: { id: string } },
    @Param('riskId') riskId: string,
    @Body() body: Record<string, unknown>,
  ): Promise<void> {
    await this.documentsService.updateRisk(req.user.id, riskId, body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a risk hypothesis' })
  @Delete('risks/:riskId')
  async deleteRisk(
    @Req() req: { user: { id: string } },
    @Param('riskId') riskId: string,
  ): Promise<void> {
    await this.documentsService.deleteRisk(req.user.id, riskId);
  }
}
