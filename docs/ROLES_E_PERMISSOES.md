# Papéis de acesso (roles) por módulo

Objetivo: sair do binário **admin / usuário comum** para papéis por módulo, onde
o administrador vê tudo e os demais usuários só acessam as telas dos papéis que
têm no perfil (estoque, exames, …).

Este documento cobre os dois repositórios (LabFlow-Back e LabFlow-Front).

> **Status: fases 1 a 5 implementadas** (branch `feat/estoque`).
> A Fase 6 (limpeza do `isAdmin` legado) segue pendente de propósito — só faz
> sentido depois que o sistema estiver rodando com papéis em produção.
>
> Decisões tomadas na implementação:
> - Papéis: `ADMIN`, `EXAMS`, `EXAM_TEMPLATES`, `ANAMNESIS`, `STOCK`,
>   `PATIENTS`.
> - **Exames quebrados em dois papéis** (pedido no review do PR #10): `EXAMS`
>   apenas lança e consulta exames; `EXAM_TEMPLATES` edita/exclui exames já
>   lançados e faz o CRUD dos modelos. Assim existe um perfil que cadastra sem
>   poder editar os exames nem os modelos.
> - **Anamnese ganhou papel próprio** (`ANAMNESIS`), separada de `EXAMS`.
> - Dado pessoal de paciente: liberado ao papel **PATIENTS** (quem não tem
>   `PATIENTS` continua recebendo a versão anonimizada).
> - Papel `STOCK`: CRUD completo do estoque, não só consulta e movimentação.

---

## 1. Como a autorização funciona hoje

Entender isto é o que define o tamanho da mudança.

**Backend**

- `users.is_admin` (boolean) é a única dimensão de permissão.
- O JWT carrega `{ sub, isAdmin }` e expira em **15 minutos**
  (`auth.service.ts` → `signToken`).
- Três guards globais, nesta ordem (`app.module.ts`): `ThrottlerGuard` →
  `JwtGuard` → `AdminGuard`.
- `AdminGuard` **falha fechado**: sem decorator nenhum, a rota é admin-only.
  Dois decorators abrem exceção: `@Public()` (sem autenticação) e
  `@AllowCommonUser()` (qualquer autenticado). Hoje há **14 rotas** com
  `@AllowCommonUser()`, em 7 controllers.
- Além do guard, alguns controllers ramificam a *resposta* por perfil:
  `patient.controller.ts` devolve o paciente anonimizado para não-admin (LGPD),
  `exam.controller.ts` e `user.controller.ts` fazem o mesmo tipo de recorte.

**Frontend**

- `session.user.admin` é lido em **24 arquivos**.
- `Sidebar.tsx` filtra o menu por `adminOnly: boolean`.
- `RequireAdmin.tsx` bloqueia a tela inteira; várias páginas repetem essa
  checagem inline com um `EmptyState` de "Acesso restrito".
- Não existe `middleware.ts`: o gate é todo client-side, com a API como
  autoridade real.

**Detalhe que já existe e vale reaproveitar:** `types/domain/usuario.ts` declara
um campo `perfil?: string` que **nunca é lido** em lugar nenhum. É resíduo — ou
vira o campo de papéis, ou some.

---

## 2. Decisão de modelagem

### Opção escolhida: papéis fixos em enum + tabela N:N

```
users ──< user_roles >── (enum Role)
```

`user_roles(user_id, role)` com PK composta. Um usuário tem 0..N papéis.

**Por que não as alternativas:**

| Alternativa | Por que não |
|---|---|
| Coluna única `users.role` | Não cobre "trabalha no estoque **e** lança exames", que é o caso real de um laboratório pequeno. Migrar depois de 1:1 para N:N custa mais do que já nascer N:N. |
| RBAC completo (`roles` + `permissions` + `role_permissions` em tabelas) | Permissões viram dado editável em tela, o que exige CRUD de papéis, tela de matriz de permissões e cuidado com estados inválidos. Para ~7 módulos e um time pequeno, é máquina demais para o problema. |
| Array `text[]` em `users.roles` | Funciona no Postgres, mas perde FK/integridade, complica índice e não deixa auditar concessão/revogação linha a linha. |

O enum vive no código (`src/common/enums/role.enum.ts`), não no banco — a coluna
é `varchar(32)` com CHECK opcional. Adicionar um papel novo passa a ser um
deploy, não uma migration: é o trade-off certo aqui, porque cada papel novo
exige código de guard e tela de qualquer forma.

### Papéis iniciais

| Papel | Dá acesso a |
|---|---|
| `ADMIN` | Tudo. Superusuário: passa em qualquer checagem de papel. |
| `EXAMS` | Lançar e consultar exames de paciente (sem editar/excluir, sem modelos) |
| `EXAM_TEMPLATES` | Editar/excluir exames já lançados + CRUD dos modelos de exame |
| `ANAMNESIS` | Anamneses (CRUD) |
| `STOCK` | Estoque (CRUD completo dos itens) |
| `PATIENTS` | Cadastro de pacientes |

Telas que **permanecem exclusivas do ADMIN** (não ganham papel próprio):
Usuários, Histórico/auditoria e Configurações. São a administração do sistema —
dar isso a um papel delegável abre caminho para escalonamento de privilégio (quem
edita usuários se promove a admin).

### Regra central: papel = módulo inteiro

Dentro de um módulo, quem tem o papel faz tudo. **Não** criar `stock.read` /
`stock.write`. Permissão fina multiplica os casos de teste por 2 a cada verbo e
não corresponde a nenhuma necessidade concreta hoje.

> **Exceção nos exames** (review do PR #10): aqui a necessidade concreta
> apareceu — o laboratório quer um operador que *lance* exames sem poder
> *editar* o que já foi registrado nem mexer nos modelos. Por isso o módulo de
> exames tem dois papéis: `EXAMS` (create + read) e `EXAM_TEMPLATES`
> (edit/delete de exames + CRUD de modelos). É a única quebra da regra
> "papel = módulo inteiro", e existe porque há um caso de uso real por trás
> dela, não por simetria.

Duas exceções que continuam amarradas ao `ADMIN`, independentemente de papel:

1. **Dados pessoais de paciente** (nome, CPF, e-mail, telefone, nascimento,
   medicação, patologia). Hoje é restrição de LGPD implementada no
   `patient.service.ts`, e não deve virar consequência automática do papel
   `EXAMS`. → **Decisão sua:** ou o papel `PATIENTS` passa a ver o dado
   completo, ou a anonimização continua valendo para todo mundo que não é admin.
2. **Aprovação de contas** (`isActive`) e promoção de usuários.

---

## 3. Impacto por fase

Cada fase é deployável sozinha e não quebra a anterior.

### Fase 1 — Modelo de dados (backend)

**Migration** `AddUserRoles`:

```sql
CREATE TABLE user_roles (
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role    varchar(32) NOT NULL,
  granted_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT pk_user_roles PRIMARY KEY (user_id, role)
);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);

-- Backfill: ninguém pode perder acesso no deploy.
INSERT INTO user_roles (user_id, role)
SELECT id, 'ADMIN' FROM users WHERE is_admin = true;

-- Todo usuário comum de hoje já lança exames e vê pacientes.
INSERT INTO user_roles (user_id, role)
SELECT id, 'EXAMS' FROM users WHERE is_admin = false;
INSERT INTO user_roles (user_id, role)
SELECT id, 'PATIENTS' FROM users WHERE is_admin = false;
```

O backfill é a parte crítica: sem ele, todo usuário comum acorda sem acesso a
nada no dia do deploy.

`is_admin` **não é removido nesta fase** — vira coluna derivada
(`ADMIN ∈ roles`), mantida em sincronia pelo `UserService`. A remoção fica para
a Fase 6, depois que tudo estiver rodando com papéis.

Entidade:

```ts
// src/entities/user-role.entity.ts
@Entity({ name: 'user_roles' })
export class UserRole {
  @PrimaryColumn({ name: 'user_id' }) userId!: number;
  @PrimaryColumn({ type: 'varchar', length: 32 }) role!: Role;
  @ManyToOne(() => User, (u) => u.roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' }) user!: User;
}
```

### Fase 2 — Token e guard (backend)

**Payload do JWT** passa a levar os papéis:

```ts
// signToken
{ sub: id, isAdmin, roles: ['STOCK', 'EXAMS'] }
```

`isAdmin` continua no payload durante a transição, para que tokens emitidos
antes do deploy não virem 403. Como o token expira em 15 min, a janela de
convivência é curta — pode cair já na Fase 6.

**`RolesGuard` substitui o `AdminGuard`**, preservando o padrão fail-closed:

```ts
// Sem decorator = ADMIN only (comportamento atual, inalterado)
@Roles(Role.STOCK)     // ADMIN + quem tem STOCK
@Authenticated()       // qualquer autenticado (substitui @AllowCommonUser)
@Public()              // inalterado
```

```ts
canActivate(ctx) {
  if (isPublic) return true;
  const { user } = ctx.switchToHttp().getRequest();
  if (!user) throw new UnauthorizedException();   // falha fechado
  if (user.roles?.includes(Role.ADMIN)) return true;  // superusuário
  if (isAuthenticatedOnly) return true;
  const required = this.reflector.getAllAndOverride(ROLES_KEY, [...]);
  if (!required?.length) throw new ForbiddenException();  // default = admin
  if (!required.some((r) => user.roles?.includes(r))) throw new ForbiddenException();
  return true;
}
```

`some` e não `every`: os papéis são alternativas de acesso, não requisitos
acumulativos.

**Ponto que precisa ficar documentado:** o papel é lido do **token**, não do
banco. Revogar um papel só surte efeito no próximo login (≤ 15 min). Ler do
banco a cada request resolveria, ao custo de um SELECT por requisição. Para este
sistema, 15 minutos de defasagem é aceitável — mas é uma escolha, não um
acidente, e deve estar escrita no código.

### Fase 3 — Aplicar os papéis nas rotas (backend)

Trocar os 14 `@AllowCommonUser()` pelo papel correspondente e anotar as rotas
hoje admin-only que passam a ser delegáveis:

| Controller | Hoje | Depois |
|---|---|---|
| `stock` GET | `@AllowCommonUser` | `@Roles(STOCK)` |
| `stock` POST/PUT/DELETE | admin | `@Roles(STOCK)` |
| `stock` PATCH quantity | `@AllowCommonUser` | `@Roles(STOCK)` |
| `exam` GET/POST | `@AllowCommonUser` / admin | `@Roles(EXAMS, EXAM_TEMPLATES)` |
| `exam` PUT/DELETE | `@AllowCommonUser` / admin | `@Roles(EXAM_TEMPLATES)` |
| `exam-template` * | `@AllowCommonUser` / admin | `@Roles(EXAM_TEMPLATES)` |
| `anamnesis` * | admin | `@Roles(ANAMNESIS)` |
| `patient` GET | `@AllowCommonUser` | `@Roles(PATIENTS, EXAMS, EXAM_TEMPLATES, ANAMNESIS)` ¹ |
| `patient` POST/PUT/DELETE | admin | `@Roles(PATIENTS)` |
| `user`, `audit-log`, `settings` PUT | admin | inalterado (admin) |
| `settings` GET | `@AllowCommonUser` | `@Authenticated()` ² |

¹ Quem lança/edita exame ou faz anamnese precisa listar pacientes para escolher
um — sempre na versão anonimizada, exceto quem tem `PATIENTS`.
² Logo e rodapé do laudo: qualquer usuário logado precisa para imprimir.

**Mudança de comportamento a confirmar:** hoje qualquer autenticado *vê* o
estoque; depois, só quem tem o papel `STOCK`. É o que você pediu, mas é uma
restrição a mais em relação ao que está no ar.

### Fase 4 — Gestão de papéis (backend + tela de usuários)

- `CreateUserDto` / `UpdateUserDto` ganham `roles: Role[]` (validado com
  `@IsEnum(Role, { each: true })`).
- `UserService.create/update` gravam `user_roles` numa transação junto com o
  usuário, e mantêm `is_admin = roles.includes(ADMIN)`.
- `PUBLIC_FIELDS` passa a devolver os papéis (`relations: ['roles']`).
- **`assertNotLastAdmin` precisa mudar**: hoje conta
  `is_admin = true AND is_active = true`. Passa a contar quem tem o papel
  `ADMIN` e está ativo. Se ficar contando a coluna antiga, a trava que impede
  remover o último administrador silenciosamente deixa de valer.
- **Auditar concessão e revogação de papel.** `AuditEntity` não tem `USER`
  hoje — vale adicionar, porque mudança de permissão é exatamente o tipo de
  evento que se quer rastrear depois.
- Tela de usuários: o `AdminToggle` vira um grupo de checkboxes de papéis.

### Fase 5 — Frontend

| Arquivo | Mudança |
|---|---|
| `types/domain/usuario.ts` | `roles: Role[]` no `Usuario` (aproveitando ou removendo o `perfil?: string` morto) |
| `providers/AuthProvider.tsx` | expor `has(role)` e `isAdmin` derivados da sessão |
| `components/feedback/RequireAdmin.tsx` | vira `RequireRole role={Role.STOCK}`, mantendo `RequireAdmin` como atalho |
| `components/layout/Sidebar.tsx` | `adminOnly: boolean` → `roles: Role[]`; item aparece se `has(algum)` |
| `constants/routes.ts` | mapa `rota → papel exigido`, fonte única para menu e guards |
| 24 arquivos com `session.user.admin` | os que checam **acesso à tela** viram `has(role)`; os que checam **poder administrativo** (ver CPF, aprovar conta) continuam em `isAdmin` |

A distinção da última linha é o ponto delicado da fase: hoje `isAdmin` responde
duas perguntas diferentes ("posso entrar aqui?" e "posso ver/editar isto?") e
elas se separam agora. Trocar tudo por `has(role)` sem ler caso a caso é o jeito
mais fácil de vazar dado pessoal de paciente para um papel que não deveria vê-lo.

**Dashboard com usuário sem papel nenhum:** hoje impossível, depois sim. A tela
precisa de um estado vazio explicando que o acesso ainda não foi liberado — sem
isso o usuário cai numa página em branco sem saber por quê.

### Fase 6 — Limpeza

Só depois de tudo em produção e estável:

- Remover `isAdmin` do payload do JWT.
- Remover o decorator `@AllowCommonUser` e o `AdminGuard`.
- Avaliar dropar `users.is_admin` (ou mantê-la como coluna derivada — é útil
  para consultas rápidas e para o índice de "existe admin ativo?").

---

## 4. Riscos e como cobrir

| Risco | Mitigação |
|---|---|
| Backfill errado deixa todo mundo sem acesso | Rodar em staging com cópia dos dados; conferir `SELECT role, count(*) FROM user_roles GROUP BY role` antes de liberar |
| Front novo com back antigo (ou vice-versa) | Mergear e subir o **backend primeiro**; o front antigo continua funcionando porque `isAdmin` segue no payload até a Fase 6 |
| Escalonamento de privilégio | Nenhum papel não-ADMIN pode tocar `/user`; validar no DTO que um não-admin jamais consegue enviar `roles: ['ADMIN']` |
| Sistema sem administrador | `assertNotLastAdmin` atualizado para papéis (Fase 4) |
| Papel revogado continua valendo até 15 min | Documentado no guard; se virar inaceitável, trocar por leitura no banco a cada request |
| Regressão silenciosa de permissão | Testes e2e por papel — ver abaixo |

**Testes mínimos, um por papel:** para cada papel, uma bateria que percorre as
rotas dos *outros* módulos e espera 403. É o que pega o `@Roles` esquecido numa
rota — o tipo de erro que não aparece em nenhum teste de caminho feliz.

O smoke test do módulo de estoque (PR do backend) serve de modelo: token mintado
para um usuário existente, curl em cada rota, conferindo o status esperado.

---

## 5. Ordem sugerida

```
Fase 1 (migration + backfill)   ─┐
Fase 2 (token + RolesGuard)      ├── PR 1 no back: nada muda no comportamento
Fase 3 (@Roles nas rotas)       ─┘    (papéis do backfill = permissões de hoje)

Fase 4 (CRUD de papéis)          ─── PR 2 no back
Fase 5 (front)                   ─── PR 3 no front
Fase 6 (limpeza)                 ─── PR 4, depois de estável
```

O PR 1 é grande mas de risco baixo: ao final dele, todo usuário tem exatamente as
mesmas permissões de antes, agora expressas em papéis. A mudança de
comportamento visível só chega no PR 2, quando é possível conceder e revogar.

---

## 6. Decisões pendentes

Antes de começar, três respostas suas:

1. ~~**Lista final de papéis** — `EXAMS`, `STOCK`, `PATIENTS` cobrem o
   laboratório, ou anamnese/modelos merecem papel próprio?~~ **Resolvido no
   review do PR #10:** anamnese e modelos merecem papel próprio. Papéis finais:
   `ADMIN`, `EXAMS`, `EXAM_TEMPLATES`, `ANAMNESIS`, `STOCK`, `PATIENTS`.
2. **Dado pessoal de paciente** — continua restrito ao `ADMIN`, ou o papel
   `PATIENTS` passa a ver o cadastro completo?
3. **Estoque** — quem tem o papel `STOCK` pode cadastrar e excluir itens, ou
   cadastro segue admin-only e o papel dá só consulta e movimentação?
