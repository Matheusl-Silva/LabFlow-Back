import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { MainDatabase } from './providers/database/main.db';
import { PatientModule } from './patient/patient.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    MainDatabase,
    UserModule,
    PatientModule,
    AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
