export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  /**
   * Entrada/saída de estoque. Tecnicamente é um UPDATE, mas separar importa
   * para quem lê o histórico: movimentar é a operação do dia a dia, enquanto
   * "editou" sugere que alguém mexeu no cadastro do item (nome, mínimo, tipo).
   */
  ADJUST = 'ADJUST',
}

export enum AuditEntity {
  EXAM = 'exam',
  EXAM_TEMPLATE = 'exam_template',
  PATIENT = 'patient',
  ANAMNESIS = 'anamnesis',
  STOCK_ITEM = 'stock_item',
  /** Inclui concessão e revogação de papéis de acesso. */
  USER = 'user',
}
