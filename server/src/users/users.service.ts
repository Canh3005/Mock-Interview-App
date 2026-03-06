import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Identity } from './entities/identity.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Identity) private identityRepository: Repository<Identity>,
  ) {}

  async create(userDto: Partial<User>): Promise<User> {
    const newUser = this.userRepository.create({
      id: uuidv4(),
      ...userDto,
    });
    return this.userRepository.save(newUser);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findIdentity(provider: string, providerId: string): Promise<Identity | null> {
    return this.identityRepository.findOne({ 
      where: { provider, providerId },
      relations: ['user'],
    });
  }

  async getUserIdentities(userId: string): Promise<string[]> {
    const identities = await this.identityRepository.find({ where: { userId } });
    return identities.map(id => id.provider);
  }

  async getUserFullIdentities(userId: string): Promise<Identity[]> {
    return this.identityRepository.find({ where: { userId } });
  }

  async linkIdentity(
    userId: string,
    provider: string,
    providerId: string,
    profileData: any = {},
  ): Promise<Identity> {
    // Check if this identity is already linked to SOMEONE
    const existing = await this.identityRepository.findOne({ where: { provider, providerId } });
    if (existing) {
      if (existing.userId === userId) {
        return existing; // Already linked to THIS user
      }
      throw new ConflictException('This social account is already linked to another user.');
    }

    const createdIdentity = this.identityRepository.create({
      id: uuidv4(),
      userId,
      provider,
      providerId,
      profileData,
    });
    return this.identityRepository.save(createdIdentity);
  }

  async handleOAuthUser(
    provider: string,
    providerId: string,
    profile: any,
    targetUserId?: string, // Pass if performing a link action
  ): Promise<User> {
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
      const user = await this.findById(identity.userId);
      return user!;
    }

    // 3. Not found by identity. Try to link by email IF verified.
    // For GitHub, we often rely on profile.emails being present if public.
    const email = profile.emails?.[0]?.value || profile._json?.email;
    const isEmailVerified = profile.emails?.[0]?.verified || profile._json?.email_verified || false;

    if (email && isEmailVerified) {
      const user = await this.findByEmail(email);
      if (user) {
        // Link identity to existing user
        await this.linkIdentity(user.id, provider, providerId, profile);
        return user;
      }
    }

    // 4. Create new user + identity if not found
    const newUser = await this.create({
      email: email || `${providerId}@${provider}.placeholder`, // Ensure we have something
      name: profile.displayName || profile.username || 'OAuth User',
      avatarUrl: profile.photos?.[0]?.value || profile._json?.avatar_url,
    });

    await this.linkIdentity(newUser.id, provider, providerId, profile);
    return newUser;
  }

  async updateRefreshToken(userId: string, hashedToken: string | null): Promise<void> {
    await this.userRepository.update(userId, {
      refreshTokenHash: hashedToken || undefined,
    });
  }
}
