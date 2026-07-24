import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Texto do rodapé do laudo (nome/endereço do laboratório), configurável pelo
 * admin. IF NOT EXISTS: no-op seguro em bancos que já têm a coluna.
 */
export class AddSettingsFooter1784165500000 implements MigrationInterface {
    name = 'AddSettingsFooter1784165500000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "footer_text" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN IF EXISTS "footer_text"`);
    }
}
