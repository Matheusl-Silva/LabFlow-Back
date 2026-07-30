import { PartialType } from "@nestjs/mapped-types";
import { SignUpDto } from "../../auth/dto/signup.dto";
import { ArrayUnique, IsArray, IsBoolean, IsEnum, IsOptional } from "class-validator";
import {ApiPropertyOptional} from "@nestjs/swagger";
import { Role } from "../../common/enums/role.enum";

export class UpdateUserDto extends PartialType(SignUpDto) {
    @ApiPropertyOptional({
        description:
            "Papéis de acesso. SUBSTITUI a lista inteira: o que não vier é revogado. Omitir o campo mantém os papéis atuais.",
        enum: Role,
        enumName: "Role",
        isArray: true,
        example: [Role.STOCK]
    })
    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsEnum(Role, { each: true })
    roles?: Role[];

    @ApiPropertyOptional({
        description: "Ativa/aprova (true) ou desativa (false) o acesso do usuário",
        example: true
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
