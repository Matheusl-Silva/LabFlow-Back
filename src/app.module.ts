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
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtGuard } from './common/guards/jwt.guard';
import { AdminGuard } from './common/guards/admin.guard';
import { AnamnesisModule } from './anamnesis/anamnesis.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    // Limite global de requisições por IP: 100 req/min. Rotas sensíveis (login)
    // sobrescrevem com um limite mais rígido via @Throttle no próprio handler.
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    MainDatabase,
    UserModule,
    PatientModule,
    ExamTemplateModule,
    ExamModule,
    AuthModule,
    AnamnesisModule,
    AuditModule],
  controllers: [AppController],
  providers: [
    AppService,
    // ThrottlerGuard primeiro: barra o excesso de requisições antes mesmo de
    // gastar CPU validando JWT.
    {provide: APP_GUARD, useClass: ThrottlerGuard},
    {provide: APP_GUARD, useClass: JwtGuard},
    {provide: APP_GUARD, useClass: AdminGuard}
  ],
})
export class AppModule {}
