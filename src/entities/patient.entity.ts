import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Anamnesis } from './anamnesis.entity';
import { Exam } from './exam.entity';

export enum Period {
  MORNING = 'Matutino',
  NIGHT = 'Noturno',
}

export enum Sex {
  MALE = 'Masculino',
  FEMALE = 'Feminino',
}

@Entity({ name: 'patients', database: process.env.MAIN_DB })
// Unicidade só entre registros ATIVOS: um CPF/e-mail de paciente excluído
// (soft delete) fica livre para ser recadastrado. O índice parcial exclui as
// linhas com deleted_at != null.
@Index('ux_patients_cpf_active', ['cpf'], { unique: true, where: 'deleted_at IS NULL' })
@Index('ux_patients_email_active', ['email'], { unique: true, where: 'deleted_at IS NULL' })
export class Patient {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  // Unicidade agora vem do índice parcial ux_patients_email_active (ver classe).
  @Column()
  email!: string;

  @Column({ type: 'enum', enum: Period })
  period!: Period;

  // Nulo nos pacientes cadastrados antes deste campo existir: inventar um sexo
  // para eles seria pior do que admitir que a informação falta. O cadastro novo
  // exige o valor (CreatePatientDto), então a base se completa com o tempo.
  @Column({ type: 'enum', enum: Sex, nullable: true })
  sex!: Sex | null;

  @Column({nullable: true})
  medication!: string;

  @Column({nullable: true})
  pathology!: string;

  @Column({ name: 'birth_date' })
  birthDate!: Date;

  @Column()
  phone!: string;

  // Unicidade agora vem do índice parcial ux_patients_cpf_active (ver classe).
  @Column()
  cpf!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Soft delete: a linha nunca é removida fisicamente (preserva o histórico
  // clínico e satisfaz as FKs de exames/anamneses). O TypeORM filtra
  // automaticamente os registros com deleted_at != null em find/findOne.
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null;

  @OneToMany(() => Exam, (exam) => exam.patient)
  exams!: Exam[]

  @OneToMany(() => Anamnesis, (anamnesis) => anamnesis.patient)
  anamneses!: Anamnesis[]
}
