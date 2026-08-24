import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NormalizeEmail } from '../../common/decorators/normalize-email.decorator';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'E-mail da conta que receberá o link de redefinição',
    example: 'test123@test.com',
  })
  @NormalizeEmail()
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email!: string;
}
