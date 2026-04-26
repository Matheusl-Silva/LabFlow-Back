import { IsEmail, IsNotEmpty, IsString } from "@nestjs/class-validator";

export class SignInDto{
    @IsString()
    @IsEmail()
    email!: string;

    @IsString()
    @IsNotEmpty()
    pass!: string
}