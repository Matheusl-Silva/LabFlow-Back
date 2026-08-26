import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tokens de redefinição de senha.
 *
 * Tabela separada dos refresh tokens de propósito: os dois guardam segredos
 * opacos, mas têm ciclos de vida opostos — o refresh é rotativo e vive dias,
 * este é de uso único e vive minutos. Juntá-los obrigaria a coluna de motivo de
 * revogação a significar coisas diferentes conforme a linha.
 */
export class AddPasswordResetTokens1784166000000 implements MigrationInterface {
  name = 'AddPasswordResetTokens1784166000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "token_hash" character(64) NOT NULL,
        "expires_at" TIMESTAMP NOT NULL,
        "used_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_password_reset_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_password_reset_tokens_hash" UNIQUE ("token_hash"),
        CONSTRAINT "FK_password_reset_tokens_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Todo pedido novo invalida os anteriores do MESMO usuário, e a faxina de
    // vencidos também é por usuário: sem este índice as duas viram sequential
    // scan.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_password_reset_tokens_user"
        ON "password_reset_tokens" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Derruba os pedidos em aberto: quem tiver um link no e-mail refaz o
    // pedido. Nada de sessão ou senha é perdido.
    await queryRunner.query(`DROP TABLE IF EXISTS "password_reset_tokens"`);
  }
}
