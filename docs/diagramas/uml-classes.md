# Diagrama de classes (UML) — camada de entidades

As classes de `src/entities/` como o TypeScript as vê: tipos da linguagem,
propriedades de navegação e os enums que definem os valores possíveis.

**Não é o mesmo desenho que o [modelo do banco](banco-de-dados.md).** Ali estão
tabelas, colunas `snake_case` e tipos SQL; aqui estão classes, propriedades
`camelCase` e tipos TypeScript. Duas visões do mesmo domínio, em camadas
diferentes — e é justamente na diferença entre elas que moram os bugs
(`passwordHash` é a única coluna que não muda de nome entre as duas, por
acidente e não por escolha).

> **Estado:** espelha `src/entities/*.entity.ts`, `src/common/enums/role.enum.ts`
> e `src/audit/audit.types.ts` na data da última atualização deste arquivo.

---

## O diagrama

![Diagrama de classes UML das entidades do LabFlow](img/09-uml-classes.png)

<details>
<summary>Fonte Mermaid &middot; ampliar em <a href="img/09-uml-classes.svg">SVG</a></summary>

```mermaid
classDiagram
    direction TB

    class User {
        +number id
        +string name
        +string email
        +string passwordHash
        +boolean isAdmin
        +boolean isActive
        +Date createdAt
        +Date updatedAt
        +Date? deletedAt
        +UserRole[] roles
        +Exam[] examsAsPreceptor
        +Exam[] examsAsResponsible
    }

    class UserRole {
        +number userId
        +Role role
        +Date grantedAt
        +User user
    }

    class RefreshToken {
        +number id
        +number userId
        +string tokenHash
        +string familyId
        +Date expiresAt
        +Date? revokedAt
        +RefreshRevokeReason? revokedReason
        +Date createdAt
        +User user
    }

    class PasswordResetToken {
        +number id
        +number userId
        +string tokenHash
        +Date expiresAt
        +Date? usedAt
        +Date createdAt
        +User user
    }

    class Patient {
        +number id
        +string name
        +string email
        +Period period
        +Sex? sex
        +string medication
        +string pathology
        +Date birthDate
        +string phone
        +string cpf
        +Date createdAt
        +Date updatedAt
        +Date? deletedAt
        +Exam[] exams
        +Anamnesis[] anamneses
    }

    class ExamTemplate {
        +number id
        +string name
        +number version
        +object schema
        +string? material
        +string? method
        +boolean active
        +Date createdAt
        +Date updatedAt
        +Date deletedAt
        +Exam[] exams
    }

    class Exam {
        +number id
        +number examTemplateId
        +number patientId
        +number preceptorId
        +number responsibleId
        +object data
        +Date date
        +string? observation
        +string? internalObservation
        +Date createdAt
        +Date updatedAt
        +Date deletedAt
        +ExamTemplate examTemplate
        +Patient patient
        +User preceptor
        +User responsible
    }

    class Anamnesis {
        +number id
        +number patientId
        +string chiefComplaint
        +Date symptomsOnset
        +string frequency
        +string painLocation
        +boolean heartDisease
        +boolean hypertension
        +boolean diabetes
        +boolean cancer
        +boolean surgeries
        +string? otherDiseases
        +string? allergies
        +string? medication
        +number mealsPerDay
        +string urinaryElimination
        +string intestinalElimination
        +string? menstrualCycle
        +string sleepAndRest
        +number sleepHours
        +string? smokingFrequency
        +string? drugsFrequency
        +string? alcoholFrequency
        +string? exerciseFrequency
        +string? leisure
        +boolean basicSanitation
        +string? domesticAnimals
        +boolean healthCenter
        +string? familyDisease
        +string? familyDiseaseTreatment
        +Date date
        +Date? deletedAt
        +Patient patient
    }

    class StockItem {
        +number id
        +string name
        +StockItemType type
        +StockUnit unit
        +number quantity
        +number minQuantity
        +string? description
        +Date createdAt
        +Date updatedAt
        +Date? deletedAt
    }

    class AuditLog {
        +number id
        +AuditAction action
        +AuditEntity entity
        +number entityId
        +number userId
        +object? before
        +object? after
        +Date createdAt
    }

    class Settings {
        <<singleton>>
        +number id
        +string? logoBase64
        +string? logoMime
        +string? footerText
        +Date updatedAt
    }

    class Role {
        <<enumeration>>
        ADMIN
        EXAMS
        EXAM_TEMPLATES
        ANAMNESIS
        STOCK
        PATIENTS
    }

    class Period {
        <<enumeration>>
        MORNING
        NIGHT
    }

    class Sex {
        <<enumeration>>
        MALE
        FEMALE
    }

    class StockItemType {
        <<enumeration>>
        REAGENT
        CONSUMABLE
        GLASSWARE
        EQUIPMENT
        MEDICATION
        PPE
        OTHER
    }

    class StockUnit {
        <<enumeration>>
        UNIT
        BOX
        PACK
        BOTTLE
        ML
        L
        G
        KG
    }

    class AuditAction {
        <<enumeration>>
        CREATE
        UPDATE
        DELETE
        ADJUST
        PRINT
    }

    class AuditEntity {
        <<enumeration>>
        EXAM
        EXAM_TEMPLATE
        PATIENT
        ANAMNESIS
        STOCK_ITEM
        USER
    }

    class RefreshRevokeReason {
        <<type union>>
        ROTATED
        REUSED
        LOGOUT
        ACCOUNT_DISABLED
        PASSWORD_RESET
    }

    User "1" *-- "0..*" UserRole : roles
    User "1" *-- "0..*" RefreshToken : sessoes
    User "1" *-- "0..*" PasswordResetToken : pedidos de reset
    User "1" <-- "0..*" Exam : preceptor
    User "1" <-- "0..*" Exam : responsible
    Patient "1" <-- "0..*" Exam : patient
    Patient "1" <-- "0..*" Anamnesis : patient
    ExamTemplate "1" <-- "0..*" Exam : examTemplate
    AuditLog ..> User : userId, sem FK

    UserRole ..> Role
    Patient ..> Period
    Patient ..> Sex
    ExamTemplate ..> Exam : schema valida data
    StockItem ..> StockItemType
    StockItem ..> StockUnit
    AuditLog ..> AuditAction
    AuditLog ..> AuditEntity
    RefreshToken ..> RefreshRevokeReason
```

