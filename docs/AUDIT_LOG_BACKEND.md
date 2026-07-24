# Auditoria (Audit Log) — Guia de implementação (Backend)

Objetivo: registrar **quem** criou, editou ou excluiu **exames, templates, pacientes
e anamneses**, guardando o **estado anterior e o novo (diff completo)**, e expor uma
rota **somente-admin** `GET /audit-log` para o front montar a tela de "Logs".

Stack existente: NestJS 11 + TypeORM 0.3 (Postgres) + JWT global (`JwtGuard` +
`AdminGuard`). O JWT já carrega `{ id, isAdmin }` (ver `src/common/types/jwt.payload.type.ts`).

> Convenção do projeto: migrations manuais em `src/migrations`, entidades em
> `src/entities`, guards globais em `app.module.ts`. Vamos seguir o mesmo padrão.

---

## Visão geral do que será criado

| Arquivo | Papel |
|---|---|
| `src/entities/audit-log.entity.ts` | Tabela `audit_logs` |
| `src/audit/audit.service.ts` | Grava um log (`record(...)`) e lista (`find(...)`) |
| `src/audit/audit.controller.ts` | `GET /audit-log` (admin) com filtros/paginação |
| `src/audit/audit.module.ts` | Módulo; **exporta** o `AuditService` |
| `src/audit/dto/query-audit-log.dto.ts` | Filtros da listagem |
| `src/audit/audit.types.ts` | Enums `AuditAction` / `AuditEntity` |
| `src/migrations/<ts>-CreateAuditLogs.ts` | Cria a tabela |

E alterações em: `app.module.ts`, e nos módulos/serviços/controllers de
**exam, exam-template, patient, anamnesis** para chamar o `AuditService`.

---

## Passo 1 — Enums de apoio

`src/audit/audit.types.ts`

```ts
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export enum AuditEntity {
  EXAM = 'exam',
  EXAM_TEMPLATE = 'exam_template',
  PATIENT = 'patient',
  ANAMNESIS = 'anamnesis',
}
```

---

## Passo 2 — Entidade `AuditLog`

`src/entities/audit-log.entity.ts`

```ts
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
```

> `autoLoadEntities: true` já está ligado em `src/providers/database/main.db.ts`,
> então a entidade é carregada automaticamente pela aplicação. Para as migrations,
> o `data-source.ts` usa glob `src/entities/*.entity.ts` — também já cobre.

---

## Passo 3 — DTO de consulta

`src/audit/dto/query-audit-log.dto.ts`

```ts
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AuditAction, AuditEntity } from '../audit.types';

export class QueryAuditLogDto {
  @IsOptional()
  @IsEnum(AuditEntity)
  entity?: AuditEntity;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  entityId?: number;

  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
```

> Confirme que o `ValidationPipe` global está com `transform: true` no `main.ts`
> (necessário para o `@Type(() => Number)` converter os query params). Se não
> estiver, adicione: `app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))`.

---

## Passo 4 — `AuditService`

`src/audit/audit.service.ts`

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { AuditAction, AuditEntity } from './audit.types';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

interface RecordInput {
  action: AuditAction;
  entity: AuditEntity;
  entityId: number;
  userId: number;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>,
  ) {}

  /**
   * Grava um evento de auditoria. NUNCA deve derrubar a operação principal:
   * auditar é efeito colateral, então engolimos erros de escrita do log
   * (apenas logando no console) para não transformar um erro de auditoria em
   * um 500 numa edição de exame que deu certo.
   */
  async record(input: RecordInput): Promise<void> {
    try {
      const log = this.repo.create({
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        userId: input.userId,
        before: input.before ?? null,
        after: input.after ?? null,
      });
      await this.repo.save(log);
    } catch (err) {
      console.error('[AuditService] falha ao gravar log de auditoria', err);
    }
  }

  async find(query: QueryAuditLogDto): Promise<{ data: AuditLog[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.repo
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.entity) qb.andWhere('log.entity = :entity', { entity: query.entity });
    if (query.entityId) qb.andWhere('log.entity_id = :entityId', { entityId: query.entityId });
    if (query.action) qb.andWhere('log.action = :action', { action: query.action });
    if (query.userId) qb.andWhere('log.user_id = :userId', { userId: query.userId });

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }
}
```

---

## Passo 5 — `AuditController`

`src/audit/audit.controller.ts`

```ts
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

