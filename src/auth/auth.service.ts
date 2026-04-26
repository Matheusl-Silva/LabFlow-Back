import { Injectable, NotFoundException } from '@nestjs/common';
import { SignUpDto } from './dto/signup.dto.ts';
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
    if (!user) throw new NotFoundException('Wrong credentials');

    if (!(await verify(user.passwordHash, dto.pass))) {
      throw new NotFoundException('Wrong credentials');
    }
    return { token: await this.signToken(user.id, user.isAdmin) };
  }

  async signup(dto: SignUpDto): Promise<{ token: string }> {
    const { pass, ...remainingData } = dto;
    const newUser = this.userRepo.create({
      passwordHash: await hash(pass),
      ...remainingData,
    });
    await this.userRepo.save(newUser);
    return { token: await this.signToken(newUser.id, newUser.isAdmin) };
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
