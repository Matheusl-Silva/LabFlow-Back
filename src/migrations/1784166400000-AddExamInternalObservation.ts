import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Separa a observação do exame em duas: a que sai no laudo e a que não sai.
 *
 * A coluna `observation` já existente CONTINUA sendo a impressa — nada é
 * movido, e os exames antigos seguem imprimindo exatamente o mesmo texto. A
 * nova `internal_observation` é o recado interno do laboratório (repetir a
 * coleta, conferir com o preceptor, amostra guardada na geladeira B): fica no
 * sistema e nunca é renderizada no laudo entregue ao paciente.
 *
 * Nula por padrão, como a irmã: exame sem recado interno é o caso comum.
 */
export class AddExamInternalObservation1784166400000 implements MigrationInterface {
  name = 'AddExamInternalObservation1784166400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "internal_observation" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "exams" DROP COLUMN IF EXISTS "internal_observation"`,
    );
  }
}
