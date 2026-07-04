import { Controller, Post, Body, ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { SignInDto } from './dto/signin.dto';
import { SignUpDto } from './dto/signup.dto.ts';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/is-public.decorator';

@Controller('auth')
@Public()
export class AuthController {
    constructor(private authService: AuthService){}
  @Post('signup')
  async signup(@Body() dto: SignUpDto): Promise<{ token: string }> {
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

  @Post('signin')
  async signin(@Body() dto: SignInDto): Promise<{ token: string }> {
    try {
      return this.authService.signin(dto);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}
