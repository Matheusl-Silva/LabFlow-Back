# Deploy automático

Atualização agendada do LabFlow em produção. No horário marcado o servidor
consulta a última release publicada no GitHub, baixa as imagens correspondentes
do Docker Hub e recria os containers — com backup do banco antes e rollback
automático se a versão nova não subir.

Se não houver release nova, o script sai sem tocar em nada. Pode rodar todo dia.

| Arquivo | Papel |
| --- | --- |
| `docker-compose.prod.yaml` | Stack de produção usando as imagens do Docker Hub (não compila nada no servidor) |
| `atualizar.sh` | Verifica release nova, faz backup, atualiza e faz rollback se preciso |
| `.env` | Credenciais + versões em produção (não versionado; crie no servidor) |

O `docker-compose.yaml` da raiz continua servindo para desenvolvimento, onde
compilar do código-fonte é o que você quer.

## Instalação

### 1. Copiar para o servidor

```bash
scp -r deploy/ usuario@servidor:/opt/labflow/
```

### 2. Conferir o nome da stack atual

Este é o passo que mais dá problema. Se o nome do projeto no compose não bater
com o da stack que já roda, o Docker cria uma stack **nova**, com um volume de
Postgres **vazio**, e o banco atual fica órfão.

```bash
docker compose ls && docker volume ls | grep postgres
```

O `docker-compose.prod.yaml` está com `name: labflow-back`, o que resolve o
volume para `labflow-back_postgres_data`. Se o que aparecer aí for diferente,
ajuste o `name:` no topo do arquivo para casar.

### 3. Criar o `.env`

Ao lado do `docker-compose.prod.yaml`, em `/opt/labflow/deploy/.env`:

```bash
# Versões em produção. O atualizar.sh reescreve estas duas linhas a cada deploy;
# preencha com o que está no ar hoje.
VERSAO_FRONT=1.1.0
VERSAO_BACK=1.1.0

MAIN_DB_USER=labflow
MAIN_DB_PASSWORD=<a senha que já está em uso>
MAIN_DB=labflow
MAIN_DB_PORT=5432

PORT=3000
JWT_SECRET=<o segredo que já está em uso>
FRONT_URL=https://labflow.net.br

# Opcionais — portas no host. Sem elas, 3001 e 3000.
# PORTA_FRONT=3001
# PORTA_BACK=3000
```

As credenciais de banco precisam ser **exatamente** as atuais — o volume já
existe e o Postgres não recria o usuário depois da primeira inicialização.

```bash
chmod 600 /opt/labflow/deploy/.env
chmod +x /opt/labflow/deploy/atualizar.sh
```

### 4. Primeira subida

```bash
cd /opt/labflow/deploy && docker compose -f docker-compose.prod.yaml up -d
```

Confirme que os três serviços ficaram `healthy`:

```bash
docker compose -f /opt/labflow/deploy/docker-compose.prod.yaml ps
```

### 5. Testar o script antes de agendar

```bash
FORCAR=1 /opt/labflow/deploy/atualizar.sh
```

O `FORCAR=1` recria os containers mesmo já estando na última versão — é o jeito
de exercitar backup, pull, subida e healthcheck sem esperar uma release.

## Ensaiar numa máquina qualquer

Dá para rodar a coisa toda fora do servidor, isolada, sem tocar em produção nem
na stack de desenvolvimento: basta um nome de projeto e portas próprios.

```bash
cd deploy
cat > .env <<'EOF'
VERSAO_FRONT=1.0.0
VERSAO_BACK=1.0.0
PORTA_FRONT=13001
PORTA_BACK=13000
MAIN_DB_PORT=15432
MAIN_DB_USER=labflow
MAIN_DB_PASSWORD=teste-local
MAIN_DB=labflow
PORT=3000
JWT_SECRET=segredo-de-teste-local
FRONT_URL=http://localhost:13001
EOF

export COMPOSE_PROJECT_NAME=labflow-teste
docker compose -f docker-compose.prod.yaml up -d
LIMPAR_IMAGENS=0 ./atualizar.sh
```

Começar na `1.0.0` faz o script enxergar a release atual como novidade e
percorrer o caminho inteiro. O `COMPOSE_PROJECT_NAME` isola containers e volume;
o `LIMPAR_IMAGENS=0` evita o `docker image prune`, que apagaria imagens órfãs da
máquina inteira. Ao terminar:

```bash
docker compose -f docker-compose.prod.yaml down -v
```

## Agendamento

`crontab -e` como o usuário que tem acesso ao Docker:

```bash
CRON_TZ=America/Sao_Paulo
0 3 * * * /opt/labflow/deploy/atualizar.sh >> /var/log/labflow-deploy.log 2>&1
```

Isso roda às 03:00 no horário de Brasília. O `CRON_TZ` é suportado pelo cronie
(padrão em Debian/Ubuntu/RHEL); se o seu cron ignorar, calcule o horário em UTC
ou ajuste o fuso do sistema.

Vale um logrotate para o arquivo não crescer sem limite, em
`/etc/logrotate.d/labflow`:

```
/var/log/labflow-deploy.log {
    monthly
    rotate 12
    compress
    missingok
    notifempty
}
```

## Rollback manual

O script já reverte sozinho quando a versão nova não fica saudável. Para voltar
por decisão sua, edite as versões no `.env` e suba:

```bash
cd /opt/labflow/deploy
sed -i 's|^VERSAO_BACK=.*|VERSAO_BACK=1.0.0|' .env
docker compose -f docker-compose.prod.yaml up -d back
```

## Cuidados

**Migrations não voltam com a imagem.** O `start:prod` do backend aplica as
migrations pendentes ao subir. Voltar para a imagem anterior não desfaz nada no
schema — é para isso que existe o dump em `deploy/backups/` (os 7 mais recentes
são mantidos). Restauração:

```bash
gunzip -c deploy/backups/labflow-AAAAMMDD-HHMMSS.sql.gz \
  | docker compose -f deploy/docker-compose.prod.yaml exec -T db psql -U labflow -d labflow
```

**A tag do Postgres é flutuante.** O `image: postgres` sem tag pode trazer um
major novo, incompatível com o data directory existente. Por isso o
`atualizar.sh` puxa só `front` e `back`, nunca o `db`. Ainda assim, vale fixar:

```bash
docker compose -f deploy/docker-compose.prod.yaml exec db postgres --version
```

e escrever esse major no compose (ex.: `image: postgres:16`).

**Há downtime.** Os containers são recriados, não há troca azul-verde. São
alguns segundos para o front e o tempo das migrations para o back — daí a
atualização ser agendada de madrugada.

**A URL da API é embutida no build do front.** O `NEXT_PUBLIC_API_URL` entra no
bundle em tempo de build, não em runtime. A imagem publicada usa a variable
`NEXT_PUBLIC_API_URL` do repositório do front no GitHub (hoje
`https://labflow.net.br/api`). Mudar de domínio exige alterar essa variable e
gerar uma release nova — não adianta mexer no `.env` do servidor.
