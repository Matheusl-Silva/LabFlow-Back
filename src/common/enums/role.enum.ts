/**
 * Papéis de acesso por módulo.
 *
 * Vivem no código (e não como tabela editável) de propósito: cada papel novo
 * exige guard e tela de qualquer forma, então criar um é um deploy — não um
 * INSERT. A coluna `user_roles.role` é um varchar simples.
 *
 * Regra geral: papel = módulo inteiro. Não existe `STOCK_READ`/`STOCK_WRITE` —
 * quem tem o papel faz tudo dentro daquele módulo. As exceções (dado pessoal
 * de paciente, administração do sistema) estão amarradas ao ADMIN.
 */
export enum Role {
  /** Superusuário: passa em qualquer checagem de papel. */
  ADMIN = 'ADMIN',
  /** Exames, modelos de exame e anamneses. */
  EXAMS = 'EXAMS',
  /** Estoque de insumos: CRUD completo e movimentação. */
  STOCK = 'STOCK',
  /** Cadastro de pacientes, incluindo os dados pessoais. */
  PATIENTS = 'PATIENTS',
}

/** Papéis que podem ser concedidos na tela de usuários. */
export const ASSIGNABLE_ROLES: Role[] = [
  Role.ADMIN,
  Role.EXAMS,
  Role.STOCK,
  Role.PATIENTS,
];
