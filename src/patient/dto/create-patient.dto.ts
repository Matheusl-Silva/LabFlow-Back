import { IsString, IsNotEmpty, IsEmail, IsEnum, IsPhoneNumber, IsOptional, IsDateString} from "@nestjs/class-validator"
import { Transform } from "class-transformer";
import { Period } from "../../entities/patient.entity";
import { IsCPF } from "../../common/decorators/is-cpf.decorator";
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";

export class CreatePatientDto{
    @ApiProperty({
        description: "Nome completo do paciente",
        example: "Maria da Silva",
    })
    @IsString()
    @IsNotEmpty()
    name!:string

    @ApiProperty({
        description: "E-mail do paciente",
        example: "maria.silva@email.com",
    }) 
    @IsEmail()
    @IsNotEmpty()
    email!:string

    @ApiProperty({
        description: "Período de atendimento do paciente",
        enum: Period,
        enumName: "Period",
    })
    @IsEnum(Period)
    @IsNotEmpty()
    period!:Period

    @ApiPropertyOptional({
        description: "Medicação em uso pelo paciente, se houver",
        example: "Losartana 50mg",
    })
    @IsString()
    @IsOptional()
    medication!:string

    @ApiPropertyOptional({
        description: "Patologia associada ao paciente, se houver",
        example: "Hipertensão",
    })
    @IsString()
    @IsOptional()
    pathology!:string

    @ApiProperty({
        description: "Data de nascimento do paciente (formato ISO 8601)",
        example: "1990-05-20",
    })
    @IsDateString()
    @IsNotEmpty()
    birthDate!:Date

    @ApiProperty({
        description: "Telefone do paciente. Se não vier com DDI, o prefixo +55 é adicionado automaticamente",
        example: "+5543999998888",
    })
    @Transform(({value})=> {
        if(!value) return value;
        return value.startsWith('+') ? value :`+55${value}`;
    })
    @IsPhoneNumber("BR")
    @IsNotEmpty()
    phone!:string

    @ApiProperty({
        description: "CPF do paciente (somente números ou com pontuação)",
        example: "529.982.247-25",
    })
    @IsCPF()
    @IsNotEmpty()
    cpf!:string

}