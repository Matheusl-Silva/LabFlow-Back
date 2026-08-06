import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { UserRole } from '../entities/user-role.entity';
import { Exam } from '../entities/exam.entity';
import { JwtModule } from '@nestjs/jwt';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserRole, Exam]),
    JwtModule.register({}),
    AuditModule,
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
