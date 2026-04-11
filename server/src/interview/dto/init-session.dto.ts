import { InterviewLanguage } from '../entities/interview-session.entity';

export class InitSessionDto {
  mode: 'practice' | 'combat';
  rounds: string[];
  candidateLevel?: 'junior' | 'mid' | 'senior';
  language?: InterviewLanguage;
}
