import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Identity, IdentityDocument } from './schemas/identity.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Identity.name) private identityModel: Model<IdentityDocument>,
  ) {}

  async create(userDto: Partial<User>): Promise<UserDocument> {
    const createdUser = new this.userModel(userDto);
    return createdUser.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findIdentity(provider: string, providerId: string): Promise<IdentityDocument | null> {
    return this.identityModel.findOne({ provider, providerId }).populate('userId').exec();
  }

  async getUserIdentities(userId: string): Promise<string[]> {
    const identities = await this.identityModel.find({ userId: userId }).exec();
    return identities.map(id => id.provider);
  }

  async getUserFullIdentities(userId: string): Promise<IdentityDocument[]> {
    return this.identityModel.find({ userId: userId }).exec();
  }

  async linkIdentity(
    userId: string | Types.ObjectId,
    provider: string,
    providerId: string,
    profileData: any = {},
  ): Promise<IdentityDocument> {
    // Check if this identity is already linked to SOMEONE
    const existing = await this.identityModel.findOne({ provider, providerId });
    if (existing) {
      if (existing.userId.toString() === userId.toString()) {
        return existing; // Already linked to THIS user
      }
      throw new ConflictException('This social account is already linked to another user.');
    }

    const createdIdentity = new this.identityModel({
      userId,
      provider,
      providerId,
      profileData,
    });
    return createdIdentity.save();
  }

  async handleOAuthUser(
    provider: string,
    providerId: string,
    profile: any,
    targetUserId?: string, // Pass if performing a link action
  ): Promise<UserDocument> {
    // 1. If targetUserId is provided, we are in "Account Linking" mode
    if (targetUserId) {
      await this.linkIdentity(targetUserId, provider, providerId, profile);
      const user = await this.findById(targetUserId);
      if (!user) throw new Error('User not found after linking');
      return user;
    }

    // 2. Try to find by existing identity
    const identity = await this.findIdentity(provider, providerId);
    if (identity && identity.userId) {
      return identity.userId as UserDocument;
    }

    // 3. Not found by identity. Try to link by email IF verified.
    // For GitHub, we often rely on profile.emails being present if public.
    const email = profile.emails?.[0]?.value || profile._json?.email;
    const isEmailVerified = profile.emails?.[0]?.verified || profile._json?.email_verified || false;

    if (email && isEmailVerified) {
      const user = await this.findByEmail(email);
      if (user) {
        // Link identity to existing user
        await this.linkIdentity((user._id as any).toString(), provider, providerId, profile);
        return user;
      }
    }

    // 4. Create new user + identity if not found
    const newUser = await this.create({
      email: email || `${providerId}@${provider}.placeholder`, // Ensure we have something
      name: profile.displayName || profile.username || 'OAuth User',
      avatarUrl: profile.photos?.[0]?.value || profile._json?.avatar_url,
    });

    await this.linkIdentity((newUser._id as any).toString(), provider, providerId, profile);
    return newUser;
  }

  async updateRefreshToken(userId: string, hashedToken: string | null): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      refreshTokenHash: hashedToken,
    });
  }
}
