import { IsString, IsNotEmpty, IsEmail, IsEnum, IsPhoneNumber, IsOptional, IsDateString} from "@nestjs/class-validator"
import { Transform } from "class-transformer";
import { Period } from "../../entities/patient.entity";
import { IsCPF } from "../../common/decorators/is-cpf.decorator";

export class CreatePatientDto{
    @IsString()
    @IsNotEmpty()
    name!:string

    @IsEmail()
    @IsNotEmpty()
    email!:string

    @IsEnum(Period)
    @IsNotEmpty()
    period!:Period

    @IsString()
    @IsOptional()
    medication!:string

    @IsString()
    @IsOptional()
    pathology!:string

    @IsDateString()
    @IsNotEmpty()
    birthDate!:Date

    @Transform(({value})=> {
        if(!value) return value;
        return value.startsWith('+') ? value :`+55${value}`;
    })
    @IsPhoneNumber("BR")
    @IsNotEmpty()
    phone!:string

    @IsCPF()
    @IsNotEmpty()
    cpf!:string

}