import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Movimentação de estoque passa a ser gravada como `ADJUST` (antes era
 * `UPDATE`, indistinguível de uma edição do cadastro do item).
 *
 * O backfill reclassifica os logs antigos para que o histórico não fique com
 * duas convenções convivendo — o registro de ontem diria "editou" e o de hoje
 * "movimentou" para exatamente a mesma ação.
 *
 * Critério: só entram os logs em que a ÚNICA diferença entre `before` e `after`
 * é a quantidade. `jsonb - 'chave'` remove a chave do objeto; comparar os dois
 * lados sem `quantity`/`updatedAt` garante que uma edição que por acaso também
 * mexeu na quantidade continue sendo `UPDATE`.
 */
export class ReclassifyStockAdjustLogs1784165800000
  implements MigrationInterface
{
  name = 'ReclassifyStockAdjustLogs1784165800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "audit_logs"
         SET "action" = 'ADJUST'
       WHERE "action" = 'UPDATE'
         AND "entity" = 'stock_item'
         AND "before" IS NOT NULL
         AND "after" IS NOT NULL
         AND "before" ->> 'quantity' IS DISTINCT FROM "after" ->> 'quantity'
         AND ("before" - 'quantity' - 'updatedAt')
           = ("after"  - 'quantity' - 'updatedAt')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "audit_logs"
         SET "action" = 'UPDATE'
       WHERE "action" = 'ADJUST'
    `);
  }
}