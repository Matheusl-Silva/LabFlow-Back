import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { User } from '../entities/user.entity';
import { Patient } from '../entities/patient.entity';
import { Exam } from '../entities/exam.entity';
import { ExamTemplate } from '../entities/exam-template.entity';
import { Anamnesis } from '../entities/anamnesis.entity';
import { StockItem } from '../entities/stock-item.entity';
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
 * Log com os nomes já resolvidos: quem fez a ação (`userName`) e sobre qual
 * registro ela foi feita (`entityName`). Sem isso a tela mostra "Paciente #42",
 * e o par entidade+id obriga quem lê a cruzar manualmente com outra listagem —
 * que nem sequer traz os registros excluídos, justamente o caso em que o
 * histórico mais importa.
 */
export interface AuditLogView extends AuditLog {
  userName: string | null;
  entityName: string | null;
}

/** Chave do mapa de nomes: entidade + id (ids se repetem entre entidades). */
type EntityKey = string;
const entityKey = (entity: string, id: number): EntityKey => `${entity}:${id}`;

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

  /**
   * Nome do registro que sofreu a ação, para cada log da página.
   *
   * Uma consulta por TIPO de entidade presente na página (não uma por log): no
   * pior caso são seis consultas, independentemente do tamanho da página.
   *
   * `withDeleted` em todas: excluir é justamente uma das ações auditadas, e
   * mostrar "Paciente #42" no evento de exclusão esconderia a informação mais
   * relevante do log. Como o sistema usa exclusão lógica, o registro continua
   * lá para ser lido.
   */
  private async entityNames(logs: AuditLog[]): Promise<Map<EntityKey, string>> {
    const names = new Map<EntityKey, string>();

    // Ids agrupados por entidade — a consulta é feita uma vez por grupo.
    const idsByEntity = new Map<string, Set<number>>();
    for (const log of logs) {
      const set = idsByEntity.get(log.entity) ?? new Set<number>();
      set.add(log.entityId);
      idsByEntity.set(log.entity, set);
    }
    const idsOf = (entity: AuditEntity): number[] => [
      ...(idsByEntity.get(entity) ?? new Set<number>()),
    ];

    const manager = this.repo.manager;

    const patientIds = idsOf(AuditEntity.PATIENT);
    if (patientIds.length) {
      const rows = await manager.find(Patient, {
        where: { id: In(patientIds) },
        select: { id: true, name: true },
        withDeleted: true,
      });
      for (const row of rows) {
        names.set(entityKey(AuditEntity.PATIENT, row.id), row.name);
      }
    }

    const templateIds = idsOf(AuditEntity.EXAM_TEMPLATE);
    if (templateIds.length) {
      const rows = await manager.find(ExamTemplate, {
        where: { id: In(templateIds) },
        select: { id: true, name: true },
        withDeleted: true,
      });
      for (const row of rows) {
        names.set(entityKey(AuditEntity.EXAM_TEMPLATE, row.id), row.name);
      }
    }

    const stockIds = idsOf(AuditEntity.STOCK_ITEM);
    if (stockIds.length) {
      const rows = await manager.find(StockItem, {
        where: { id: In(stockIds) },
        select: { id: true, name: true },
        withDeleted: true,
      });
      for (const row of rows) {
        names.set(entityKey(AuditEntity.STOCK_ITEM, row.id), row.name);
      }
    }

    const userIds = idsOf(AuditEntity.USER);
    if (userIds.length) {
      const rows = await manager.find(User, {
        where: { id: In(userIds) },
        select: { id: true, name: true },
        withDeleted: true,
      });
      for (const row of rows) {
        names.set(entityKey(AuditEntity.USER, row.id), row.name);
      }
    }

    // Exame não tem nome próprio: o que identifica um resultado para quem lê o
    // histórico é o tipo de exame e de quem ele é ("Hemograma — Maria Silva").
    const examIds = idsOf(AuditEntity.EXAM);
    if (examIds.length) {
      const rows = await manager.find(Exam, {
        where: { id: In(examIds) },
        select: {
          id: true,
          examTemplate: { id: true, name: true },
          patient: { id: true, name: true },
        },
        relations: { examTemplate: true, patient: true },
        withDeleted: true,
      });
      for (const row of rows) {
        const label = [row.examTemplate?.name, row.patient?.name]
          .filter(Boolean)
          .join(' — ');
        if (label) names.set(entityKey(AuditEntity.EXAM, row.id), label);
      }
    }

    // Anamnese idem: pertence a um paciente, e é isso que a identifica.
    const anamnesisIds = idsOf(AuditEntity.ANAMNESIS);
    if (anamnesisIds.length) {
      const rows = await manager.find(Anamnesis, {
        where: { id: In(anamnesisIds) },
        select: { id: true, patient: { id: true, name: true } },
        relations: { patient: true },
        withDeleted: true,
      });
      for (const row of rows) {
        if (row.patient?.name) {
          names.set(
            entityKey(AuditEntity.ANAMNESIS, row.id),
            `Anamnese de ${row.patient.name}`,
          );
        }
      }
    }

    return names;
  }

  /**
   * Último recurso quando o registro não existe mais nem como exclusão lógica
   * (linha apagada de vez): o nome que ficou congelado no snapshot do próprio
   * log. Vale só para as entidades que têm coluna `name` — exame e anamnese são
   * identificados por relação, que o snapshot não guarda.
   */
  private nameFromSnapshot(log: AuditLog): string | null {
    const snapshot = log.after ?? log.before;
    const name = snapshot?.name;
    return typeof name === 'string' && name.trim() !== '' ? name : null;
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

    // `null` (e não uma string tipo "desconhecido") quando um nome não pôde ser
    // resolvido: cabe ao cliente decidir como mostrar — hoje, cai no id, que
    // mantém o evento rastreável.
    const [names, entityNames] = await Promise.all([
      this.userNames(data.map((log) => log.userId)),
      this.entityNames(data),
    ]);

    return {
      data: data.map((log) => ({
        ...log,
        userName: names.get(log.userId) ?? null,
        entityName:
          entityNames.get(entityKey(log.entity, log.entityId)) ??
          this.nameFromSnapshot(log),
      })),
      total,
    };
  }
}
