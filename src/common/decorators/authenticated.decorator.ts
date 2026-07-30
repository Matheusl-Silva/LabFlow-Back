import { SetMetadata } from '@nestjs/common';

export const IS_AUTHENTICATED_KEY = 'isAuthenticated';

/**
 * Qualquer usuário autenticado, independentemente de papel.
 *
 * Reservado para o que todo mundo precisa para operar o sistema (logo e rodapé
 * do laudo, o próprio perfil). Acesso a módulo usa @Roles.
 */
export const Authenticated = () => SetMetadata(IS_AUTHENTICATED_KEY, true);
