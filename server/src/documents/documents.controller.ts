import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  Body,
  UseGuards,
  Req,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentUploadType } from './enums/document-upload-type.enum.js';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';

const MAX_DOCUMENT_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const documentStorage = {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(
        null,
        `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`,
      );
    },
  }),
  limits: {
    fileSize: MAX_DOCUMENT_FILE_SIZE,
  },
};

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
  @ApiOperation({ summary: 'Check status of document parsing job' })
  @ApiResponse({
    status: 200,
    description: 'Return current status of the background task.',
  })
  @Get('status/:jobId')
  async getStatus(@Param('jobId') jobId: string) {
    return this.documentsService.getJobStatus(jobId);
  }
}
