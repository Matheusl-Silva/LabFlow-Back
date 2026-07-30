export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
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
