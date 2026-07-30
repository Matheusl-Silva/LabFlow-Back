import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Papéis de acesso por módulo (N:N com users).
 *
 * O BACKFILL é a parte crítica desta migration: sem ele, todo usuário comum
 * ficaria sem acesso a nada no deploy. Ao final, cada usuário tem exatamente as
 * mesmas permissões de antes — só que agora expressas em papéis:
 *
 *   is_admin = true  → ADMIN
 *   is_admin = false → EXAMS + PATIENTS (o que o "usuário comum" já fazia:
 *                      lançar exames e consultar a lista de pacientes)
 */
export class AddUserRoles1784165700000 implements MigrationInterface {
  name = 'AddUserRoles1784165700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_roles" (
        "user_id" integer NOT NULL,
        "role" character varying(32) NOT NULL,
        "granted_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_roles" PRIMARY KEY ("user_id", "role"),
        CONSTRAINT "FK_user_roles_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_user_roles_user" ON "user_roles" ("user_id")
    `);

    // ON CONFLICT DO NOTHING: a migration continua sendo um no-op seguro se
    // rodar de novo num banco que já tem os papéis.
    await queryRunner.query(`
      INSERT INTO "user_roles" ("user_id", "role")
      SELECT "id", 'ADMIN' FROM "users" WHERE "is_admin" = true
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "user_roles" ("user_id", "role")
      SELECT "id", 'EXAMS' FROM "users" WHERE "is_admin" = false
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "user_roles" ("user_id", "role")
      SELECT "id", 'PATIENTS' FROM "users" WHERE "is_admin" = false
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // `users.is_admin` nunca deixou de ser preenchida, então derrubar a tabela
    // devolve o sistema exatamente ao modelo binário anterior.
    await queryRunner.query(`DROP TABLE IF EXISTS "user_roles"`);
  }
}
