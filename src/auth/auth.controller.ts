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
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/is-public.decorator';
import { AuthSwagger } from './auth.swagger';
import type { UserView } from '../user/user.service';
import {
  REFRESH_COOKIE_NAME,
  clearAccessCookie,
  clearRefreshCookie,
  setAccessCookie,
  setRefreshCookie,
} from './auth-cookies';

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
    // `passthrough: true`: precisamos do Response só para escrever os cookies —
    // sem ele o Nest deixaria de serializar o retorno do método.
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: UserView }> {
    try {
      const session = await this.authService.signin(dto);
      setAccessCookie(
        res,
        this.config,
        session.token,
        session.accessExpiresAt,
      );
      setRefreshCookie(
        res,
        this.config,
        session.refreshToken,
        session.refreshExpiresAt,
      );
      // NENHUM dos dois tokens vai no corpo: se fossem, o JavaScript da página
      // poderia lê-los e guardá-los, e os cookies httpOnly perderiam a razão
      // de existir. O corpo devolve só o perfil, que a interface precisa para
      // saber o nome e os papéis de quem entrou.
      return { user: session.user };
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
  // 204: a renovação inteira acontece nos cookies. Devolver o access token no
  // corpo o exporia ao JavaScript da página justamente no ponto que este
  // desenho existe para fechar.
  @HttpCode(204)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    if (!rawToken) throw new UnauthorizedException('Sessão não encontrada');

    try {
      const session = await this.authService.refresh(rawToken);
      setAccessCookie(
        res,
        this.config,
        session.token,
        session.accessExpiresAt,
      );
      setRefreshCookie(
        res,
        this.config,
        session.refreshToken,
        session.refreshExpiresAt,
      );
    } catch (err) {
      // Só sessão de fato inválida apaga os cookies: um cookie que não renova
      // mais só atrapalha. Erro transitório (banco reiniciando, por exemplo)
      // NÃO entra aqui — apagar o refresh nesse caso transformaria uma falha de
      // segundos em logout de todas as sessões abertas.
      if (err instanceof UnauthorizedException) {
        clearAccessCookie(res, this.config);
        clearRefreshCookie(res, this.config);
      }
      throw err;
    }
  }

  @AuthSwagger.forgotPassword()
  // Mais rígido que o login: cada requisição aqui dispara um e-mail para um
  // endereço que quem chama escolheu. Sem um teto baixo, a rota vira ferramenta
  // de spam contra terceiros — e o custo do envio é nosso.
  @Throttle({ default: { ttl: 900_000, limit: 5 } })
  // 202, não 200: a resposta sai antes de saber se o e-mail chegou, e é a mesma
  // para conta existente ou não.
  @HttpCode(202)
  @Post('forgot-password')
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto.email);
  }

  @AuthSwagger.resetPassword()
  // Folgado perto do pedido: quem tem o link legítimo pode errar a nova senha
  // algumas vezes nas regras de complexidade. Adivinhar um token de 32 bytes
  // não é o que este limite impede.
  @Throttle({ default: { ttl: 900_000, limit: 20 } })
  @HttpCode(200)
  @Post('reset-password')
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const result = await this.authService.resetPassword(dto.token, dto.pass);
    // As sessões já caíram no servidor. O cookie deste navegador precisa ir
    // junto: mantê-lo faria o front tentar renovar com um refresh revogado e
    // tomar 401 na primeira navegação depois da troca.
    clearRefreshCookie(res, this.config);
    return result;
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
    // Fora do `if`: sair da sessão sempre limpa os cookies, mesmo que o token
    // já não exista mais do lado do servidor. O access não é revogável (é um
    // JWT), então apagá-lo aqui é o que encerra o acesso de imediato — o que
    // sobra são os 15 min de validade de uma cópia que alguém tivesse feito.
    clearAccessCookie(res, this.config);
    clearRefreshCookie(res, this.config);
  }
}
