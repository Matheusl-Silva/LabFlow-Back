import {Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn} from 'typeorm';
import { Exam } from './exam.entity';

@Entity({name: 'exam_templates', database: process.env.MAIN_DB})
export class ExamTemplate {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({unique: true})
    name!: string;

    @Column()
    version: number = 1; //Tá certo?

    @Column({name: 'schema_json', type: 'jsonb'})
    schema!: object;
    
    @Column({default: true})
    active: boolean = true

    @CreateDateColumn({name: 'created_at'})
    createdAt!: Date

    @OneToMany(() => Exam, (exam) => exam.examTemplate)
    exams!: Exam[]
}