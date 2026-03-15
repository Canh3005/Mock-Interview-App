import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Identity } from './entities/identity.entity';
import { UserProfile } from './entities/user-profile.entity';
import { UserCv } from './entities/user-cv.entity';
import { JdAnalysis } from './entities/jd-analysis.entity';
import { UsersController } from './users.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Identity, UserProfile, UserCv, JdAnalysis]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
