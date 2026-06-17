import { Entity, Column, JoinColumn, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from "typeorm";
import { ExamTemplate } from "./exam-template.entity";
import { Patient } from "./patient.entity";
import { User } from "./user.entity";

@Entity({name: 'exams', database: process.env.MAIN_DB})
export class Exam {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => ExamTemplate, (examTemplate) => examTemplate.exams)
    @JoinColumn({name: 'exam_template_id'})
    examTemplate!: ExamTemplate;

    @Column({name: 'exam_template_id'})
    examTemplateId!: number;

    @ManyToOne(() => Patient, (patient) => patient.exams)
    @JoinColumn({name: 'patient_id'})
    patient!: Patient;

    @Column({name: 'patient_id'})
    patientId!: number;

    @Column({type: 'jsonb'})
    data!: object;

    @Column()
    date!: Date;

    @ManyToOne(() => User, (user) => user.examsAsPreceptor)
    @JoinColumn({name: 'preceptor_id'})
    preceptor!: User;

    @Column({name: 'preceptor_id'})
    preceptorId!: number;

    @ManyToOne(() => User, (user) => user.examsAsResponsible)
    @JoinColumn({name: 'responsible_id'})
    responsible!: User;

    @Column({name: 'responsible_id'})
    responsibleId!: number;

    @CreateDateColumn({name: 'created_at'})
    createdAt!: Date;

    @UpdateDateColumn({name: 'updated_at'})
    updatedAt!: Date;

    @DeleteDateColumn({name: 'deleted_at'})
    deletedAt!: Date;
}