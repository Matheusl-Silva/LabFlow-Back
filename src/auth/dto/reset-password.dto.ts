import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token recebido por e-mail (query string do link).',
    example: 'x7Qk3n0Vb2LmR9tYh1sPd4Fj8cWz6AuE0gNqXvBoTiI',
  })
  @IsString()
  @IsNotEmpty()
  // 32 bytes em base64url dão 43 caracteres. O teto existe só para descartar
  // corpo absurdo antes de gastar um SHA-256 e uma ida ao banco. A mensagem é
  // customizada porque ela CHEGA ao usuário: o front mostra os erros de
  // validação, e o texto padrão do class-validator sairia em inglês.
  @MaxLength(128, { message: 'Link de redefinição malformado.' })
  token!: string;

  @ApiProperty({
    description:
      'Nova senha: mínimo 8 caracteres, ao menos uma letra maiúscula e um número',
    example: 'NovaSenha123',
  })
  // Mesmas regras do cadastro (ver SignUpDto): a redefinição não pode ser uma
  // porta de entrada para senhas que o signup recusaria.
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @MaxLength(128, { message: 'A senha deve ter no máximo 128 caracteres' })
  @Matches(/[A-Z]/, {
    message: 'A senha deve conter ao menos uma letra maiúscula',
  })
  @Matches(/[0-9]/, { message: 'A senha deve conter ao menos um número' })
  pass!: string;
}
