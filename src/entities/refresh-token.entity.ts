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
 * Por que a sessão foi revogada. Só 'ROTATED' — o caminho normal de renovação —
 * recebe a janela de tolerância a corrida entre abas: um token revogado por
 * roubo ou por logout precisa morrer no ato, ou a própria resposta ao roubo
 * daria ao atacante mais alguns segundos para renovar.
 */
export type RefreshRevokeReason =
  /** Consumida pela renovação normal. */
  | 'ROTATED'
  /** Cadeia derrubada por token reapresentado — suspeita de cookie copiado. */
  | 'REUSED'
  /** O usuário saiu. */
  | 'LOGOUT'
  /** Conta desativada ou removida por um administrador. */
  | 'ACCOUNT_DISABLED'
  /** Senha redefinida: toda sessão aberta cai junto. */
  | 'PASSWORD_RESET';

/**
 * Sessão de longa duração de um usuário.
 *
 * O token em si NUNCA é gravado: guardamos o SHA-256 dele. Um vazamento do
 * banco não devolve sessões utilizáveis. SHA-256 (e não argon2, como na senha)
 * porque o segredo tem 32 bytes aleatórios — não há dicionário para atacar, e
 * o hash precisa ser barato: ele é recalculado a cada renovação.
 *
 * `familyId` amarra a CADEIA de rotações que nasceu de um login. Cada renovação
 * revoga o token usado e emite o próximo na mesma família; se um token já
 * revogado reaparecer fora da janela de tolerância, é sinal de que alguém
 * copiou o cookie — e a família inteira cai de uma vez.
 */
@Entity({ name: 'refresh_tokens', database: process.env.MAIN_DB })
@Index('idx_refresh_tokens_user', ['userId'])
@Index('idx_refresh_tokens_family', ['familyId'])
export class RefreshToken {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  /** SHA-256 (hex) do token opaco entregue ao navegador. */
  @Column({ name: 'token_hash', type: 'char', length: 64, unique: true })
  tokenHash!: string;

  /** Cadeia de rotações originada em um login. */
  @Column({ name: 'family_id', type: 'uuid' })
  familyId!: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  /**
   * Preenchido quando o token é usado (rotação), quando o usuário faz logout
   * ou quando a família é derrubada por suspeita de roubo. Um token com esta
   * coluna preenchida não renova mais nada.
   */
  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt!: Date | null;

  /** Preenchido junto de `revokedAt`. Ver RefreshRevokeReason. */
  @Column({
    name: 'revoked_reason',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  revokedReason!: RefreshRevokeReason | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // CASCADE físico: sessão não sobrevive ao usuário. Note que a exclusão de
  // usuário aqui é SOFT delete, então na prática quem invalida a sessão de um
  // usuário desativado é a checagem de `isActive` na renovação.
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
