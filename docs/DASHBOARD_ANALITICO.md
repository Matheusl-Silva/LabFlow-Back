# Dashboard analítico — exames e pacientes por período

Objetivo: transformar o dashboard de uma **lista de atalhos com totais gerais**
em uma tela que responde perguntas com recorte de tempo — quantos exames foram
feitos em março, quantos pacientes novos entraram no semestre, qual modelo de
exame é o mais usado.

Este documento cobre os dois repositórios (LabFlow-Back e LabFlow-Front).

> **Status: proposta.** Nada disto está implementado. As decisões marcadas com
> ❓ na seção 9 precisam de resposta antes de começar — algumas mudam o
> resultado o bastante para não valer chutar.

---

## 1. Como o dashboard funciona hoje (e por que não escala)

Entender isto é o que define o tamanho da mudança — o problema não é a tela, é
de onde os números vêm.

Cada card do dashboard baixa uma **tabela inteira** e conta no navegador:

| Card | Origem do número |
| --- | --- |
| Pacientes | `GET /patient` → `pacientes?.length` |
| Exames | `GET /exam` → `data.length` (front: `exam.http.ts` → `countAll`) |
| Estoque | `GET /stock` → `estoque.filter(precisaRepor).length` |
| Usuários | `GET /user` → `usuarios.filter(u => !u.ativo).length` |

Três consequências, em ordem de gravidade:

1. **Dado pessoal viaja para exibir um número.** Contar pacientes hoje significa
   transferir CPF, telefone, e-mail e data de nascimento de todos eles para o
   navegador. O `GET /exam` é pior: carrega o `data` (jsonb) de cada exame, ou
   seja, o resultado clínico completo — para tirar um `.length`.
2. **O custo cresce com o banco.** Com 200 exames ninguém percebe; com 20 mil, o
   dashboard vira a tela mais lenta do sistema, e a lentidão aparece no login,
   que é quando ela mais irrita.
3. **Não existe recorte de período.** Os números são "desde sempre". A pergunta
   que originou este documento — *quantos exames em determinado período* — não
   tem como ser respondida sem baixar tudo e filtrar no cliente.

Existe ainda uma inconsistência menor a corrigir de passagem: o hook
`useExamsCountQuery` está gateado por `isAdmin` e o comentário diz que
`GET /exam` é admin-only, mas o backend exige `EXAMS` **ou** `EXAM_TEMPLATES`
(`exam.controller.ts`, `@Roles` da classe). O comentário é
anterior à migração de papéis: hoje quem tem `EXAMS` não vê o total, embora a
API deixasse.

**A mudança central deste documento é uma só:** agregação é trabalho de banco,
não de navegador. `count(*)` e `GROUP BY` no Postgres, JSON pequeno na resposta.

---

## 2. O que os dados já permitem responder

Nada aqui exige mudança de schema — é tudo coluna que já existe.

| Tabela | Colunas úteis | Perguntas que respondem |
| --- | --- | --- |
| `exams` | `date`, `created_at`, `exam_template_id`, `patient_id`, `preceptor_id`, `responsible_id`, `deleted_at` | Exames por dia/mês, por modelo, por responsável, por preceptor, pacientes distintos atendidos |
| `patients` | `created_at`, `period`, `birth_date`, `pathology`, `deleted_at` | Pacientes novos no período, distribuição Matutino/Noturno, faixa etária |
| `anamnesis` | `created_at`, `patient_id`, `deleted_at` | Anamneses no período |
| `exam_templates` | `name`, `version`, `is_active` | Nome do modelo nas quebras; quais modelos estão em uso de fato |
| `stock_items` | quantidade, mínimo | Itens abaixo do mínimo (já existe na tela) |
| `audit_logs` | `action`, `entity`, `user_id`, `created_at` | Volume de edições/exclusões por período |

O que **não** dá para responder com o schema atual: qualquer coisa que dependa
de *status* de exame (pendente, em análise, concluído). Não existe essa coluna —
um exame só existe depois de lançado. Um funil de atendimento exigiria mudança
de modelo, e isso está fora deste documento.

---

## 3. A decisão central: qual data conta como "quando o exame foi feito"

`exams` tem **duas** datas, e a escolha muda os números:

- **`date`** — informada por quem lança. É quando o exame aconteceu.
- **`created_at`** — automática. É quando o exame foi digitado no sistema.

Elas divergem sempre que alguém lança hoje um exame de ontem — o que, num
laboratório, é rotina.

