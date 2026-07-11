import { PartialType } from "@nestjs/mapped-types";
import { SignUpDto } from "../../auth/dto/signup.dto";
import { IsBoolean, IsOptional } from "@nestjs/class-validator";
import {ApiPropertyOptional} from "@nestjs/swagger";

export class UpdateUserDto extends PartialType(SignUpDto) {
    @ApiPropertyOptional({
        description: "Definição se o usuário é administrador",
        example: false
    })
    @IsOptional()
    @IsBoolean()
    isAdmin!: boolean;
}
