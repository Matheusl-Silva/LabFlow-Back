import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto.js';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from 'argon2';
import { UserRole } from '../entities/user-role.entity';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class AuthService {
    constructor(@InjectRepository(User) private readonly userRepo: Repository<User>,
                @InjectRepository(UserRole) private readonly userRoleRepo: Repository<UserRole>,
                private jwt: JwtService,
                private config: ConfigService){}

  async signin(dto: SignInDto): Promise<{ token: string }> {
    const user = await this.userRepo.findOneBy({ email: dto.email });
    // Mensagem uniforme para credencial inválida: não revela se o e-mail existe.
    if (!user) throw new UnauthorizedException('Wrong credentials');

    if (!(await verify(user.passwordHash, dto.pass))) {
      throw new UnauthorizedException('Wrong credentials');
    }

    // Conta pendente de aprovação: a senha está certa, mas o acesso ainda não
    // foi liberado por um administrador.
    if (!user.isActive) {
      throw new ForbiddenException('Conta pendente de aprovação de um administrador');
    }

    // Os papéis não vêm no findOneBy acima (relação lazy por padrão), então
    // buscamos aqui: são eles que o token carrega.
    const roles = await this.rolesOf(user.id);

    return { token: await this.signToken(user.id, roles) };
  }

  async signup(dto: SignUpDto): Promise<{ message: string }> {
    const { pass, ...remainingData } = dto;

    // Bootstrap: se ainda não existe nenhum usuário, o primeiro cadastro vira o
    // administrador inicial (ativo). Sem isso, um sistema recém-instalado ficaria
    // travado — todo mundo pendente e ninguém para aprovar.
    const isFirstUser = (await this.userRepo.count()) === 0;

    const newUser = this.userRepo.create({
      passwordHash: await hash(pass),
      ...remainingData,
      isAdmin: isFirstUser,
      isActive: isFirstUser,
    });
    const saved = await this.userRepo.save(newUser);

    // O primeiro usuário precisa do papel ADMIN, ou o sistema nasce sem
    // ninguém capaz de conceder papéis. Quem se auto-cadastra depois nasce sem
    // papel nenhum: quem define o que ele acessa é o admin que o aprovar.
    if (isFirstUser) {
      await this.userRoleRepo.save(
        this.userRoleRepo.create({ userId: saved.id, role: Role.ADMIN }),
      );
    }

    return {
      message: isFirstUser
        ? 'Conta de administrador criada com sucesso. Você já pode entrar.'
        : 'Cadastro recebido. Aguarde a aprovação de um administrador para acessar.',
    };
  }

  /** Papéis concedidos ao usuário, na forma que o token carrega. */
  private async rolesOf(userId: number): Promise<Role[]> {
    const rows = await this.userRoleRepo.findBy({ userId });
    return rows.map((row) => row.role);
  }

  private async signToken(id: number, roles: Role[]): Promise<string> {
    const payload = {
      sub: id,
      // Derivado, não fonte da verdade: o guard decide por `roles`. Mantido no
      // payload porque os controllers ainda recortam a resposta por perfil.
      isAdmin: roles.includes(Role.ADMIN),
      roles,
    };
    return this.jwt.sign(payload, {
      expiresIn: '15m',
      secret: this.config.get('JWT_SECRET'),
    });
  }
}
