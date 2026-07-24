import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { AuditAction, AuditEntity } from './audit.types';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

interface RecordInput {
  action: AuditAction;
  entity: AuditEntity;
  entityId: number;
  userId: number;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>,
  ) {}

  /**
   * Grava um evento de auditoria. NUNCA deve derrubar a operação principal:
   * auditar é efeito colateral, então engolimos erros de escrita do log
   * (apenas logando no console) para não transformar um erro de auditoria em
   * um 500 numa edição de exame que deu certo.
   */
  async record(input: RecordInput): Promise<void> {
    try {
      const log = this.repo.create({
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        userId: input.userId,
        before: input.before ?? null,
        after: input.after ?? null,
      });
      await this.repo.save(log);
    } catch (err) {
      console.error('[AuditService] falha ao gravar log de auditoria', err);
    }
  }

  async find(
    query: QueryAuditLogDto,
  ): Promise<{ data: AuditLog[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.repo
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.entity)
      qb.andWhere('log.entity = :entity', { entity: query.entity });
    if (query.entityId)
      qb.andWhere('log.entity_id = :entityId', { entityId: query.entityId });
    if (query.action)
      qb.andWhere('log.action = :action', { action: query.action });
    if (query.userId)
      qb.andWhere('log.user_id = :userId', { userId: query.userId });

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }
}
