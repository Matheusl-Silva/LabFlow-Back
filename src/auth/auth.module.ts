import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { User } from '../entities/user.entity';
import { UserRole } from '../entities/user-role.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { JwtStrategy } from '../common/strategy/jwt.strategy';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserRole, RefreshToken]), JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
