import { Entity, Column, JoinColumn, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn } from "typeorm";
import { ExamTemplate } from "./exam-template.entity";
import { Patient } from "./patient.entity";

@Entity({name: 'exams', database: process.env.MAIN_DB})
export class Exam {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => ExamTemplate, (examTemplate) => examTemplate.exams)
    @JoinColumn({name: 'exam_template_id'})
    examTemplate!: ExamTemplate;

    @ManyToOne(() => Patient, (patient) => patient.exams)
    @JoinColumn({name: 'patient_id'})
    patient!: Patient;

    @Column({type: 'jsonb'})
    data!: object;
    
    @CreateDateColumn({name: 'created_at'})
    createdAt!: Date;
}