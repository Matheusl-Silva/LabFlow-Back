import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private jwt : JwtService,
    private config: ConfigService
  ) {}

  get(): Promise<User[]> {
    return this.userRepo.find();
  }

  async getById(id: number): Promise<User | null> {
    const user = await this.userRepo.findOneBy({ id });
    if(!user) throw new NotFoundException("User not found");
    return user;
  }

  async update(id: number, dto: UpdateUserDto): Promise<boolean> {
    const user = await this.userRepo.findOneBy({ id });

    if (!user) throw new NotFoundException('User not found');

    const { pass, ...remainingData } = dto;
    const newData: any = { ...remainingData };

    if (pass) newData.passwordHash = await hash(pass);

    const result = await this.userRepo.update(user.id, newData);1

    return (result.affected ?? 0) > 0;
  }

  async delete(id: number): Promise<boolean> {

    const result = await this.userRepo.delete({ id });

    if(!result.affected) throw new NotFoundException("User not found");

    return true;
  }
}