</details>

Versão para ampliar ou imprimir: **[PNG](img/09-uml-classes.png)** ·
**[SVG](img/09-uml-classes.svg)** (vetorial, amplia sem borrar).

---

## Como ler a notação

| Símbolo | Significado | Onde aparece aqui |
| --- | --- | --- |
| `◆──` losango cheio | **Composição** — a parte não sobrevive ao todo | `User` → `UserRole`, `RefreshToken`, `PasswordResetToken`: são os três `ON DELETE CASCADE` |
| `◄──` seta cheia | **Associação** — a parte tem vida própria | `Patient` ← `Exam`: o exame não é destruído com o paciente (`NO ACTION` + soft delete) |
| `┄►` seta tracejada | **Dependência** — usa, mas não contém | Classe → enum, e `AuditLog` → `User`, que é referência **sem chave estrangeira** |
| `1` / `0..*` | Multiplicidade | Um usuário tem zero ou mais papéis; um papel pertence a exatamente um usuário |
| `+` | Visibilidade pública | Todas — entidades TypeORM não têm campo privado |
| `Tipo?` | Aceita `null` | `Sex?`, `Date?`, `string?` |

A distinção entre losango e seta é a mesma decisão de `ON DELETE` documentada em
[banco-de-dados.md §3](banco-de-dados.md#3-cardinalidades-e-comportamento-na-exclusão) —
aqui ela aparece na forma da linha em vez de numa coluna de tabela.

---

## O que este diagrama mostra e o ER não mostrava

1. **Os oito conjuntos de valores viram caixas.** `Role`, `Period`, `Sex`,
   `StockItemType`, `StockUnit`, `AuditAction`, `AuditEntity` e o *type union*
   `RefreshRevokeReason` são invisíveis num ER — lá viram `varchar` ou `enum`
   sem os valores. Aqui cada um é uma classe com seus membros.

2. **`Role` e `RefreshRevokeReason` não são iguais aos outros.** Os dois viram
   `varchar` no banco, não tipo enum do Postgres — o valor só é validado em
   TypeScript. `Period`, `Sex`, `StockItemType` e `StockUnit` têm tipo enum de
   verdade no Postgres. A caixa parece a mesma; a garantia não é.

3. **As propriedades de navegação são bidirecionais.** `User.examsAsPreceptor` e
   `User.examsAsResponsible` existem como arrays na classe, mesmo que no banco
   só existam as colunas `preceptor_id` e `responsible_id` do lado do exame.

4. **`AuditLog` não navega para nada.** É a única classe sem uma única
   propriedade de objeto: guarda `userId` e `entityId` como números crus. A
   seta tracejada para `User` é a relação que existe só na cabeça de quem lê o
   log ([§8.3](banco-de-dados.md#8-as-quatro-relações-que-o-banco-não-conhece)).

5. **`ExamTemplate ┄► Exam` é o contrato jsonb.** `ExamTemplate.schema` (um
   `object`) define quais chaves `Exam.data` (outro `object`) pode ter. O
   TypeScript tipa os dois como `object` e não verifica nada — quem verifica é
   `isValidExam()` em tempo de execução
   ([§8.1](banco-de-dados.md#8-as-quatro-relações-que-o-banco-não-conhece)).

---

## Regerar as imagens

**A fonte Mermaid é a verdade; o PNG e o SVG são derivados dela.** Editou o
diagrama? Regere a imagem, senão as duas divergem em silêncio.

Não há script no repositório para isso — seriam duas dependências pesadas
(`mermaid` + um Chromium headless) para uma tarefa que roda umas poucas vezes
por ano. Dois caminhos, ambos sem instalar nada permanente:

**Uma alteração pontual.** Cole o conteúdo do `<details>` em
<https://mermaid.live> e use *Actions → PNG/SVG*. Baixe por cima do arquivo
correspondente em `img/`.

**Regerar tudo.** Salve cada bloco Mermaid num `.mmd` e rode o mermaid-cli:

```bash
npx -y @mermaid-js/mermaid-cli -i 09-uml-classes.mmd -o docs/diagramas/img/09-uml-classes.png -s 2 -b white
```

`-s 2` gera em 2× (é o que dá texto nítido ao ampliar) e `-b white` força fundo
branco — sem isso o PNG sai transparente e some em qualquer visualizador de
tema escuro. Troque a extensão de saída para `.svg` para gerar o vetorial.

Os arquivos atuais em `img/` foram gerados com mermaid 11.17.2, em 2× (o
`02-modelo-logico-completo` em 1,76×, limitado pelo teto de 8000 px por lado),
fundo branco, com `htmlLabels: false` — essa última opção faz o Mermaid emitir
`<text>` em vez de `<foreignObject>`, e é o que garante que o texto realmente
apareça no PNG em vez de sair só as caixas vazias.
