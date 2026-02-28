import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, index: true })
  email: string;

  @Prop({ required: false, default: null })
  passwordHash?: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: null })
  avatarUrl: string;

  @Prop({ default: null })
  refreshTokenHash: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
