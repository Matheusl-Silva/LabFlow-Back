import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NormalizeEmail } from '../../common/decorators/normalize-email.decorator';

export class SignInDto {
  @ApiProperty({
    description: 'Email usado no cadastro',
    example: 'test123@test.com',
  })
  @NormalizeEmail()
  @IsString()
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Senha usada no cadastro',
    example: 'password123',
  })
  @IsString()
  @IsNotEmpty()
  pass!: string;
}
