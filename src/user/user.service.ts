import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from '../entities/user.entity';
import { UserRole } from '../entities/user-role.entity';
import { EntityManager, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '../common/enums/role.enum';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntity } from '../audit/audit.types';

/**
 * Usuário como a API devolve: os papéis achatados em `string[]`, e não como
 * linhas de `user_roles`. O cliente não precisa saber da tabela de junção.
 */
export interface UserView {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  isActive: boolean;
  roles: Role[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserRole) private readonly userRoleRepo: Repository<UserRole>,
    private readonly audit: AuditService,
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

  private toView(user: User, roles: Role[]): UserView {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: roles.includes(Role.ADMIN),
      isActive: user.isActive,
      roles,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /** Papéis de vários usuários numa consulta só (evita N+1 na listagem). */
  private async rolesByUser(userIds: number[]): Promise<Map<number, Role[]>> {
    const map = new Map<number, Role[]>(userIds.map((id) => [id, []]));
    if (userIds.length === 0) return map;

    const rows = await this.userRoleRepo.findBy({ userId: In(userIds) });
    for (const row of rows) {
      map.get(row.userId)?.push(row.role);
    }
    return map;
  }

  private async rolesOf(userId: number): Promise<Role[]> {
    const rows = await this.userRoleRepo.findBy({ userId });
    return rows.map((row) => row.role);
  }

  /**
   * Substitui a lista de papéis por completo. Roda dentro da transação de quem
   * chama para que usuário e papéis nunca fiquem dessincronizados — e mantém
   * `users.is_admin` coerente, já que é coluna derivada.
   */
  private async replaceRoles(
    manager: EntityManager,
    userId: number,
    roles: Role[],
  ): Promise<void> {
    const unique = [...new Set(roles)];

    await manager.delete(UserRole, { userId });
    if (unique.length > 0) {
      await manager.insert(
        UserRole,
        unique.map((role) => ({ userId, role })),
      );
    }
    await manager.update(User, userId, { isAdmin: unique.includes(Role.ADMIN) });
  }

  /** Criação por administrador: o usuário nasce ativo. */
  async create(dto: CreateUserDto, actorId: number): Promise<UserView> {
    const { pass, roles, ...remainingData } = dto;
    const nextRoles = roles ?? [];

    const saved = await this.userRepo.manager.transaction(async (manager) => {
      const created = await manager.save(
        manager.create(User, {
          ...remainingData,
          passwordHash: await hash(pass),
          isAdmin: nextRoles.includes(Role.ADMIN),
          isActive: true,
        }),
      );
      await this.replaceRoles(manager, created.id, nextRoles);
      return created;
    });

    await this.audit.record({
      action: AuditAction.CREATE,
      entity: AuditEntity.USER,
      entityId: saved.id,
      userId: actorId,
      after: {
        name: saved.name,
        email: saved.email,
        isActive: true,
        roles: nextRoles,
      },
    });

    return this.toView(saved, nextRoles);
  }

  async get(): Promise<UserView[]> {
    const users = await this.userRepo.find({ select: UserService.PUBLIC_FIELDS });
    const roles = await this.rolesByUser(users.map((u) => u.id));
    return users.map((user) => this.toView(user, roles.get(user.id) ?? []));
  }

  /** Quem não administra usuários só enxerga o mínimo para escolher preceptor/responsável. */
  getPrivate(): Promise<User[]> {
    return this.userRepo.find({ select: { id: true, name: true } });
  }

  /**
   * Quem pode ser preceptor ou responsável por um exame: administradores
   * ativos, e mais ninguém. Assinar um laudo é responsabilidade técnica pelo
   * resultado — não é porque alguém consegue LANÇAR o exame (papel EXAMS) que
   * pode responder por ele.
   *
   * Devolve só `{id, name}`: a lista alimenta um <select> e é visível a
   * qualquer usuário autenticado, inclusive a quem não administra usuários —
   * e-mail, papéis e situação da conta continuam restritos ao admin.
   *
   * Conta inativa fica de fora: não loga, não opera, não assina.
   */
  getExamStaff(): Promise<User[]> {
    return this.userRepo.find({
      where: { isAdmin: true, isActive: true },
      // `isAdmin`/`isActive` saem no payload mesmo sendo constantes aqui (todo
      // mundo na lista é admin ativo): sem eles o cliente teria de assumir o
      // valor, e um dia assumiria errado.
      select: { id: true, name: true, isAdmin: true, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async getById(id: number): Promise<UserView> {
    const user = await this.userRepo.findOne({
      where: { id },
      select: UserService.PUBLIC_FIELDS,
    });
    if(!user) throw new NotFoundException("User not found");
    return this.toView(user, await this.rolesOf(id));
  }

  async update(id: number, dto: UpdateUserDto, actorId: number): Promise<boolean> {
    const user = await this.userRepo.findOneBy({ id });

    if (!user) throw new NotFoundException('User not found');

    const currentRoles = await this.rolesOf(id);
    // `roles` ausente = não mexer nos papéis. Array vazio = revogar todos.
    const nextRoles = dto.roles ?? currentRoles;
    const nextIsActive = dto.isActive ?? user.isActive;

    // Um administrador ativo deixaria de sê-lo se perdesse o papel ADMIN ou
    // fosse desativado. Nesses casos, não pode ser o último.
    const wasAdmin = currentRoles.includes(Role.ADMIN) && user.isActive;
    const willBeAdmin = nextRoles.includes(Role.ADMIN) && nextIsActive;
    if (wasAdmin && !willBeAdmin) {
      await this.assertNotLastAdmin(user.id);
    }

    const { pass, roles, ...remainingData } = dto;
    const newData: any = { ...remainingData };

    if (pass) newData.passwordHash = await hash(pass);

    const affected = await this.userRepo.manager.transaction(async (manager) => {
      const result = await manager.update(User, user.id, newData);
      // Depois do update dos demais campos: replaceRoles também escreve
      // `is_admin` e precisa ser a última palavra sobre essa coluna.
      if (dto.roles) await this.replaceRoles(manager, user.id, nextRoles);
      return result.affected ?? 0;
    });

    // Mudança de permissão é exatamente o tipo de evento que se quer rastrear
    // depois — por isso auditamos mesmo quando só os papéis mudaram.
    await this.audit.record({
      action: AuditAction.UPDATE,
      entity: AuditEntity.USER,
      entityId: id,
      userId: actorId,
      before: {
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        roles: currentRoles,
      },
      after: {
        name: newData.name ?? user.name,
        email: newData.email ?? user.email,
        isActive: nextIsActive,
        roles: nextRoles,
      },
    });

    return affected > 0;
  }

  async delete(id: number, actorId: number): Promise<boolean> {
    const user = await this.userRepo.findOneBy({ id });

    if (!user) throw new NotFoundException('User not found');

    const roles = await this.rolesOf(id);
    if (roles.includes(Role.ADMIN) && user.isActive) {
      await this.assertNotLastAdmin(user.id);
    }

    // Soft delete: marca deleted_at em vez de remover a linha, preservando os
    // exames em que o usuário foi preceptor/responsável (e as FKs). Os papéis
    // permanecem — a linha de `users` continua existindo — e voltam junto se o
    // usuário for restaurado.
    const result = await this.userRepo.softDelete({ id });

    if(!result.affected) throw new NotFoundException("User not found");

    await this.audit.record({
      action: AuditAction.DELETE,
      entity: AuditEntity.USER,
      entityId: id,
      userId: actorId,
      before: {
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        roles,
      },
    });

    return true;
  }

  /**
   * Garante que existe outro administrador ativo além de `excludeId`. O sistema
   * nunca pode ficar sem nenhum administrador que consiga logar.
   *
   * Conta pelo PAPEL, e não por `users.is_admin`: a coluna é derivada, e usá-la
   * aqui faria a trava parar de valer silenciosamente no dia em que as duas
   * divergissem.
   */
  private async assertNotLastAdmin(excludeId: number): Promise<void> {
    const otherAdmins = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin(User, 'u', 'u.id = ur.user_id')
      .where('ur.role = :role', { role: Role.ADMIN })
      .andWhere('ur.user_id != :excludeId', { excludeId })
      .andWhere('u.is_active = true')
      .andWhere('u.deleted_at IS NULL')
      .getCount();

    if (otherAdmins === 0) {
      throw new ConflictException(
        'Não é possível remover o último administrador ativo do sistema.',
      );
    }
  }
}
