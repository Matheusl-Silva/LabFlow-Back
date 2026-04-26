import { PartialType } from "@nestjs/mapped-types";
import { SignUpDto } from "../../auth/dto/signup.dto.ts";
import { IsBoolean, IsOptional } from "@nestjs/class-validator";

export class UpdateUserDto extends PartialType(SignUpDto) {
    @IsOptional()
    @IsBoolean()
    isAdmin!: boolean;
}