// SEM @AllowCommonUser(): o AdminGuard global já barra usuário comum (403).
@ApiTags('Auditoria')
@Controller('audit-log')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  async find(@Query() query: QueryAuditLogDto) {
    return this.service.find(query);
  }
}
```

> Como os guards `JwtGuard` e `AdminGuard` são `APP_GUARD` globais e esta rota
> **não** tem o decorator `@AllowCommonUser()`, ela fica automaticamente restrita
> a administradores. É exatamente o comportamento que a tela de Logs precisa.

---

## Passo 6 — `AuditModule`

`src/audit/audit.module.ts`

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService], // usado pelos módulos de exam/patient/template/anamnesis
})
export class AuditModule {}
```

Registre em `src/app.module.ts` (adicione ao array `imports`):

```ts
import { AuditModule } from './audit/audit.module';
// ...
imports: [ /* ... */, AnamnesisModule, AuditModule ],
```

---

## Passo 7 — Migration

Gere um timestamp no mesmo padrão dos arquivos existentes (ex.: `1784165400000`).

`src/migrations/1784165400000-CreateAuditLogs.ts`

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogs1784165400000 implements MigrationInterface {
  name = 'CreateAuditLogs1784165400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" SERIAL NOT NULL,
        "action" character varying(16) NOT NULL,
        "entity" character varying(32) NOT NULL,
        "entity_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "before" jsonb,
        "after" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_entity" ON "audit_logs" ("entity", "entity_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_created_at" ON "audit_logs" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_entity"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}
```

Rodar:

```bash
npm run migration:run
```

---

## Passo 8 — Passar o usuário logado até os services

Hoje só `getById` usa `@UserFromJwt()`. Precisamos capturar o usuário nas rotas de
**create/update/delete** e repassar o `user.id` para o service.

### 8.1 Exam — `src/exam/exam.controller.ts`

Adicione o import (já existe `UserFromJwt` e `JwtPayload`) e injete o usuário:

```ts
@ExamSwagger.createExam()
@AllowCommonUser()
@Post()
async create(
  @Body() dto: CreateExamDto,
  @UserFromJwt() user: JwtPayload,
): Promise<Exam> {
  return this.service.create(dto, user.id);
}

@ExamSwagger.updateExam()
@Put(':id')
async update(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: UpdateExamDto,
  @UserFromJwt() user: JwtPayload,
): Promise<{ message: string }> {
  await this.service.update(id, dto, user.id);
  return { message: 'Exam has been updated successfully' };
}

@ExamSwagger.deleteExam()
@Delete(':id')
async softDelete(
  @Param('id', ParseIntPipe) id: number,
  @UserFromJwt() user: JwtPayload,
): Promise<{ message: string }> {
  await this.service.softDelete(id, user.id);
  return { message: 'Exam has been deleted successfully' };
}
```

### 8.2 Exam — `src/exam/exam.service.ts`

Injete o `AuditService` e registre nos 3 pontos. Note o **`before` capturado
antes** do update/delete:

```ts
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntity } from '../audit/audit.types';

// no constructor:
constructor(
  @InjectRepository(Exam) private readonly repo: Repository<Exam>,
  @InjectRepository(ExamTemplate) private readonly templateRepo: Repository<ExamTemplate>,
  private readonly audit: AuditService,
) {}

async create(dto: CreateExamDto, userId: number): Promise<Exam> {
  const template = await this.templateRepo.findOneBy({ id: dto.examTemplateId });
  if (!template) throw new BadRequestException('Exam template does not exist');
  if (!isValidExam(dto.data, template.schema))
    throw new BadRequestException("The exam does not follow it's schema");

  const exam = this.repo.create(dto);
  try {
    const saved = await this.repo.save(exam);
    await this.audit.record({
      action: AuditAction.CREATE,
      entity: AuditEntity.EXAM,
      entityId: saved.id,
      userId,
      after: { ...saved },
    });
    return saved;
  } catch (err) {
    if (err instanceof QueryFailedError && err.driverError?.code === '23503') {
      throw new BadRequestException('Paciente, preceptor ou responsável inexistente');
    }
    throw err;
  }
}

async update(id: number, dto: UpdateExamDto, userId: number) {
  const exam = await this.repo.findOneBy({ id });
  if (!exam) throw new NotFoundException('Exam not found');

  const template = await this.templateRepo.findOneBy({ id: exam.examTemplateId });
  if (!template) throw new InternalServerErrorException('Template not found');
  if (dto.data && !isValidExam(dto.data, template.schema))
    throw new BadRequestException("The exam does not follow it's schema");

  const before = { ...exam }; // snapshot antes de alterar

  try {
    const result = await this.repo.update(id, dto);
    const after = await this.repo.findOneBy({ id });
    await this.audit.record({
      action: AuditAction.UPDATE,
      entity: AuditEntity.EXAM,
      entityId: id,
      userId,
      before,
      after: after ? { ...after } : null,
    });
    return (result.affected ?? 0) > 0;
  } catch (err) {
    if (err instanceof QueryFailedError && err.driverError?.code === '23503') {
      throw new BadRequestException('Preceptor ou responsável inexistente');
    }
    throw err;
  }
}

