import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Controle de estoque do laboratório: item, categoria, unidade, quantidade
 * atual e estoque mínimo (que alimenta o alerta de reposição).
 *
 * Os nomes dos tipos enum seguem a convenção do TypeORM
 * (`<tabela>_<coluna>_enum`) para que o schema gerado bata com a entidade.
 */
export class AddStockItems1784165600000 implements MigrationInterface {
  name = 'AddStockItems1784165600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "stock_items_type_enum" AS ENUM (
          'Reagente', 'Consumível', 'Vidraria', 'Equipamento', 'Medicamento', 'EPI', 'Outro'
        );
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "stock_items_unit_enum" AS ENUM (
          'Unidade', 'Caixa', 'Pacote', 'Frasco', 'mL', 'L', 'g', 'kg'
        );
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stock_items" (
        "id" SERIAL NOT NULL,
        "name" character varying(120) NOT NULL,
        "type" "stock_items_type_enum" NOT NULL,
        "unit" "stock_items_unit_enum" NOT NULL DEFAULT 'Unidade',
        "quantity" integer NOT NULL DEFAULT 0,
        "min_quantity" integer NOT NULL DEFAULT 0,
        "description" character varying(250),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_stock_items" PRIMARY KEY ("id"),
        CONSTRAINT "CK_stock_items_quantity" CHECK ("quantity" >= 0),
        CONSTRAINT "CK_stock_items_min_quantity" CHECK ("min_quantity" >= 0)
      )
    `);

    // Índice parcial: o nome de um item excluído volta a ficar disponível.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ux_stock_items_name_active"
      ON "stock_items" ("name") WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "ux_stock_items_name_active"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_items"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "stock_items_unit_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "stock_items_type_enum"`);
  }
}
