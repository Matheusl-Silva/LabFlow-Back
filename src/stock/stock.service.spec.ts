import { StockService } from './stock.service';
import { AuditAction, AuditEntity } from '../audit/audit.types';
import { StockItem } from '../entities/stock-item.entity';
import type { AuditService } from '../audit/audit.service';
import type { Repository } from 'typeorm';

/**
 * Movimentar estoque é gravado como `ADJUST`, e editar o cadastro do item como
 * `UPDATE`. A distinção existe só para quem lê o histórico ("movimentou" x
 * "editou"), então nada além do log quebra se ela se perder — daí o teste.
 */
describe('StockService (ação registrada na auditoria)', () => {
  const item = (over: Partial<StockItem> = {}): StockItem =>
    ({ id: 7, name: 'Luva', quantity: 10, minQuantity: 2, ...over }) as StockItem;

  let repo: jest.Mocked<Pick<Repository<StockItem>, 'findOneBy' | 'findOneByOrFail' | 'query' | 'update'>>;
  let audit: jest.Mocked<Pick<AuditService, 'record'>>;
  let service: StockService;

  beforeEach(() => {
    repo = {
      findOneBy: jest.fn(),
      findOneByOrFail: jest.fn(),
      query: jest.fn(),
      update: jest.fn(),
    } as never;
    audit = { record: jest.fn() } as never;
    service = new StockService(
      repo as unknown as Repository<StockItem>,
      audit as unknown as AuditService,
    );
  });

  it('registra ADJUST na movimentação de quantidade', async () => {
    repo.findOneBy.mockResolvedValue(item({ quantity: 10 }));
    // O UPDATE ... RETURNING devolve `[linhas, rowCount]` no TypeORM.
    repo.query.mockResolvedValue([[{ id: 7 }], 1]);
    repo.findOneByOrFail.mockResolvedValue(item({ quantity: 4 }));

    await service.adjustQuantity(7, { delta: -6 }, 99);

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.ADJUST,
        entity: AuditEntity.STOCK_ITEM,
        entityId: 7,
        userId: 99,
      }),
    );
  });

  it('registra UPDATE na edição do cadastro do item', async () => {
    repo.findOneBy.mockResolvedValue(item({ name: 'Luva' }));
    repo.findOneByOrFail.mockResolvedValue(item({ name: 'Luva nitrílica' }));

    await service.update(7, { name: 'Luva nitrílica' }, 99);

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: AuditAction.UPDATE }),
    );
  });

  it('não registra nada quando a saída é maior que o estoque', async () => {
    repo.findOneBy.mockResolvedValue(item({ quantity: 3 }));
    repo.query.mockResolvedValue([[], 0]);

    await expect(service.adjustQuantity(7, { delta: -6 }, 99)).rejects.toThrow(
      /Insufficient stock/,
    );
    expect(audit.record).not.toHaveBeenCalled();
  });
});
