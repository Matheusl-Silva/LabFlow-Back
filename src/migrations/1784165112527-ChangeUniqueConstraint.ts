import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeUniqueConstraint1784165112527 implements MigrationInterface {
    name = 'ChangeUniqueConstraint1784165112527'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patients" DROP CONSTRAINT "UQ_64e2031265399f5690b0beba6a5"`);
        await queryRunner.query(`ALTER TABLE "patients" DROP CONSTRAINT "UQ_5947301223f5a908fd5e372b0fb"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "ux_patients_email_active" ON "patients" ("email") WHERE deleted_at IS NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "ux_patients_cpf_active" ON "patients" ("cpf") WHERE deleted_at IS NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "ux_users_email_active" ON "users" ("email") WHERE deleted_at IS NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."ux_users_email_active"`);
        await queryRunner.query(`DROP INDEX "public"."ux_patients_cpf_active"`);
        await queryRunner.query(`DROP INDEX "public"."ux_patients_email_active"`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email")`);
        await queryRunner.query(`ALTER TABLE "patients" ADD CONSTRAINT "UQ_5947301223f5a908fd5e372b0fb" UNIQUE ("cpf")`);
        await queryRunner.query(`ALTER TABLE "patients" ADD CONSTRAINT "UQ_64e2031265399f5690b0beba6a5" UNIQUE ("email")`);
    }

}
