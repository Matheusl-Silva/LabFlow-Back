import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/is-public.decorator';
import { IS_AUTHENTICATED_KEY } from '../decorators/authenticated.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';
import type { JwtPayload } from '../types/jwt.payload.type';

/**
 * Guard de autorização por papel. Substitui o AdminGuard, preservando o
 * comportamento FAIL-CLOSED: rota sem decorator nenhum continua sendo
 * exclusiva de administrador.
 *
 * Ordem de decisão:
 *   @Public()          → passa sem autenticação
 *   sem `user`         → 401 (o JwtGuard deveria ter rodado antes)
 *   papel ADMIN        → passa em tudo
 *   @Authenticated()   → passa qualquer usuário logado
 *   @Roles(A, B)       → passa quem tem A OU B
 *   nada disso         → 403 (padrão admin-only)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    // Falha fechado se a ordem dos guards mudar e este rodar antes da
    // autenticação: 401 em vez de TypeError.
    if (!user) throw new UnauthorizedException();

    const payload = user as JwtPayload;
    const roles = payload.roles ?? [];

    if (roles.includes(Role.ADMIN)) return true;

    if (this.reflector.getAllAndOverride<boolean>(IS_AUTHENTICATED_KEY, targets)) {
      return true;
    }

    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, targets);
    if (!required?.length) throw new ForbiddenException();

    // `some`: os papéis listados são alternativas, não requisitos somados.
    if (!required.some((role) => roles.includes(role))) {
      throw new ForbiddenException();
    }

    return true;
  }
}
