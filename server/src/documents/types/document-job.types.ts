import { DocumentUploadType } from '../enums/document-upload-type.enum.js';

export interface DocumentJobPayload {
  userId: string;
  recordId: string;
  filePath: string;
  originalName: string;
  mimeType: string;
  type: DocumentUploadType;
}
