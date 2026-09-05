# LabFlow — Backend

API do LabFlow, sistema de gestão de laboratório de análises clínicas:
cadastro de pacientes, anamnese, lançamento de exames a partir de modelos
configuráveis, emissão de laudo, controle de estoque e trilha de auditoria.

NestJS 11 · TypeORM 0.3 · PostgreSQL · Node 22

O front que consome esta API vive em
[LabFlow-Front](https://github.com/Matheusl-Silva/LabFlow-Front).

---

## Subir o projeto

Precisa de **Docker** e, para desenvolver, **Node 22**.

### 1. Configure o `.env`

```bash
cp .env.example .env
```

O `.env.example` explica cada variável. As três que travam a subida se ficarem
vazias:

| Variável | O que é | Exemplo |
| --- | --- | --- |
| `MAIN_DB_USER` / `MAIN_DB_PASSWORD` / `MAIN_DB` | Credenciais do Postgres — o container é criado com elas na primeira subida | `labflow` / `labflow` / `labflow` |
| `MAIN_DB_PORT` | Porta do banco **no host**. Se você já tem um Postgres nativo na 5432, use outra ou a subida falha com "port is already allocated" | `5433` |
| `JWT_SECRET` | Chave de assinatura dos tokens. Qualquer string longa serve em desenvolvimento | — |

`MAIN_DB_URL` só é lida quando a API roda **fora** do container (o Compose a
sobrescreve apontando para o serviço `db`). Para o modo de desenvolvimento
abaixo, aponte para o host, com a porta que você escolheu:

```
MAIN_DB_URL=postgresql://labflow:labflow@localhost:5433/labflow
```

### 2. Escolha o modo

**Desenvolvimento — banco no Docker, API na sua máquina** (é o que dá reload
automático):

```bash
docker compose up -d db
npm install
npm run migration:run
npm run dev
```

**Tudo em container:**

```bash
docker compose up --build
```

Atenção: o `docker-compose.yaml` da raiz **também compila o front**, a partir de
`../LabFlow-Front`. Sem o repositório do front ao lado, o build quebra — para
subir só o backend, use `docker compose up --build db back`.

A API sobe em `http://localhost:3000` (ou a `PORT` do `.env`).

### 3. Crie o primeiro usuário

O sistema nasce sem nenhum usuário, e **o primeiro cadastro vira administrador
já ativo** — é o bootstrap: sem isso ninguém teria permissão para aprovar
ninguém.

```bash
curl -X POST http://localhost:3000/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"name":"Admin","email":"admin@exemplo.com","pass":"Password123"}'
```

Do segundo em diante, a conta nasce **pendente**: o login devolve `403` até um
administrador ativá-la. Se você criou uma conta e não consegue entrar, é isso —
não é senha errada.

---

## Documentação da API

Swagger em **<http://localhost:3000/api/docs>**, montado apenas fora de
produção — em produção ele revelaria a superfície inteira da API.

Cobre **as 48 rotas da API**, com descrição, respostas e os papéis exigidos. As
anotações ficam em arquivos `*.swagger.ts` separados do controller, para não
afogar o código em decorators.

A 49ª rota é `GET /`, o `Hello World!` do esqueleto do Nest: fica fora da
documentação de propósito, porque listá-la sugeriria que existe por algum
motivo.

---

## Autorização: a regra é negar

Três guards globais, nesta ordem: `ThrottlerGuard` (100 req/min por IP) →
`JwtGuard` → `RolesGuard`.

O `RolesGuard` é **fail-closed**: uma rota sem decorator nenhum é exclusiva de
administrador. Esquecer o decorator fecha a porta, não abre — o erro possível é
uma rota que ninguém alcança, nunca uma rota exposta por descuido.

| Decorator | Quem passa | Rotas |
| --- | --- | --- |
| `@Public()` | Qualquer um, sem autenticação | 6 — todo o `/auth` |
| `@Authenticated()` | Qualquer usuário logado | 4 — leitura de perfil e de configurações |
| `@Roles(A, B)` | Quem tem o papel A **ou** o B | 30 — exames, modelos, pacientes, anamnese, estoque |
| *(nenhum)* | Só `ADMIN` | 9 — auditoria, gestão de usuários, logo e rodapé |

Papéis disponíveis: `ADMIN`, `EXAMS`, `EXAM_TEMPLATES`, `ANAMNESIS`,
`PATIENTS`, `STOCK`. Quem tem `ADMIN` passa em tudo.

A sessão anda em **dois cookies `httpOnly`** — `labflow_access` (15 min) e
`labflow_refresh` (7 dias, rotacionado a cada uso, com detecção de reúso). O
token nunca vai no corpo da resposta, justamente para o JavaScript da página não
conseguir lê-lo. Senhas são guardadas com argon2; tokens, como SHA-256.

O caminho completo — do cookie ao guard, com os diagramas — está em
[docs/diagramas/autenticacao-e-autorizacao.md](docs/diagramas/autenticacao-e-autorizacao.md);
a regra de negócio de cada papel, em
[docs/ROLES_E_PERMISSOES.md](docs/ROLES_E_PERMISSOES.md).

---

## Banco de dados

`synchronize: false`. O schema **só** muda por migration — nunca por alteração
de entidade.

```bash
npm run migration:run                                  # aplica as pendentes
npm run migration:revert                               # desfaz a última
npm run migration:generate src/migrations/NomeDaMudanca  # gera a partir do diff das entidades
```

Sempre leia a migration gerada antes de commitar: o diff de entidades acerta a
estrutura, mas não sabe o que fazer com os dados que já existem.

O modelo completo — 11 tabelas, relacionamentos, índices e as decisões por trás
deles — está em
[docs/diagramas/banco-de-dados.md](docs/diagramas/banco-de-dados.md).

Os dois containers rodam em `America/Sao_Paulo` (o Node pelo `TZ`, o Postgres
pelo `-c timezone`), porque as colunas de data são `timestamp without time
zone`. Mudar isso desloca todas as datas já gravadas.

---

## Testes

```bash
npm test          # unitários
npm run test:e2e  # end-to-end
npm run lint      # eslint com --fix
```

A rede de segurança de verdade hoje é o **smoke test do CI**
(`.github/workflows/ci.yml`): sobe a aplicação, roda as migrations e exercita o
fluxo de sessão inteiro por cookie — signup, login, rota protegida, refresh,
logout. Os testes unitários existem, mas o CI ainda não os executa.

---

## Estrutura

```
src/
  entities/      Entidades TypeORM — o schema como o código o enxerga
  migrations/    Histórico do schema; a fonte da verdade do banco
  common/        Guards, decorators, enums e validadores compartilhados
  providers/     Conexão com o banco e DataSource do CLI do TypeORM
  auth/          Sessão, refresh token, redefinição de senha
  <módulo>/      Um por área: patient, exam, exam-template, anamnesis,
                 stock, settings, audit, user, mail
docs/            Diagramas e propostas — comece pelo docs/README.md
deploy/          Produção: compose, script de atualização e systemd
```

Cada módulo segue o padrão do Nest: `*.module.ts`, `*.controller.ts`,
`*.service.ts`, `dto/` e, quando há documentação de API, `*.swagger.ts`.

---

## Publicação

`main` verde gera release (semantic-release, a partir das mensagens de commit) e
publica a imagem em [`matheus05/labflow-back`](https://hub.docker.com/r/matheus05/labflow-back).
O servidor de produção busca a última release toda madrugada, com dump do banco
antes e rollback automático.

O procedimento inteiro, com as coordenadas reais do servidor, está em
[deploy/README.md](deploy/README.md).
