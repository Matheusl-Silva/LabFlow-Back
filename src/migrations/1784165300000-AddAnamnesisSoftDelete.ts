import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAnamnesisSoftDelete1784165300000 implements MigrationInterface {
    name = 'AddAnamnesisSoftDelete1784165300000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "anamneses" ADD "deleted_at" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "anamneses" DROP COLUMN "deleted_at"`);
    }
}
