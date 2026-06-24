import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { MainDatabase } from './providers/database/main.db';
import { PatientModule } from './patient/patient.module';
import { ExamTemplateModule } from './exam-template/exam-template.module';
import { ExamModule } from './exam/exam.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtGuard } from './common/guards/jwt.guard';
import { AdminGuard } from './common/guards/admin.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    MainDatabase,
    UserModule,
    PatientModule,
    ExamTemplateModule,
    ExamModule,
    AuthModule],
  controllers: [AppController],
  providers: [
    AppService,
    {provide: APP_GUARD, useClass: JwtGuard},
    {provide: APP_GUARD, useClass: AdminGuard}
  ],
})
export class AppModule {}
