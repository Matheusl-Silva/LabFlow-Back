import { Role } from '../enums/role.enum';
import type { JwtPayload } from '../types/jwt.payload.type';

/**
 * O usuário tem o papel? O ADMIN passa em qualquer checagem, igual ao
 * RolesGuard.
 *
 * Serve para os controllers que recortam a RESPOSTA por perfil (dado pessoal
 * de paciente, resultado de exame) — o guard já decidiu quem entra; aqui se
 * decide o que a pessoa enxerga.
 */
export function hasRole(user: JwtPayload, role: Role): boolean {
  const roles = user.roles ?? [];
  return roles.includes(Role.ADMIN) || roles.includes(role);
}
