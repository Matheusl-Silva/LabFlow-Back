import { PartialType } from "@nestjs/mapped-types";
import { SignUpDto } from "../../auth/dto/signup.dto";
import { IsBoolean, IsOptional } from "class-validator";
import {ApiPropertyOptional} from "@nestjs/swagger";

export class UpdateUserDto extends PartialType(SignUpDto) {
    @ApiPropertyOptional({
        description: "Definição se o usuário é administrador",
        example: false
    })
    @IsOptional()
    @IsBoolean()
    isAdmin!: boolean;

    @ApiPropertyOptional({
        description: "Ativa/aprova (true) ou desativa (false) o acesso do usuário",
        example: true
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
