import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';

export type IdentityDocument = Identity & Document;

@Schema({ timestamps: true })
export class Identity {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: User | Types.ObjectId;

  @Prop({ required: true })
  provider: string; // e.g., 'github'

  @Prop({ required: true })
  providerId: string; // The ID from the provider

  @Prop({ type: Object, default: {} })
  profileData: any; // Raw profile info for extra fields
}

export const IdentitySchema = SchemaFactory.createForClass(Identity);

// Ensure unique combination of provider and providerId
IdentitySchema.index({ provider: 1, providerId: 1 }, { unique: true });
// Optional: ensure a user doesn't link the same provider twice if desired
// IdentitySchema.index({ userId: 1, provider: 1 }, { unique: true });
