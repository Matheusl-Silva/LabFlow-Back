import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';

/**
 * Libera a rota para quem tiver PELO MENOS UM dos papéis listados (o ADMIN
 * passa sempre). Vários papéis são alternativas de acesso, não requisitos
 * acumulativos: `@Roles(PATIENTS, EXAMS)` = "quem cadastra paciente ou quem
 * lança exame".
 *
 * Sem este decorator (e sem @Public/@Authenticated), a rota é ADMIN-only —
 * o guard falha fechado, como o AdminGuard fazia antes.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
