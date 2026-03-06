import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Identity } from './entities/identity.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Identity]),
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
