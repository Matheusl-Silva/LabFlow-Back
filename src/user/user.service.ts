import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from '../entities/user.entity';
import { Not, Repository } from 'typeorm';
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

  private static readonly PUBLIC_FIELDS = {
    id: true,
    name: true,
    email: true,
    isAdmin: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  /** Criação por administrador: o usuário nasce ativo. */
  async create(dto: CreateUserDto): Promise<User> {
    const { pass, isAdmin, ...remainingData } = dto;
    const newUser = this.userRepo.create({
      ...remainingData,
      passwordHash: await hash(pass),
      isAdmin: isAdmin ?? false,
      isActive: true,
    });
    const saved = await this.userRepo.save(newUser);
    return this.userRepo.findOneOrFail({
      where: { id: saved.id },
      select: UserService.PUBLIC_FIELDS,
    });
  }

  get(): Promise<User[]> {
    return this.userRepo.find({ select: UserService.PUBLIC_FIELDS });
  }

  /** Usuário comum só enxerga o mínimo para escolher preceptor/responsável. */
  getPrivate(): Promise<User[]> {
    return this.userRepo.find({ select: { id: true, name: true } });
  }

  async getById(id: number): Promise<User | null> {
    const user = await this.userRepo.findOne({
      where: { id },
      select: UserService.PUBLIC_FIELDS,
    });
    if(!user) throw new NotFoundException("User not found");
    return user;
  }

  async update(id: number, dto: UpdateUserDto): Promise<boolean> {
    const user = await this.userRepo.findOneBy({ id });

    if (!user) throw new NotFoundException('User not found');

    // Um administrador ativo deixaria de sê-lo se fosse rebaixado (isAdmin=false)
    // ou desativado (isActive=false). Nesses casos, não pode ser o último.
    const nextIsAdmin = dto.isAdmin ?? user.isAdmin;
    const nextIsActive = dto.isActive ?? user.isActive;
    if (this.countsAsAdmin(user) && !(nextIsAdmin && nextIsActive)) {
      await this.assertNotLastAdmin(user.id);
    }

    const { pass, ...remainingData } = dto;
    const newData: any = { ...remainingData };

    if (pass) newData.passwordHash = await hash(pass);

    const result = await this.userRepo.update(user.id, newData);

    return (result.affected ?? 0) > 0;
  }

  async delete(id: number): Promise<boolean> {
    const user = await this.userRepo.findOneBy({ id });

    if (!user) throw new NotFoundException('User not found');

    if (this.countsAsAdmin(user)) await this.assertNotLastAdmin(user.id);

    // Soft delete: marca deleted_at em vez de remover a linha, preservando os
    // exames em que o usuário foi preceptor/responsável (e as FKs).
    const result = await this.userRepo.softDelete({ id });

    if(!result.affected) throw new NotFoundException("User not found");

    return true;
  }

  /** Só conta como administrador do sistema quem é admin E está ativo. */
  private countsAsAdmin(user: User): boolean {
    return user.isAdmin && user.isActive;
  }

  /**
   * Garante que existe outro administrador ativo além de `excludeId`. O sistema
   * nunca pode ficar sem nenhum administrador que consiga logar.
   */
  private async assertNotLastAdmin(excludeId: number): Promise<void> {
    const otherAdmins = await this.userRepo.count({
      where: { id: Not(excludeId), isAdmin: true, isActive: true },
    });
    if (otherAdmins === 0) {
      throw new ConflictException(
        'Não é possível remover o último administrador ativo do sistema.',
      );
    }
  }
}
