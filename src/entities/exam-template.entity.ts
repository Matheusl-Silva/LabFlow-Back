import {Column, CreateDateColumn, DeleteDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn} from 'typeorm';
import { Exam } from './exam.entity';

@Entity({name: 'exam_templates', database: process.env.MAIN_DB})
export class ExamTemplate {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @Column({default: 1})
    version!: number;

    @Column({name: 'schema_json', type: 'jsonb'})
    schema!: object;
    
    @Column({default: true})
    active!: boolean

    @CreateDateColumn({name: 'created_at'})
    createdAt!: Date

    @UpdateDateColumn({name: 'updated_at'})
    updatedAt!: Date

    @DeleteDateColumn({name: 'deleted_at'})
    deletedAt!: Date

    @OneToMany(() => Exam, (exam) => exam.examTemplate)
    exams!: Exam[]
}