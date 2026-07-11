import { IsString, IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignUpDto {
  @ApiProperty({
    description: 'Nome do usuário',
    example: 'João da Silva',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Email único que será usado no cadastro',
    example: 'test123@test.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'Senha que será usada no cadastro',
    example: 'password123',
  })
  @IsString()
  @IsNotEmpty()
  pass!: string;
}
