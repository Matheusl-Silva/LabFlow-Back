import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Baseline do schema para bancos NOVOS.
 *
 * Historicamente o schema foi criado fora das migrations (synchronize), e a
 * migration seguinte (ChangeUniqueConstraint) só ALTERA tabelas — num banco
 * zerado ela falha com "relation does not exist". Esta migration cria o schema
 * no formato LEGADO (com as constraints UQ_* que a ChangeUniqueConstraint
 * derruba), permitindo que a cadeia de migrations rode do zero.
 *
 * Tudo usa IF NOT EXISTS: em bancos que já existem, é um no-op seguro.
 */
export class InitialSchema1784165000000 implements MigrationInterface {
    name = 'InitialSchema1784165000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "patients_period_enum" AS ENUM('Matutino', 'Noturno');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "users" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "email" character varying NOT NULL,
                "passwordHash" character varying NOT NULL,
                "is_admin" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                CONSTRAINT "PK_users" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "patients" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "email" character varying NOT NULL,
                "period" "patients_period_enum" NOT NULL,
                "medication" character varying,
                "pathology" character varying,
                "birth_date" TIMESTAMP NOT NULL,
                "phone" character varying NOT NULL,
                "cpf" character varying NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                CONSTRAINT "PK_patients" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_64e2031265399f5690b0beba6a5" UNIQUE ("email"),
                CONSTRAINT "UQ_5947301223f5a908fd5e372b0fb" UNIQUE ("cpf")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "exam_templates" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "version" integer NOT NULL DEFAULT 1,
                "schema_json" jsonb NOT NULL,
                "active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                CONSTRAINT "PK_exam_templates" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "exams" (
                "id" SERIAL NOT NULL,
                "exam_template_id" integer NOT NULL REFERENCES "exam_templates"("id"),
                "patient_id" integer NOT NULL REFERENCES "patients"("id"),
                "data" jsonb NOT NULL,
                "date" TIMESTAMP NOT NULL,
                "preceptor_id" integer NOT NULL REFERENCES "users"("id"),
                "responsible_id" integer NOT NULL REFERENCES "users"("id"),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                CONSTRAINT "PK_exams" PRIMARY KEY ("id")
            )
        `);

        // Formato legado: sem deleted_at (adicionado pela AddAnamnesisSoftDelete).
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "anamneses" (
                "id" SERIAL NOT NULL,
                "chief_complaint" character varying(250) NOT NULL,
                "symptoms_onset" TIMESTAMP NOT NULL,
                "frequency" character varying(250) NOT NULL,
                "pain_location" character varying(250) NOT NULL,
                "heart_disease" boolean NOT NULL,
                "hypertension" boolean NOT NULL,
                "diabetes" boolean NOT NULL,
                "cancer" boolean NOT NULL,
                "surgeries" boolean NOT NULL,
                "other_diseases" character varying(250),
                "allergies" character varying(250),
                "medication" character varying(250),
                "meals_per_day" integer NOT NULL,
                "urinary_elimination" character varying(250) NOT NULL,
                "intestinal_elimination" character varying(250) NOT NULL,
                "menstrual_cycle" character varying(250),
                "sleep_and_rest" character varying(250) NOT NULL,
                "sleep_hours" integer NOT NULL,
                "smoking_frequency" character varying(250),
                "drugs_frequency" character varying(250),
                "alcohol_frequency" character varying(250),
                "exercise_frequency" character varying(250),
                "leisure" character varying(250),
                "basic_sanitation" boolean NOT NULL,
                "domestic_animals" character varying(250),
                "health_center" boolean NOT NULL,
                "family_disease" character varying(250),
                "family_disease_treatment" character varying(250),
                "patient_id" integer NOT NULL REFERENCES "patients"("id"),
                "date" TIMESTAMP NOT NULL,
                CONSTRAINT "PK_anamneses" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Baseline não é revertida: derrubar as tabelas destruiria dados de
        // bancos que já existiam antes dela. No-op intencional.
    }
}
