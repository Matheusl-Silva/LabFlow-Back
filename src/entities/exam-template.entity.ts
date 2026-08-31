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

    // Material e método são propriedades do TIPO de exame, não do exame lançado:
    // hemograma é sempre sangue total / citometria de fluxo. Ficam no modelo para
    // o operador não redigitar a cada lançamento. Nulos nos modelos antigos — o
    // laudo simplesmente omite a linha.
    @Column({type: 'varchar', length: 120, nullable: true})
    material!: string | null;

    @Column({type: 'varchar', length: 120, nullable: true})
    method!: string | null;
    
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