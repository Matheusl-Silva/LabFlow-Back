import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  OneToMany
} from 'typeorm';
import { Exam } from './exam.entity';
import { UserRole } from './user-role.entity';

@Entity({ name: 'users', database: process.env.MAIN_DB })
// Unicidade só entre usuários ATIVOS: o e-mail de um usuário excluído fica livre
// para um novo cadastro.
@Index('ux_users_email_active', ['email'], { unique: true, where: 'deleted_at IS NULL' })
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  // Unicidade agora vem do índice parcial ux_users_email_active (ver classe).
  @Column()
  email!: string;

  @Column()
  passwordHash!: string;

  // Coluna DERIVADA de `roles`: vale `true` exatamente quando o usuário tem o
  // papel ADMIN. Mantida em sincronia pelo UserService/AuthService porque é
  // muito mais barata nas consultas de "existe admin ativo?" do que um join.
  // A autorização em si lê os papéis, não esta coluna.
  @Column({name: 'is_admin', default: false})
  isAdmin!: boolean;

  // Aprovação de admin: quem se auto-cadastra nasce inativo e não consegue
  // logar até um administrador aprovar. Usuários criados diretamente por um
  // admin já nascem ativos.
  @Column({name: 'is_active', default: false})
  isActive!: boolean;

  @CreateDateColumn({name: 'created_at'})
  createdAt!: Date;

  @UpdateDateColumn({name: 'updated_at'})
  updatedAt!: Date;

  // Soft delete: preserva quem foi preceptor/responsável dos exames (as FKs
  // continuam válidas). O TypeORM esconde os registros com deleted_at != null.
  @DeleteDateColumn({name: 'deleted_at'})
  deletedAt!: Date | null;

  @OneToMany(() => UserRole, (userRole) => userRole.user, { cascade: true })
  roles!: UserRole[]

  @OneToMany(() => Exam, (exam) => exam.preceptor)
  examsAsPreceptor!: Exam[]

  @OneToMany(() => Exam, (exam) => exam.responsible)
  examsAsResponsible!: Exam[]
}
