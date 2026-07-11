import { IsEmail, IsNotEmpty, IsString } from "@nestjs/class-validator";
import {ApiProperty} from "@nestjs/swagger";

export class SignInDto{
    @ApiProperty({
        description: 'Email usado no cadastro',
        example: "test123@test.com"
    })
    @IsString()
    @IsEmail()
    email!: string;

    @ApiProperty({
        description: "Senha usada no cadastro",
        example: 'password123'
    })
    @IsString()
    @IsNotEmpty()
    pass!: string
}