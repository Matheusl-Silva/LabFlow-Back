import { Controller, Post, Body, ConflictException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { QueryFailedError } from 'typeorm';
import { SignInDto } from './dto/signin.dto';
import { SignUpDto } from './dto/signup.dto';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/is-public.decorator';
import { AuthSwagger } from './auth.swagger';

@ApiTags('Auth')
@Controller('auth')
@Public()
export class AuthController {
    constructor(private authService: AuthService){}

  @AuthSwagger.signup()
  // Evita criação em massa de contas: 5 cadastros por minuto por IP.
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('signup')
  async signup(@Body() dto: SignUpDto): Promise<{ message: string }> {
    try {
      return await this.authService.signup(dto);
    } catch (err) {
      console.error(err);
      if (err instanceof QueryFailedError && err.driverError.code == '23505') {
        throw new ConflictException('User already registered');
      }
      throw err;
    }
  }

  @AuthSwagger.signin()
  @Public()
  // Brute force de senha: no máximo 5 tentativas por minuto por IP.
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('signin')
  async signin(@Body() dto: SignInDto): Promise<{ token: string }> {
    try {
      return await this.authService.signin(dto);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}