async softDelete(id: number, userId: number): Promise<boolean> {
  const exam = await this.repo.findOneBy({ id });
  if (!exam) throw new NotFoundException('Exam not found');

  const result = await this.repo.softDelete(id);
  await this.audit.record({
    action: AuditAction.DELETE,
    entity: AuditEntity.EXAM,
    entityId: id,
    userId,
    before: { ...exam },
  });
  return (result.affected ?? 0) > 0;
}
```

### 8.3 Exam — `src/exam/exam.module.ts`

Importe o `AuditModule` para que o `AuditService` seja injetável:

```ts
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Exam, Patient, User, ExamTemplate]), AuditModule],
  providers: [ExamService],
  controllers: [ExamController],
})
export class ExamModule {}
```

### 8.4 Repita o padrão para os outros módulos

Mesma receita (controller injeta `@UserFromJwt()` → passa `user.id` ao service →
service captura `before`/`after` e chama `this.audit.record(...)` → module importa
`AuditModule`):

- **Patient** (`AuditEntity.PATIENT`): `create` / `update` / `delete` em
  `src/patient/patient.*`. Cuidado: `create` pode **restaurar** um paciente
  soft-deleted — registre como `CREATE` mesmo assim (é o registro voltando).
- **ExamTemplate** (`AuditEntity.EXAM_TEMPLATE`): `create` / `update` /
  `softDelete` / `createNewVersion` em `src/exam-template/exam-template.*`.
  Para `createNewVersion`, registre um `UPDATE` (desativou a versão) + um
  `CREATE` (nova versão) — ou um único `UPDATE` com `before`=antiga/`after`=nova,
  a seu critério.
- **Anamnesis** (`AuditEntity.ANAMNESIS`): `create` / `update` / `delete` em
  `src/anamnesis/anamnesis.*`. Este controller ainda não importa
  `UserFromJwt`/`JwtPayload` — adicione os imports.

> Dica anti-repetição: se preferir, os campos pesados/irrelevantes (`data` de
> exame pode ser grande) podem ser mantidos — o diff completo foi o requisito.
> Só evite logar campos sensíveis desnecessários. Para paciente, considere
> **não** guardar CPF em texto no `before/after` se isso preocupar do ponto de
> vista de LGPD (ex.: `const { cpf, ...rest } = patient`).

---

## Passo 9 — Formato de resposta esperado pelo front

`GET /audit-log?entity=exam&page=1&limit=20` responde:

```json
{
  "data": [
    {
      "id": 42,
      "action": "UPDATE",
      "entity": "exam",
      "entityId": 7,
      "userId": 3,
      "before": { "id": 7, "data": { "hemoglobina": 12 }, "...": "..." },
      "after":  { "id": 7, "data": { "hemoglobina": 14 }, "...": "..." },
      "createdAt": "2026-07-23T18:30:00.000Z"
    }
  ],
  "total": 137
}
```

### (Opcional, recomendado) Nome do usuário no log

O front vai querer mostrar **"Fulano editou..."**, não `userId: 3`. Duas opções:

1. **Join na listagem** (mais simples): no `find()`, faça
   `leftJoin('users', 'u', 'u.id = log.user_id')` e selecione `u.name`,
   devolvendo um campo `userName`. Requer saber o nome da tabela/coluna de
   usuário (ver `src/entities/user.entity.ts`).
2. **Front resolve**: o front já tem `useUsuariosQuery()` (admin) e pode mapear
   `userId → nome` no cliente. Menos acoplamento no backend.

O guia do front assume a **opção 2** por padrão, mas suporta `userName` se vier.

---

## Passo 10 — Checklist de validação

- [ ] `npm run build` sem erros de tipo.
- [ ] `npm run migration:run` cria `audit_logs`.
- [ ] Criar/editar/excluir um exame gera linha em `audit_logs` com `before`/`after`.
- [ ] `GET /audit-log` como **admin** → 200 com paginação.
- [ ] `GET /audit-log` como **usuário comum** → 403 (AdminGuard).
- [ ] Filtros `?entity=&entityId=&action=&userId=` funcionam.
- [ ] Uma falha proposital no `record()` **não** derruba a operação principal.

---

## Ordem sugerida de execução

1. Passos 1–7 (entidade, service, controller, module, migration) e rodar a migration.
2. Passo 8.1–8.3 (exam ponta a ponta) e testar com o front/Swagger.
3. Passo 8.4 (patient, template, anamnesis) replicando o padrão.
4. Passo 9 opcional (userName) se quiser resolver o nome no backend.
