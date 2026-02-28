import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Use cookie parser for HttpOnly Refresh Tokens
  app.use(cookieParser());

  // Enable CORS for React frontend (which uses credentials for cookies)
  app.enableCors({
    origin: 'http://localhost:5173', // Vite default port
    credentials: true,
  });

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('Mock Interview App API')
    .setDescription('Full-Stack Authentication API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory);

  // Change default port to 3001 to avoid conflicting with Vite
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
