import {
  Controller,
  Post,
  Body,
  ConflictException,
  HttpCode,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { QueryFailedError } from 'typeorm';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { SignInDto } from './dto/signin.dto';
import { SignUpDto } from './dto/signup.dto';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/is-public.decorator';
import { AuthSwagger } from './auth.swagger';
import {
  REFRESH_COOKIE_NAME,
  clearRefreshCookie,
  setRefreshCookie,
} from './refresh-cookie';

@ApiTags('Auth')
@Controller('auth')
@Public()
export class AuthController {
    constructor(private authService: AuthService,
                private config: ConfigService){}

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
  async signin(
    @Body() dto: SignInDto,
    // `passthrough: true`: precisamos do Response só para escrever o cookie —
    // sem ele o Nest deixaria de serializar o retorno do método.
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ token: string }> {
    try {
      const session = await this.authService.signin(dto);
      setRefreshCookie(
        res,
        this.config,
        session.refreshToken,
        session.refreshExpiresAt,
      );
      // O refresh NÃO vai no corpo: se fosse, o JavaScript da página poderia
      // lê-lo, e o cookie httpOnly perderia a razão de existir.
      return { token: session.token };
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  @AuthSwagger.refresh()
  // Generoso perto do login: renovar é operação legítima e frequente (uma por
  // aba a cada 15 min), e adivinhar um token de 32 bytes não é o que o rate
  // limit está impedindo aqui.
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @HttpCode(200)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ token: string }> {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    if (!rawToken) throw new UnauthorizedException('Sessão não encontrada');

    try {
      const session = await this.authService.refresh(rawToken);
      setRefreshCookie(
        res,
        this.config,
        session.refreshToken,
        session.refreshExpiresAt,
      );
      return { token: session.token };
    } catch (err) {
      // Só sessão de fato inválida apaga o cookie: um cookie que não renova
      // mais só atrapalha. Erro transitório (banco reiniciando, por exemplo)
      // NÃO entra aqui — apagar o refresh nesse caso transformaria uma falha de
      // segundos em logout de todas as sessões abertas.
      if (err instanceof UnauthorizedException) {
        clearRefreshCookie(res, this.config);
      }
      throw err;
    }
  }

  @AuthSwagger.logout()
  @HttpCode(204)
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    if (rawToken) await this.authService.logout(rawToken);
    // Fora do `if`: sair da sessão sempre limpa o cookie, mesmo que o token já
    // não exista mais do lado do servidor.
    clearRefreshCookie(res, this.config);
  }
}
