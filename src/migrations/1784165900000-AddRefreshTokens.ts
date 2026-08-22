import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sessões de longa duração (refresh tokens).
 *
 * Sem backfill: quem estiver logado no momento do deploy continua com o access
 * token atual até ele expirar (15 min) e então cai no login — não há como
 * fabricar uma sessão para um token que nunca existiu. É o único deploy com
 * esse efeito; a partir daqui a renovação é transparente.
 */
export class AddRefreshTokens1784165900000 implements MigrationInterface {
  name = 'AddRefreshTokens1784165900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "token_hash" character(64) NOT NULL,
        "family_id" uuid NOT NULL,
        "expires_at" TIMESTAMP NOT NULL,
        "revoked_at" TIMESTAMP,
        "revoked_reason" character varying(16),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_refresh_tokens_hash" UNIQUE ("token_hash"),
        CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user" ON "refresh_tokens" ("user_id")
    `);

    // A revogação por suspeita de roubo derruba a família inteira em um UPDATE:
    // sem este índice, isso vira sequential scan na tabela de sessões.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_family" ON "refresh_tokens" ("family_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Derrubar a tabela desloga todo mundo na próxima renovação, que é
    // exatamente o comportamento anterior a esta migration.
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
  }
}
