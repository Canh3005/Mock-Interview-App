import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SDSession } from '../sd-session/entities/sd-session.entity';
import { SDInterviewerController } from './sd-interviewer.controller';
import { SDInterviewerService } from './sd-interviewer.service';

@Module({
  imports: [TypeOrmModule.forFeature([SDSession])],
  controllers: [SDInterviewerController],
  providers: [SDInterviewerService],
})
export class SDInterviewerModule {}
