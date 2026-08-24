import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Passa os e-mails já gravados para minúsculas, alinhando o banco ao que o
 * @NormalizeEmail passa a garantir na entrada.
 *
 * Sem este passo a normalização faria mal: quem estivesse gravado como
 * "Maria.Silva@lab.com" pararia de conseguir logar, porque a entrada chegaria
 * em minúsculas e a comparação continua sendo igualdade simples.
 */
export class NormalizeUserEmails1784166100000 implements MigrationInterface {
  name = 'NormalizeUserEmails1784166100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // O índice ux_users_email_active é único entre contas ATIVAS. Se duas
    // delas diferirem só na capitalização, o UPDATE abaixo violaria a
    // restrição no meio do deploy. Preferimos abortar ANTES, dizendo quais
    // são: decidir qual conta fica é escolha de quem administra, não de uma
    // migration.
    const conflitos = (await queryRunner.query(`
        SELECT LOWER(TRIM(email)) AS normalizado,
               STRING_AGG(id::text, ', ' ORDER BY id) AS ids
        FROM users
        WHERE deleted_at IS NULL
        GROUP BY LOWER(TRIM(email))
        HAVING COUNT(*) > 1
      `)) as { normalizado: string; ids: string }[];

    if (conflitos.length > 0) {
      const lista = conflitos
        .map((c) => `${c.normalizado} (ids ${c.ids})`)
        .join('; ');
      throw new Error(
        'Não é possível normalizar os e-mails: existem contas ativas que ' +
          `diferem apenas na capitalização — ${lista}. ` +
          'Resolva a duplicidade (excluindo ou renomeando uma delas) e rode a migration de novo.',
      );
    }

    await queryRunner.query(`
      UPDATE users
      SET email = LOWER(TRIM(email))
      WHERE email <> LOWER(TRIM(email))
    `);
  }

  public async down(): Promise<void> {
    // Sem volta: a capitalização original não é recuperável depois do UPDATE,
    // e reverter só faria sentido junto com a remoção do @NormalizeEmail —
    // que é código, não schema. Reverter para um banco em minúsculas não
    // quebra nada: a comparação continua funcionando para quem digita em
    // minúsculas, que é o que o front sempre enviou.
  }
}
