import {
  Entity,
  Column,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { AuditAction, AuditEntity } from '../audit/audit.types';

@Entity({ name: 'audit_logs', database: process.env.MAIN_DB })
@Index(['entity', 'entityId'])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 16 })
  action!: AuditAction;

  @Column({ type: 'varchar', length: 32 })
  entity!: AuditEntity;

  @Column({ name: 'entity_id', type: 'int' })
  entityId!: number;

  // Quem fez a ação (id do usuário no JWT). Sem FK rígida de propósito:
  // se o usuário for removido, o log histórico continua válido.
  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  // Estado anterior (null em CREATE) e novo (null em DELETE).
  @Column({ type: 'jsonb', nullable: true })
  before!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  after!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
