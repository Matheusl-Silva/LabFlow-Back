import { IsString, IsEmail, IsNotEmpty} from "class-validator";

export class SignUpDto{
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @IsString()
    @IsNotEmpty()
    pass!: string;

}