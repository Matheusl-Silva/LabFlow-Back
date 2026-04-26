import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum Period {
  MORNING = 'Matutino',
  NIGHT = 'Noturno',
}

@Entity({ name: 'patients', database: process.env.MAIN_DB })
export class Patient {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ type: 'enum', enum: Period })
  period!: Period;

  @Column()
  medication!: string;

  @Column()
  patology!: string;

  @Column({ name: 'birth_date' })
  birthDate!: Date;

  @Column()
  phone!: string;

  @Column({ unique: true })
  cpf!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
