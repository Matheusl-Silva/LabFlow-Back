# Documentação do LabFlow (backend)

Para instalar, subir e entender a API, comece pelo [README da raiz](../README.md).
Esta pasta é o nível seguinte: o *porquê* das decisões, não o *como rodar*.

Duas naturezas de documento vivem aqui, e a diferença importa na hora de
confiar no que está escrito:

- **Diagramas** (`diagramas/`) — descrevem o sistema **como ele é hoje**,
  derivados do código. Se divergirem do código, o código manda e a divergência
  é bug.
- **Propostas e guias** (raiz) — descrevem uma mudança: o antes, o depois e o
  porquê. Cada um declara o próprio status no topo. Depois de implementados,
  continuam valendo como registro da decisão, não como descrição do presente.

---

## Diagramas

| Documento | Cobre | Status |
| --- | --- | --- |
| [diagramas/banco-de-dados.md](diagramas/banco-de-dados.md) | **A modelagem do banco**: modelo conceitual, modelo lógico completo das 11 tabelas, cardinalidades, soft delete, índices, linhagem das migrations e as 4 relações que só existem na aplicação | ✅ Atual |
| [diagramas/uml-classes.md](diagramas/uml-classes.md) | **Diagrama de classes UML** da camada de entidades: tipos TypeScript, propriedades de navegação, os 8 enums e a diferença entre composição e associação | ✅ Atual |
| [diagramas/autenticacao-e-autorizacao.md](diagramas/autenticacao-e-autorizacao.md) | **Quem passa e por quê**: a cadeia dos três guards, a decisão *fail-closed* do `RolesGuard`, os dois cookies de sessão, a redefinição de senha e a janela de 15 minutos | ✅ Atual |
| [diagramas/contrato-front-back.md](diagramas/contrato-front-back.md) | **A fronteira com o front**: as 49 rotas com o papel que cada uma exige, o que está escrito nos dois repositórios e as duas janelas de desatualização do perfil | ✅ Atual |
| [diagramas/modulos-nestjs.md](diagramas/modulos-nestjs.md) | **A montagem da aplicação**: quem importa quem, quais tabelas cada módulo alcança e o que não é auditado | ✅ Atual |
| [diagramas/ciclo-de-vida-de-um-exame.md](diagramas/ciclo-de-vida-de-um-exame.md) | **Do modelo ao laudo**: as validações do lançamento, onde a auditoria é gravada e por que o modelo é versionado em vez de editado | ✅ Atual |

Todos os diagramas estão em `diagramas/img/` como **PNG** (embutido no
documento) e **SVG** (link, amplia sem borrar). A fonte Mermaid fica no próprio
`.md`, num bloco recolhido — é ela que vale; a imagem é derivada.

Os quatro diagramas que estavam planejados foram escritos. O que falta agora
não é diagrama: é manter estes seis em dia com o código, e cada um declara no
topo o que espelha.

## Propostas e guias

| Documento | Assunto | Status |
| --- | --- | --- |
| [ROLES_E_PERMISSOES.md](ROLES_E_PERMISSOES.md) | Papéis de acesso por módulo, substituindo o binário admin/comum | Fases 1–5 implementadas; Fase 6 (limpeza do `isAdmin` legado) pendente de propósito |
| [AUDIT_LOG_BACKEND.md](AUDIT_LOG_BACKEND.md) | Trilha de auditoria: tabela, service, rota admin | Implementado |
| [DASHBOARD_ANALITICO.md](DASHBOARD_ANALITICO.md) | Dashboard com recorte de período, sem baixar tabela inteira no navegador | Proposta — decisões em aberto na seção 9 |

---

## Convenções destes documentos

- **Português**, incluindo os títulos. O código é em inglês; a documentação
  não precisa ser.
- **Diagramas em Mermaid**, dentro do próprio `.md` — é a fonte, e é ela que
  vale numa divergência. O PNG e o SVG em `diagramas/img/` são derivados dela e
  só existem porque um diagrama de 11 tabelas é ilegível como texto no GitHub.
  Editou a fonte? Regere a imagem, ou as duas divergem em silêncio (o
  procedimento está no fim de [uml-classes.md](diagramas/uml-classes.md)).
- **Explicar o porquê, não só o quê.** O schema e as rotas já estão no código;
  o que não está é a razão de terem essa forma.
- **Declarar o que está em aberto.** Uma pergunta sem resposta marcada como tal
  vale mais que um chute que parece decisão tomada.
