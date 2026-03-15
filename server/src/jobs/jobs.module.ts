import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentWorker } from './workers/document.worker';
import { DocumentsModule } from '../documents/documents.module';
import { UserCv } from '../users/entities/user-cv.entity';
import { JdAnalysis } from '../users/entities/jd-analysis.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserCv, JdAnalysis]),
    BullModule.registerQueue({
      name: 'document-parsing',
    }),
    DocumentsModule,
  ],
  providers: [DocumentWorker],
})
export class JobsModule {}
