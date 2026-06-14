import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany
} from 'typeorm';
import { Exam } from './exam.entity';

@Entity({ name: 'users', database: process.env.MAIN_DB })
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({unique: true})
  email!: string;

  @Column()
  passwordHash!: string;

  @Column({name: 'is_admin'})
  isAdmin: boolean = false;

  @CreateDateColumn({name: 'created_at'})
  createdAt!: Date;

  @UpdateDateColumn({name: 'updated_at'})
  updatedAt!: Date;

  @OneToMany(() => Exam, (exam) => exam.preceptor)
  examsAsPreceptor!: Exam[]

  @OneToMany(() => Exam, (exam) => exam.responsible)
  examsAsResponsible!: Exam[]
}