**Recomendação: `date`.** A pergunta "quantos exames em março" é clínica, não
operacional; um exame de 31/03 lançado em 02/04 pertence a março. Vale saber que
isso torna os números do passado **móveis**: lançar hoje um exame antigo muda o
total de um mês já fechado. Se em algum momento vocês quiserem medir *produção
do laboratório* — quanto foi digitado por semana —, aí a data certa é
`created_at`, e o melhor é oferecer as duas como opção explícita na tela, em vez
de trocar o significado do gráfico em silêncio.

Dois detalhes que costumam morder:

- **Soft delete.** Toda consulta precisa de `deleted_at IS NULL`. Sem isso, o
  dashboard conta exames excluídos e diverge da lista que a tela mostra. Efeito
  colateral aceito: excluir um exame antigo altera um total já reportado.
- **Fuso.** O Postgres do LabFlow roda com `timezone=America/Sao_Paulo` e as
  colunas são `timestamp without time zone`, então `date_trunc('day', date)` já
  agrupa em horário de Brasília. Não converter nada por conta própria — a
  configuração do container é o que garante isso.

---

## 4. Desenho da API

**Um endpoint só**, e não um por card:

```
GET /dashboard?de=2026-03-01&ate=2026-03-31&base=date
```

A tela é uma; N endpoints significam N idas ao servidor para desenhar uma
página, cada uma com seu próprio estado de carregamento piscando na interface.

| Parâmetro | Regra |
| --- | --- |
| `de`, `ate` | `YYYY-MM-DD`, inclusivos. Padrão: últimos 30 dias |
| `base` | `date` (padrão) ou `created_at`. Ver seção 3 |

Validar `de <= ate` e limitar a janela (sugestão: 1 ano). Sem teto, um `de=1900`
faz o banco varrer tudo e devolver 40 mil pontos para o navegador desenhar.

Resposta:

```jsonc
{
  "periodo": { "de": "2026-03-01", "ate": "2026-03-31", "base": "date" },
  "exames": {
    "total": 128,
    "pacientesDistintos": 74,
    "porDia": [{ "dia": "2026-03-01", "total": 6 }, /* … um item por dia */],
    "porModelo": [{ "modelo": "Hemograma", "total": 61 }],
    "porResponsavel": [{ "usuario": "Ana", "total": 39 }]
  },
  "pacientes": {
    "novos": 22,
    "totalAtivos": 340,
    "porPeriodo": { "Matutino": 210, "Noturno": 130 }
  },
  "anamneses": { "total": 41 },
  "estoque": { "itensAbaixoDoMinimo": 3 }
}
```

Cada bloco de primeiro nível é **opcional**: some quando o usuário não tem o
papel correspondente (seção 6). O front renderiza o que veio, em vez de decidir
sozinho o que pedir — que é o contorno que o dashboard atual precisou fazer para
não encher o console de 403.

---

## 5. Consultas e índices

Série diária de exames:

```sql
SELECT date_trunc('day', e.date)::date AS dia, count(*) AS total
FROM exams e
WHERE e.deleted_at IS NULL
  AND e.date >= $1
  AND e.date < ($2::date + 1)   -- fim inclusivo sem depender da hora gravada
GROUP BY 1
ORDER BY 1;
```

**Preencher os dias vazios é obrigatório.** Um `GROUP BY` só devolve os dias com
exame; um gráfico de linha alimentado com os buracos ligaria 05/03 direto em
08/03 e esconderia dois dias zerados — o gráfico mentiria por omissão. Ou se
resolve no SQL com `generate_series`, ou no serviço ao montar o array. O SQL é
preferível: mantém a regra num lugar só.

Quebra por modelo (`porModelo`):

```sql
SELECT t.name AS modelo, count(*) AS total
FROM exams e
JOIN exam_templates t ON t.id = e.exam_template_id
WHERE e.deleted_at IS NULL AND e.date >= $1 AND e.date < ($2::date + 1)
GROUP BY t.name          -- por NOME, não por id: agrupa as versões do modelo
ORDER BY total DESC;
```

Agrupar por `t.name` e não por `t.id` é deliberado: criar uma versão nova de
modelo gera uma linha nova em `exam_templates`, e agrupar por id partiria
"Hemograma" em dois no relatório.

Índices necessários (migration própria):

```sql
CREATE INDEX idx_exams_date_ativos     ON exams    (date)       WHERE deleted_at IS NULL;
CREATE INDEX idx_patients_created_ativos ON patients (created_at) WHERE deleted_at IS NULL;
```

Parciais porque **toda** consulta do dashboard já filtra o soft delete — não há
motivo de indexar linha excluída. Hoje não existe índice em `exams.date`, então
qualquer filtro por período é sequential scan.

