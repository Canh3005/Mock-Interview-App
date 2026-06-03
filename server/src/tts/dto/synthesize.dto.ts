export class SynthesizeDto {
  text: string;
  voice?: string;
  speed?: number;
  level?: string;
  language?: 'vi' | 'en' | 'ja';
}
