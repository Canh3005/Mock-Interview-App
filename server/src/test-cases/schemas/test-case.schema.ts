import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TestCaseDocument = TestCase & Document;

@Schema({ timestamps: true })
export class TestCase {
  @Prop({ type: Types.ObjectId, ref: 'Problem', required: true })
  problemId: Types.ObjectId;

  @Prop({ required: true })
  inputData: string;

  @Prop({ required: true })
  expectedOutput: string;

  @Prop({ type: Boolean, default: false })
  isHidden: boolean;

  @Prop({ type: Number, default: 1 })
  weight: number;
}

export const TestCaseSchema = SchemaFactory.createForClass(TestCase);
