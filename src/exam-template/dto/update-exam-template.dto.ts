import { IsBoolean, IsInt, IsNotEmpty, IsString } from "@nestjs/class-validator";

export class UpdateExamTemplateDto{
    @IsString()
    @IsNotEmpty()
    name?: string;

    @IsBoolean()
    active?: boolean;

    @IsInt()
    version?: number;
}