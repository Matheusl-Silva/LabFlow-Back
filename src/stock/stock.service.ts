import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockItem } from '../entities/stock-item.entity';
import { CreateStockItemDto } from './dto/create-stock-item.dto';
import { UpdateStockItemDto } from './dto/update-stock-item.dto';
import { AdjustStockQuantityDto } from './dto/adjust-stock-quantity.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntity } from '../audit/audit.types';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(StockItem)
    private readonly repo: Repository<StockItem>,
    private readonly audit: AuditService,
  ) {}

  private snapshot(item: StockItem): Record<string, unknown> {
    const { deletedAt, ...rest } = item;
    return rest;
  }

  /** Ordem alfabética: é como o usuário procura um item na lista. */
  get(): Promise<StockItem[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async getById(id: number): Promise<StockItem> {
    const item = await this.repo.findOneBy({ id });
    if (!item) throw new NotFoundException('Stock item not found');
    return item;
  }

  async create(dto: CreateStockItemDto, userId: number): Promise<StockItem> {
    // Mesmo tratamento dado ao paciente: um item excluído que volta a ser
    // cadastrado reaproveita o registro (e o histórico de auditoria) em vez de
    // esbarrar no índice único.
    const active = await this.repo.findOneBy({ name: dto.name });
    if (active) throw new ConflictException('Stock item already registered');

    const deleted = await this.repo.findOne({
      where: { name: dto.name },
      withDeleted: true,
      order: { id: 'DESC' },
    });

    if (deleted) {
      await this.repo.update(deleted.id, dto);
      await this.repo.restore(deleted.id);
      const restored = await this.repo.findOneByOrFail({ id: deleted.id });
      await this.audit.record({
        action: AuditAction.CREATE,
        entity: AuditEntity.STOCK_ITEM,
        entityId: restored.id,
        userId,
        after: this.snapshot(restored),
      });
      return restored;
    }

    const saved = await this.repo.save(this.repo.create(dto));
    await this.audit.record({
      action: AuditAction.CREATE,
      entity: AuditEntity.STOCK_ITEM,
      entityId: saved.id,
      userId,
      after: this.snapshot(saved),
    });
    return saved;
  }

  async update(
    id: number,
    dto: UpdateStockItemDto,
    userId: number,
  ): Promise<StockItem> {
    const item = await this.getById(id);
    const before = this.snapshot(item);

    await this.repo.update(id, dto);
    const after = await this.repo.findOneByOrFail({ id });

    await this.audit.record({
      action: AuditAction.UPDATE,
      entity: AuditEntity.STOCK_ITEM,
      entityId: id,
      userId,
      before,
      after: this.snapshot(after),
    });
    return after;
  }

  /**
   * Entrada/saída de estoque. O incremento é feito no próprio UPDATE
   * (`quantity = quantity + delta`) e não em memória: duas movimentações
   * simultâneas do mesmo item precisam somar, não sobrescrever uma à outra.
   * A cláusula `quantity + delta >= 0` é o que impede o estoque negativo — sem
   * ela, um SELECT seguido de UPDATE deixaria a janela aberta.
   */
  async adjustQuantity(
    id: number,
    dto: AdjustStockQuantityDto,
    userId: number,
  ): Promise<StockItem> {
    if (dto.delta === 0)
      throw new BadRequestException('Delta must not be zero');

    const before = await this.getById(id);

    const raw: unknown = await this.repo.query(
      `UPDATE "stock_items"
          SET "quantity" = "quantity" + $2, "updated_at" = now()
        WHERE "id" = $1 AND "deleted_at" IS NULL AND "quantity" + $2 >= 0
        RETURNING "id"`,
      [id, dto.delta],
    );

    // Em UPDATE, o TypeORM devolve `[linhas, rowCount]` — e não as linhas
    // direto, como faz no SELECT. Sem normalizar, o array de 2 posições nunca
    // é vazio e a saída maior que o estoque passava batido como sucesso.
    const rows = (
      Array.isArray(raw) && Array.isArray(raw[0]) ? raw[0] : raw
    ) as { id: number }[];

    if (!rows || rows.length === 0) {
      throw new BadRequestException(
        `Insufficient stock: only ${before.quantity} available`,
      );
    }

    const after = await this.repo.findOneByOrFail({ id });
    await this.audit.record({
      action: AuditAction.UPDATE,
      entity: AuditEntity.STOCK_ITEM,
      entityId: id,
      userId,
      before: this.snapshot(before),
      after: this.snapshot(after),
    });
    return after;
  }

  async delete(id: number, userId: number): Promise<boolean> {
    const item = await this.getById(id);

    // Soft delete: o item some da tela, mas os logs de auditoria continuam
    // apontando para um registro existente.
    const result = await this.repo.softDelete(id);
    if (!result.affected) throw new NotFoundException('Stock item not found');

    await this.audit.record({
      action: AuditAction.DELETE,
      entity: AuditEntity.STOCK_ITEM,
      entityId: id,
      userId,
      before: this.snapshot(item),
    });
    return true;
  }
}
