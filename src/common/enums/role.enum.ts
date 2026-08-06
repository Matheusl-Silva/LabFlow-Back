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
  /**
   * Lançamento de exames: cadastra e consulta os exames dos pacientes.
   * NÃO edita nem exclui exames, e não toca nos modelos — isso é do
   * papel EXAM_TEMPLATES. É o operador do dia a dia.
   */
  EXAMS = 'EXAMS',
  /**
   * Gestão de exames e modelos: edita/exclui exames já lançados e faz o
   * CRUD completo dos modelos de exame. Papel de configuração, acima do
   * EXAMS — separado para que quem só lança não altere o que já foi feito
   * nem a estrutura dos modelos.
   */
  EXAM_TEMPLATES = 'EXAM_TEMPLATES',
  /** Anamneses: cadastra, consulta, edita e exclui. */
  ANAMNESIS = 'ANAMNESIS',
  /** Estoque de insumos: CRUD completo e movimentação. */
  STOCK = 'STOCK',
  /** Cadastro de pacientes, incluindo os dados pessoais. */
  PATIENTS = 'PATIENTS',
}

/** Papéis que podem ser concedidos na tela de usuários. */
export const ASSIGNABLE_ROLES: Role[] = [
  Role.ADMIN,
  Role.EXAMS,
  Role.EXAM_TEMPLATES,
  Role.ANAMNESIS,
  Role.STOCK,
  Role.PATIENTS,
];
