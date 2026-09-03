import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sexo do paciente. Importa clinicamente: os valores de referência dos exames
 * são, em boa parte, separados por sexo (hemácia, hemoglobina, hematócrito),
 * e hoje o laudo imprime todas as faixas por não saber qual se aplica.
 *
 * A coluna é NULA por padrão de propósito: os pacientes já cadastrados não têm
 * essa informação, e inventar um valor para eles seria pior do que admitir que
 * falta. O campo é obrigatório apenas no cadastro novo (CreatePatientDto), de
 * modo que a base se completa conforme os registros antigos forem editados.
 *
 * O nome do tipo enum segue a convenção do TypeORM (`<tabela>_<coluna>_enum`),
 * como `patients_period_enum`, para o schema gerado bater com a entidade.
 */
export class AddPatientSex1784166300000 implements MigrationInterface {
  name = 'AddPatientSex1784166300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "patients_sex_enum" AS ENUM ('Masculino', 'Feminino');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(
      `ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "sex" "patients_sex_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN IF EXISTS "sex"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "patients_sex_enum"`);
  }
}
