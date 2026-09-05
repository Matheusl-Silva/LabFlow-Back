import { applyDecorators } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'
import { Role } from './enums/role.enum'

/**
 * Rota pública — espelha o decorator @Public() do guard.
 * Não exige autenticação. Sem cadeado no Swagger UI.
 */
export const SwaggerPublic = () => applyDecorators()

/**
 * Rota de usuário autenticado — espelha o decorator @Authenticated() do guard.
 * Exige token JWT válido, papel nenhum em particular. Exibe cadeado
 * "access-token" no Swagger UI.
 *
 * Para rota liberada por papel use SwaggerRoles(): ela diz QUAIS papéis
 * passam, que é a pergunta de quem lê a documentação.
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

/**
 * Rota liberada por papel — espelha @Roles(...) do guard.
 *
 * Existe porque anotá-las como SwaggerAdmin era herança do modelo binário
 * admin/comum: dizia "requer perfil admin" para rotas que um usuário comum com
 * o papel certo acessa. Aqui os papéis aceitos aparecem na própria descrição
 * do 403, que é o que quem integra precisa saber para pedir o acesso certo.
 *
 * Lista alternativas, não requisitos somados: basta ter UM dos papéis. O ADMIN
 * passa em qualquer um, como no RolesGuard.
 */
export const SwaggerRoles = (...roles: Role[]) =>
  applyDecorators(
    ApiBearerAuth('access-token'),
    ApiUnauthorizedResponse({
      description: 'Não autenticado — token ausente ou inválido',
    }),
    ApiForbiddenResponse({
      description:
        `Acesso negado — requer um destes papéis: ${roles.join(', ')}. ` +
        'ADMIN passa em qualquer um.',
    }),
  )
