import { IsInt, IsObject } from "@nestjs/class-validator";

export class CreateExamDto{
    @IsInt()
    examTemplateId!: number;

    @IsInt()
    patientId!: number;

    @IsObject()
    data!: object;
}