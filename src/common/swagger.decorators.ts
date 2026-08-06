import { applyDecorators } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'

/**
 * Rota pública — espelha o decorator @Public() do guard.
 * Não exige autenticação. Sem cadeado no Swagger UI.
 */
export const SwaggerPublic = () => applyDecorators()

/**
 * Rota de usuário autenticado — espelha os decorators @Authenticated() e
 * @Roles() do guard. Exige token JWT válido. Exibe cadeado "access-token" no
 * Swagger UI.
 */
export const SwaggerAuthUser = () =>
  applyDecorators(
    ApiBearerAuth('access-token'),
    ApiUnauthorizedResponse({ description: 'Não autenticado — token ausente ou inválido' }),
  )

/**
 * Rota exclusiva de admin — comportamento padrão do sistema.
 * Exige token JWT com perfil admin. Exibe cadeado "admin-token" no Swagger UI.
 */
export const SwaggerAdmin = () =>
  applyDecorators(
    ApiBearerAuth('admin-token'),
    ApiUnauthorizedResponse({ description: 'Não autenticado — token ausente ou inválido' }),
    ApiForbiddenResponse({ description: 'Acesso negado — requer perfil admin' }),
  )
