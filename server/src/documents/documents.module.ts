import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentsAiService } from './documents.ai.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'document-parsing',
    }),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentsAiService],
  exports: [DocumentsService, DocumentsAiService],
})
export class DocumentsModule {}
