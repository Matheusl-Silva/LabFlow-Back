import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SignUpDto } from '../../auth/dto/signup.dto';

/**
 * Criação de usuário por um administrador. Diferente do auto-cadastro
 * (`/auth/signup`), o usuário nasce ativo e o admin pode defini-lo como
 * administrador direto na criação.
 */
export class CreateUserDto extends SignUpDto {
  @ApiPropertyOptional({
    description: 'Define se o novo usuário é administrador',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean = false;
}
