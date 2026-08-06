import { ArrayUnique, IsArray, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SignUpDto } from '../../auth/dto/signup.dto';
import { Role } from '../../common/enums/role.enum';

/**
 * Criação de usuário por um administrador. Diferente do auto-cadastro
 * (`/auth/signup`), o usuário nasce ativo e o admin já define os papéis.
 */
export class CreateUserDto extends SignUpDto {
  @ApiPropertyOptional({
    description:
      'Papéis de acesso. Vazio = conta ativa sem acesso a nenhum módulo, útil para aprovar antes de decidir o que a pessoa acessa.',
    enum: Role,
    enumName: 'Role',
    isArray: true,
    example: [Role.EXAMS, Role.PATIENTS],
    default: [],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(Role, { each: true })
  roles?: Role[] = [];
}
