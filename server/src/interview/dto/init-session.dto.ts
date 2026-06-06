import {
  CandidateLevel,
  InterviewLanguage,
  InterviewRound,
} from '../entities/interview-session.entity';

export class InitSessionDto {
  mode!: 'practice' | 'combat';
  rounds!: InterviewRound[];
  candidateLevel?: CandidateLevel;
  language?: InterviewLanguage;
  dsaProblemCount?: number;
  systemDesignDurationMinutes?: number;
  behavioralDepth?: 'broad' | 'deep';
  behavioralDurationMinutes?: number;
}
