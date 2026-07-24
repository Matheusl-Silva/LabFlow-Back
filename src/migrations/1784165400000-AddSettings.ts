import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Tabela SINGLETON de configurações globais (id sempre = 1), guardando a logo
 * do laboratório em base64. IF NOT EXISTS: no-op seguro em bancos que já a têm.
 */
export class AddSettings1784165400000 implements MigrationInterface {
    name = 'AddSettings1784165400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "settings" (
                "id" integer NOT NULL DEFAULT 1,
                "logo_base64" text,
                "logo_mime" character varying,
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_settings" PRIMARY KEY ("id"),
                CONSTRAINT "CK_settings_singleton" CHECK ("id" = 1)
            )
        `);
        // Garante a linha singleton para o GET/PUT sempre encontrarem id=1.
        await queryRunner.query(`INSERT INTO "settings" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "settings"`);
    }
}
