import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum ProblemDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum ProblemStatus {
  DRAFT = 'DRAFT',
  VERIFIED = 'VERIFIED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export type ProblemDocument = Problem & Document;

@Schema({ timestamps: true })
export class Problem {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ type: String, enum: ProblemDifficulty, required: true })
  difficulty: ProblemDifficulty;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], default: [] })
  constraints: string[];

  @Prop({ type: Number, default: 1.0 })
  timeLimitMultiplier: number;

  @Prop({ type: String, enum: ProblemStatus, default: ProblemStatus.DRAFT })
  status: ProblemStatus;

  @Prop({ type: [String], default: [] })
  tags: string[];
}

export const ProblemSchema = SchemaFactory.createForClass(Problem);
