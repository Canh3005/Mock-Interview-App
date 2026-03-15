import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProblemsModule } from './problems/problems.module';
import { TestCasesModule } from './test-cases/test-cases.module';
import { JudgeModule } from './judge/judge.module';
import { BullModule } from '@nestjs/bullmq';
import { AiModule } from './ai/ai.module';
import { DocumentsModule } from './documents/documents.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('POSTGRES_HOST') || '127.0.0.1',
        port: configService.get<number>('POSTGRES_PORT') || 5432,
        username: configService.get<string>('POSTGRES_USER') || 'postgres',
        password: configService.get<string>('POSTGRES_PASSWORD') || 'postgres',
        database:
          configService.get<string>('POSTGRES_DB') || 'mock_interview_db',
        autoLoadEntities: true,
        synchronize: true, // TODO: Set to false in production and use migrations
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST') || '127.0.0.1',
          port: configService.get('REDIS_PORT') || 6379,
        },
      }),
      inject: [ConfigService],
    }),
    AiModule,
    UsersModule,
    AuthModule,
    ProblemsModule,
    TestCasesModule,
    JudgeModule,
    DocumentsModule,
    JobsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