Sobre cache: **não vale a pena agora.** Um `count` com índice sobre alguns
milhares de linhas responde em milissegundos, e view materializada traz consigo
a pergunta "quando atualizar". Se um dia o volume justificar, o caminho é
`MATERIALIZED VIEW` com refresh na janela noturna que o deploy já usa — mas isso
é otimização de um problema que ainda não existe.

---

## 6. Permissões

Seguir o que a tela já faz: **cada bloco aparece conforme o papel**, e o backend
é quem decide.

| Bloco | Papel |
| --- | --- |
| `exames` | `EXAMS` ou `EXAM_TEMPLATES` |
| `pacientes` | `PATIENTS` |
| `anamneses` | `ANAMNESIS` |
| `estoque` | `STOCK` |
| tudo | `ADMIN` |

O controller não pode usar `@Roles` da forma habitual, porque a rota é única e
serve a vários papéis — o guard só decide "entra ou não entra". O desenho é
`@Roles(...todos os papéis)` na rota e o **serviço** montando a resposta a partir
de `user.roles`, do mesmo jeito que `exam.controller.ts` já recorta a resposta
por perfil.

⚠️ **LGPD.** Contagem agregada por `pathology` ou faixa etária pode reidentificar
alguém quando o grupo é pequeno ("1 paciente com patologia X no Matutino" é um
dado pessoal disfarçado de estatística). Se essa quebra entrar, suprimir grupos
abaixo de um mínimo (5 é o corte usual) ou restringi-la ao `ADMIN`.

---

## 7. Tela

Reaproveitar o que existe — `PageHeader`, `Card`, `EmptyState`, e o padrão de
hooks `use*Query` do TanStack Query. O que muda é a origem: um
`useDashboardQuery(de, ate)` no lugar dos quatro hooks de lista.

Composição sugerida, de cima para baixo:

1. **Seletor de período** com atalhos (últimos 7 dias, 30 dias, este mês, mês
   passado) e intervalo personalizado. O padrão importa: é o número que a pessoa
   vê ao abrir o sistema.
2. **KPIs** — os cards de hoje, agora com o recorte aplicado e a comparação com
   o período anterior ("128 exames, +12% vs. fevereiro"). A comparação é o que
   transforma número em informação.
3. **Gráfico de exames por dia** — barras para períodos curtos, linha para
   longos.
4. **Quebras** — modelo mais usado, responsáveis, Matutino × Noturno. Tabela
   simples resolve; não precisa de pizza.

❓ **Não há biblioteca de gráfico no projeto** (as dependências do front são
Radix, TanStack Query, react-hook-form, zod, lucide). Duas saídas: adicionar
`recharts` (~100 kB, resolve tudo) ou desenhar barras com `div` e Tailwind (zero
dependência, suficiente para série diária, insuficiente se vocês quiserem
tooltip e eixos decentes). Para o escopo desta tela, barras em CSS já entregam
as fases 1 e 2.

---

## 8. Fases

Cada fase é entregável sozinha.

**Fase 1 — o número certo, barato**
Migration dos índices, `GET /dashboard` com `periodo` + `exames.total` +
`exames.porDia` + `pacientes.novos`, seletor de período e KPIs na tela. Já
substitui o `countAll()` que baixa a tabela inteira.

**Fase 2 — as quebras**
`porModelo`, `porResponsavel`, `porPeriodo` do paciente, gráfico diário.

**Fase 3 — comparação e exportação**
Período anterior nos KPIs, exportação CSV do que está na tela.

**Fase 4 — só se o volume pedir**
Materialização/cache das agregações. Não começar por aqui.

---

## 9. Decisões em aberto

Perguntas cuja resposta muda o que é construído:

1. ❓ **Quem usa esta tela?** Se for só a coordenação, `ADMIN` simplifica tudo e
   a seção 6 encolhe. Se cada operador vê a própria produção, entra o conceito
   de "meus exames" — que é outro recorte, e mais sensível.
2. ❓ **Medir pessoas está no escopo?** `porResponsavel` e `porPreceptor` são
   triviais de calcular e nada triviais de conviver — vira ranking de
   produtividade queiram vocês ou não. Melhor decidir antes de existir na tela.
3. ❓ **`date` ou `created_at` como padrão** (seção 3).
4. ❓ **Biblioteca de gráfico ou CSS** (seção 7).
5. ❓ **A quebra por patologia/faixa etária é necessária?** Se for, ela traz
   junto a regra de supressão da seção 6.

## 10. Fora de escopo

- Funil de status do exame — exige coluna que não existe.
- Relatório em PDF do dashboard (o laudo já tem sua própria geração).
- Métricas de estoque no tempo (consumo por mês): `audit_logs` registra as
  movimentações com a ação `ADJUST` e daria para reconstruir, mas é um trabalho
  próprio e merece documento próprio.
