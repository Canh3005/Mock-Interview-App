import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { UsersService } from './src/users/users.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const userId = '69a298e9065e22e290e6733f'; // Match user ID
  
  const Model = (usersService as any).identityModel;
  console.log("All identities count:", await Model.countDocuments());
  const allIdentities = await Model.find({}).exec();
  console.log("All identities:");
  allIdentities.forEach((doc: any) => {
    console.log(`- Provider: ${doc.provider}, userId: ${doc.userId}, type: ${typeof doc.userId}`);
  });
  
  console.log("Identities for user:", await usersService.getUserIdentities(userId));
  await app.close();
  process.exit(0);
}
bootstrap();
