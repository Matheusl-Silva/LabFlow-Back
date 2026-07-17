import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserIsActive1784165200000 implements MigrationInterface {
    name = 'AddUserIsActive1784165200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Novos cadastros nascem inativos (DEFAULT false)...
        await queryRunner.query(`ALTER TABLE "users" ADD "is_active" boolean NOT NULL DEFAULT false`);
        // ...mas quem já existe no sistema continua com acesso.
        await queryRunner.query(`UPDATE "users" SET "is_active" = true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_active"`);
    }
}
