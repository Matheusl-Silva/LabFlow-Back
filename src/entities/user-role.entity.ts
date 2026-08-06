import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Role } from '../common/enums/role.enum';

/**
 * Papéis concedidos a um usuário (N:N). PK composta (user_id, role) impede
 * conceder o mesmo papel duas vezes sem precisar de checagem na aplicação.
 */
@Entity({ name: 'user_roles', database: process.env.MAIN_DB })
@Index('idx_user_roles_user', ['userId'])
export class UserRole {
  @PrimaryColumn({ name: 'user_id', type: 'int' })
  userId!: number;

  @PrimaryColumn({ type: 'varchar', length: 32 })
  role!: Role;

  @CreateDateColumn({ name: 'granted_at' })
  grantedAt!: Date;

  // CASCADE: o papel não faz sentido sem o usuário. Note que a exclusão de
  // usuário é SOFT delete — a linha de users permanece, então os papéis também
  // permanecem e voltam junto se o usuário for restaurado.
  @ManyToOne(() => User, (user) => user.roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
