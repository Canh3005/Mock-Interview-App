export class InitSessionDto {
  mode: 'practice' | 'combat';
  rounds: string[];
  candidateLevel?: 'junior' | 'mid' | 'senior';
}
