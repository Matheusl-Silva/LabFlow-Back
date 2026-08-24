import { plainToInstance } from 'class-transformer';
import { SignInDto } from './signin.dto';
import { SignUpDto } from './signup.dto';
import { ForgotPasswordDto } from './forgot-password.dto';
import { CreateUserDto } from '../../user/dto/create-user.dto';
import { UpdateUserDto } from '../../user/dto/update-user.dto';

/**
 * O Postgres compara e-mail com distinção de maiúsculas, então a normalização
 * na borda é o que sustenta as buscas por igualdade simples em todo o
 * AuthService e UserService. Estes testes existem porque a herança é a parte
 * frágil: CreateUserDto estende SignUpDto e UpdateUserDto passa por
 * PartialType — se qualquer um dos dois parar de carregar o @Transform, o
 * sintoma seria um usuário que não consegue logar, e não um erro de build.
 */
describe('normalização de e-mail nos DTOs', () => {
  const bagunçado = '  MAria.Silva@Lab.COM.BR  ';
  const esperado = 'maria.silva@lab.com.br';

  it.each([
    ['SignUpDto', SignUpDto],
    ['SignInDto', SignInDto],
    ['ForgotPasswordDto', ForgotPasswordDto],
    // Herda por extends.
    ['CreateUserDto', CreateUserDto],
    // Herda por PartialType — o caminho que mais facilmente perderia o
    // @Transform numa troca de versão do @nestjs/mapped-types.
    ['UpdateUserDto', UpdateUserDto],
  ])('%s apara espaços e passa para minúsculas', (_nome, Dto) => {
    const dto = plainToInstance(Dto, { email: bagunçado }) as { email: string };
    expect(dto.email).toBe(esperado);
  });

  it('não quebra quando o e-mail não é string', () => {
    // O @Transform roda ANTES do @IsEmail: se ele assumisse string, um corpo
    // com `email: 123` viraria 500 em vez do 400 de validação.
    const dto = plainToInstance(SignInDto, { email: 123 }) as {
      email: unknown;
    };
    expect(dto.email).toBe(123);
  });
});
