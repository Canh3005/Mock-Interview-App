export interface GroqMessage {
  role: 'user' | 'model' | 'system';
  parts: { text: string }[];
}
