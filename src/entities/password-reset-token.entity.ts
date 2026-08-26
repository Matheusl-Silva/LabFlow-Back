import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Pedido de redefinição de senha.
 *
 * Mesmo desenho do refresh token (ver RefreshToken): o segredo NUNCA é gravado,
 * só o SHA-256 dele. Um vazamento do banco não devolve links de reset
 * utilizáveis. SHA-256 e não argon2 porque o token tem 32 bytes de CSPRNG — não
 * existe dicionário a atacar, e o hash é recalculado a cada validação.
 *
 * A diferença para o refresh é o prazo e o uso único: este token vive minutos e
 * morre na primeira utilização. Ele contorna a senha, então tudo nele é
 * deliberadamente estreito.
 */
@Entity({ name: 'password_reset_tokens', database: process.env.MAIN_DB })
@Index('idx_password_reset_tokens_user', ['userId'])
export class PasswordResetToken {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  /** SHA-256 (hex) do token enviado no link do e-mail. */
  @Column({ name: 'token_hash', type: 'char', length: 64, unique: true })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  /**
   * Preenchido no momento em que a senha é trocada. Uso único: um link já
   * usado não redefine nada de novo, mesmo dentro do prazo de validade — é o
   * que impede que o link no histórico do e-mail vire uma chave permanente.
   */
  @Column({ name: 'used_at', type: 'timestamp', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
