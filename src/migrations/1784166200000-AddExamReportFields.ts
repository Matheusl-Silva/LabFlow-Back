import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Campos que faltavam no laudo:
 *
 *  - `material` e `method` em `exam_templates`: são propriedades do TIPO de
 *    exame (hemograma é sempre sangue total / citometria de fluxo), não do
 *    exame lançado. No modelo, cadastram-se uma vez e todo laudo daquele tipo
 *    já sai com eles — em vez de o operador redigitar a cada lançamento.
 *  - `observation` em `exams`: varia por resultado (amostra hemolisada, jejum
 *    irregular, valor repetido), então pertence ao exame lançado.
 *
 * Tudo nulo por padrão: os modelos e exames já cadastrados seguem válidos e o
 * laudo apenas omite a linha vazia.
 */
export class AddExamReportFields1784166200000 implements MigrationInterface {
  name = 'AddExamReportFields1784166200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "exam_templates" ADD COLUMN IF NOT EXISTS "material" character varying(120)`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_templates" ADD COLUMN IF NOT EXISTS "method" character varying(120)`,
    );
    await queryRunner.query(
      `ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "observation" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "exams" DROP COLUMN IF EXISTS "observation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_templates" DROP COLUMN IF EXISTS "method"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_templates" DROP COLUMN IF EXISTS "material"`,
    );
  }
}
