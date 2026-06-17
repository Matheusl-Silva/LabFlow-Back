import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from "@nestjs/class-validator";

export class UpdateExamTemplateDto{
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    name?: string;

    @IsBoolean()
    @IsOptional()
    active?: boolean;

    @IsInt()
    @IsOptional()
    version?: number;
}