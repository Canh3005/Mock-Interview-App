import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Problem } from './problem.schema';

export type ProblemTemplateDocument = ProblemTemplate & Document;

@Schema({ timestamps: true })
export class ProblemTemplate {
  @Prop({ type: Types.ObjectId, ref: 'Problem', required: true })
  problemId: Problem | Types.ObjectId;

  @Prop({ required: true })
  languageId: string; // e.g., 'python', 'java', 'javascript'

  @Prop({ required: true })
  starterCode: string;

  @Prop({ required: true })
  driverCode: string;

  @Prop({ type: Number, required: true })
  timeLimitMs: number;

  @Prop({ type: Number, required: true })
  memoryLimitKb: number;
}

export const ProblemTemplateSchema = SchemaFactory.createForClass(ProblemTemplate);

// A problem can only have one template per language
ProblemTemplateSchema.index({ problemId: 1, languageId: 1 }, { unique: true });
