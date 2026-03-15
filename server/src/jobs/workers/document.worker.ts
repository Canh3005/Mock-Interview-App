import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCv } from '../../users/entities/user-cv.entity';
import { JdAnalysis } from '../../users/entities/jd-analysis.entity';
import { DocumentsAiService } from '../../documents/documents.ai.service';
import * as fs from 'fs';
const pdfParse = require('pdf-parse');
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Processor('document-parsing')
export class DocumentWorker extends WorkerHost {
  private readonly logger = new Logger(DocumentWorker.name);
  private redisClient: Redis;

  constructor(
    @InjectRepository(UserCv) private cvRepository: Repository<UserCv>,
    @InjectRepository(JdAnalysis) private jdRepository: Repository<JdAnalysis>,
    private configService: ConfigService,
    private aiService: DocumentsAiService,
  ) {
    super();
    this.redisClient = new Redis({
      host: this.configService.get('REDIS_HOST') || '127.0.0.1',
      port: this.configService.get('REDIS_PORT') || 6379,
    });
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(
      `Processing job ${job.id} of type ${job.name} (Data Type: ${job.data.type})`,
    );

    const { userId, filePath, originalName, type } = job.data;
    const dataBuffer = fs.readFileSync(filePath);
    let extractedContent: any = '';
    const lowerName = originalName.toLowerCase();
    const isImage =
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.webp');

    try {
      if (isImage) {
        let mimeType = 'image/jpeg';
        if (lowerName.endsWith('.png')) mimeType = 'image/png';
        if (lowerName.endsWith('.webp')) mimeType = 'image/webp';

        extractedContent = {
          inlineData: {
            data: dataBuffer.toString('base64'),
            mimeType: mimeType,
          },
        };
      } else {
        const pdfData = await pdfParse(dataBuffer);
        extractedContent = pdfData.text;
      }
    } catch (e) {
      this.logger.error(`Error parsing document: ${e.message}`, e.stack);
      throw e;
    }

    if (type === 'CV') {
      const cvJson = await this.aiService.extractCvJson(extractedContent);
      this.logger.log('CV JSON extracted successfully');

      let cvRecord = await this.cvRepository.findOne({ where: { userId } });
      if (cvRecord) {
        cvRecord.fileUrl = filePath;
        cvRecord.originalName = originalName;
        cvRecord.parsedJson = cvJson;
      } else {
        cvRecord = this.cvRepository.create({
          userId,
          fileUrl: filePath,
          originalName,
          parsedJson: cvJson,
        });
      }
      await this.cvRepository.save(cvRecord);

      // Cache in Redis
      await this.redisClient.set(
        `cv_context:${userId}`,
        JSON.stringify(cvJson),
        'EX',
        86400 * 7,
      );

      // AUTO-SYNC to User Profile
      try {
        const userProfileRepo =
          this.cvRepository.manager.getRepository('UserProfile');
        const profile = (await userProfileRepo.findOne({
          where: { user: { id: userId } },
        })) as any;

        const flatTechStack = [
          ...(cvJson.skills?.languages || []),
          ...(cvJson.skills?.frameworks || []),
          ...(cvJson.skills?.tools || []),
        ];

        if (profile) {
          profile.techStack = Array.from(
            new Set([...(profile.techStack || []), ...flatTechStack]),
          );
          profile.experience = cvJson.experiences || [];
          if (!profile.role && cvJson.experiences?.length > 0) {
            profile.role = cvJson.experiences[0].role;
          }
          await userProfileRepo.save(profile);
          this.logger.log(`Auto-synced CV data to UserProfile for ${userId}`);
        }
      } catch (syncErr) {
        this.logger.error(`Failed to auto-sync profile: ${syncErr.message}`);
      }

      this.logger.log(`CV parsed and cached successfully for user ${userId}`);
      return { status: 'success', type: 'CV', recordId: cvRecord.id };
    } else if (type === 'JD') {
      const jdJson = await this.aiService.extractJdJson(extractedContent);

      let fitScore = null;
      let matchReport = null;

      const cachedCv = await this.redisClient.get(`cv_context:${userId}`);
      if (cachedCv) {
        const assessment = await this.aiService.assessFitScore(
          JSON.parse(cachedCv),
          jdJson,
        );
        fitScore = assessment.fit_score;
        matchReport = assessment.gap_analysis;
      }

      const jdRecord = this.jdRepository.create({
        userId,
        fileUrl: filePath,
        originalName,
        parsedJson: jdJson,
        fitScore,
        matchReport,
      });
      await this.jdRepository.save(jdRecord);

      // Cache JD in Redis
      await this.redisClient.set(
        `jd_context:${userId}`,
        JSON.stringify(jdJson),
        'EX',
        86400 * 7,
      );
      this.logger.log(`JD parsed and cached successfully for user ${userId}`);
      return {
        status: 'success',
        type: 'JD',
        recordId: jdRecord.id,
        fitScore,
        gapAnalysis: matchReport,
      };
    }

    throw new Error(`Unknown job data type: ${type}`);
  }
}
