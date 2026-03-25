import { Injectable } from '@nestjs/common';
import { BehavioralStageLog } from './entities/behavioral-stage-log.entity';
import { AIFacilitatorService } from './ai-facilitator.service';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MessageQualityService {
  constructor(private readonly aiFacilitator: AIFacilitatorService) {}

  processInputQuality(dto: SendMessageDto): {
    content: string;
    flags: string[];
  } {
    let { content } = dto;
    const flags: string[] = [];

    if (dto.inputType === 'text') {
      const { content: truncated, truncated: wasTruncated } =
        this.aiFacilitator.truncateAndFlag(content);
      content = truncated;
      if (wasTruncated) flags.push('INPUT_TRUNCATED');
    }

    return { content, flags };
  }

  isObviouslyIrrelevant(content: string): boolean {
    return this.aiFacilitator.isObviouslyIrrelevant(content);
  }

  // Counts consecutive off-topic AI responses (each corresponds to one off-topic user turn)
  countConsecutiveOffTopic(logs: BehavioralStageLog[]): number {
    let count = 0;
    const aiLogs = [...logs]
      .filter((l) => l.role === 'AI_FACILITATOR')
      .reverse();

    for (const log of aiLogs) {
      if (
        log.qualityFlags?.includes('OFF_TOPIC_FIRST') ||
        log.qualityFlags?.includes('OFF_TOPIC_REPEATED') ||
        log.qualityFlags?.includes('OFF_TOPIC_PERSISTENT')
      ) {
        count++;
      } else {
        break;
      }
    }

    return count;
  }

  buildOffTopicFlags(relevant: boolean, offTopicCount: number): string[] {
    if (relevant) return [];
    if (offTopicCount === 0) return ['OFF_TOPIC_FIRST'];
    if (offTopicCount === 1) return ['OFF_TOPIC_REPEATED'];
    return ['OFF_TOPIC_PERSISTENT'];
  }
}
