import { IsDateString, IsInt, IsObject } from "@nestjs/class-validator";

export class CreateExamDto{
    @IsInt()
    examTemplateId!: number;

    @IsInt()
    patientId!: number;

    @IsInt()
    preceptorId!: number;

    @IsInt()
    responsibleId!: number;

    @IsDateString()
    date!: Date;

    @IsObject()
    data!: object;
}