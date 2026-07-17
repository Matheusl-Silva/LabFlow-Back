import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto.js';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from 'argon2';

@Injectable()
export class AuthService {
    constructor(@InjectRepository(User) private readonly userRepo: Repository<User>,
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

    return { token: await this.signToken(user.id, user.isAdmin) };
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
    await this.userRepo.save(newUser);

    return {
      message: isFirstUser
        ? 'Conta de administrador criada com sucesso. Você já pode entrar.'
        : 'Cadastro recebido. Aguarde a aprovação de um administrador para acessar.',
    };
  }

  private async signToken(id: number, isAdmin: boolean): Promise<string> {
    const payload = {
      sub: id,
      isAdmin,
    };
    return this.jwt.sign(payload, {
      expiresIn: '15m',
      secret: this.config.get('JWT_SECRET'),
    });
  }
}
