import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogs1784165400000 implements MigrationInterface {
  name = 'CreateAuditLogs1784165400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" SERIAL NOT NULL,
        "action" character varying(16) NOT NULL,
        "entity" character varying(32) NOT NULL,
        "entity_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "before" jsonb,
        "after" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_entity" ON "audit_logs" ("entity", "entity_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_created_at" ON "audit_logs" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_entity"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}
