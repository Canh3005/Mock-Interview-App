export class SendMessageDto {
  content: string;
  inputType: 'text' | 'voice';
  voiceTranscript?: string;
}
