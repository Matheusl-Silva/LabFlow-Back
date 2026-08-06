import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { User } from '../entities/user.entity';
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

/**
 * Log com o nome de quem fez a ação já resolvido. O `user_id` sozinho obriga o
 * cliente a cruzar com a lista de usuários — e essa lista não traz quem foi
 * excluído, justamente o caso em que o histórico mais importa.
 */
export interface AuditLogView extends AuditLog {
  userName: string | null;
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

  /**
   * Nome de cada autor, numa consulta só (evita N+1 na listagem).
   *
   * `withDeleted`: um usuário excluído continua sendo o autor dos eventos que
   * gerou, e o log existe exatamente para sobreviver a essa exclusão. Sem isso
   * a tela mostraria "Usuário #3" no lugar do nome.
   */
  private async userNames(userIds: number[]): Promise<Map<number, string>> {
    const unique = [...new Set(userIds)];
    if (unique.length === 0) return new Map();

    const users = await this.repo.manager.find(User, {
      where: { id: In(unique) },
      select: { id: true, name: true },
      withDeleted: true,
    });
    return new Map(users.map((user) => [user.id, user.name]));
  }

  async find(
    query: QueryAuditLogDto,
  ): Promise<{ data: AuditLogView[]; total: number }> {
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

    // `null` (e não uma string tipo "desconhecido") quando o autor não existe
    // mais nem como registro excluído: cabe ao cliente decidir como mostrar.
    const names = await this.userNames(data.map((log) => log.userId));
    return {
      data: data.map((log) => ({
        ...log,
        userName: names.get(log.userId) ?? null,
      })),
      total,
    };
  }
}
