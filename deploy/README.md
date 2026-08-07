# Deploy de produção

Atualização agendada do LabFlow. Todo dia às 03:00 (horário de Brasília) o
servidor consulta a última release publicada no GitHub, baixa as imagens
correspondentes do Docker Hub e recria os containers — com dump do banco antes
e rollback automático se a versão nova não ficar saudável.

Se não houver release nova, o script sai sem tocar em nada.

| Arquivo | Papel |
| --- | --- |
| `docker-compose.prod.yaml` | Stack de produção com as imagens do Docker Hub (não compila nada) |
| `atualizar.sh` | Verifica release, faz backup, atualiza e reverte se preciso |
| `systemd/` | Unidades do agendamento e config do logrotate, como estão no servidor |
| `.env` | Credenciais + versões em produção (não versionado; vive no servidor) |

O `docker-compose.yaml` da raiz continua sendo o de desenvolvimento, onde
compilar do código-fonte é o que se quer.

## Onde isso roda

Já está instalado e ativo. Estas são as coordenadas reais, não um exemplo:

- **Servidor:** `root@labflow.net.br` (2.25.161.81), Ubuntu 26.04, fuso **UTC**
- **Diretório:** `/opt/labflow` — os arquivos deste `deploy/` são copiados para lá
- **Stack:** `labflow` (o `name:` do compose **precisa** continuar sendo esse;
  mudar cria uma stack nova com Postgres vazio e deixa o banco atual órfão)
- **Volume do banco:** `labflow_postgres_data`
- **Publicação:** Apache no host faz o TLS e o proxy; os containers escutam só
  em `127.0.0.1`
- **Agendamento:** timer do systemd `labflow-atualizar.timer`, log em
  `/var/log/labflow-deploy.log`

Para propagar uma alteração deste diretório:

```bash
scp deploy/docker-compose.prod.yaml deploy/atualizar.sh root@labflow.net.br:/opt/labflow/
```

## Agendamento: por que systemd e não cron

O servidor roda em **UTC**, então a janela precisa declarar o fuso — senão
"03:00" vira meia-noite em Brasília.

O caminho óbvio seria `CRON_TZ=America/Sao_Paulo` no crontab, mas **não
funciona aqui**: o cron do Debian/Ubuntu (`cron 3.0pl1`) trata essa linha como
variável de ambiente repassada ao job, não como fuso do agendamento. Foi
verificado empiricamente — um job de teste agendado por `CRON_TZ` simplesmente
não disparou no horário esperado.

O systemd (259 neste servidor) aceita fuso direto no `OnCalendar`:

```bash
systemd-analyze calendar "*-*-* 03:00:00 America/Sao_Paulo"
```

Comandos úteis:

```bash
systemctl list-timers labflow-atualizar --no-pager
```

```bash
systemctl start labflow-atualizar.service && cat /var/log/labflow-deploy.log
```

O timer não usa `Persistent=true`: se o servidor estiver desligado às 03:00, a
atualização espera a próxima janela em vez de disparar num horário arbitrário
logo após o boot.

## Por que as portas são `127.0.0.1:`

Não é preferência, é contenção. O Docker escreve regras direto no iptables e
passa por cima do UFW — publicar em `0.0.0.0` expõe o serviço na internet mesmo
com o firewall configurado para bloqueá-lo. O banco não publica porta nenhuma:
é alcançável só pela rede interna do compose.

## Fixação de versão

O `.env` carrega `VERSAO_FRONT` e `VERSAO_BACK`, reescritas pelo `atualizar.sh`
a cada deploy. Seguir `latest` traria toda alteração da `main`; fixar a versão
faz produção andar só em cima de release publicada — e é o que dá ao rollback um
alvo com nome.

## Rollback

O script reverte sozinho quando a versão nova não fica saudável. Para voltar por
decisão sua:

```bash
cd /opt/labflow && sed -i 's|^VERSAO_BACK=.*|VERSAO_BACK=1.1.0|' .env && docker compose -f docker-compose.prod.yaml --env-file .env up -d back
```

**Não existe rollback válido do front para antes da 1.1.0.** A imagem
`labflow-front:1.0.0` foi construída em 29/07, antes de a variable
`NEXT_PUBLIC_API_URL` existir no repositório do front (criada em 03/08), então
ela carrega `http://localhost:3000` embutido no bundle e sobe um app que não
alcança a API. Da 1.1.0 em diante o problema não se repete. Para o estado
anterior a ela existe `/opt/labflow/ESTADO-PRE-1.1.0.txt`, com os digests exatos
das imagens que rodavam.

## Cuidados

**Migrations não voltam com a imagem.** O `start:prod` do backend aplica as
migrations pendentes ao subir; trocar a imagem de volta não desfaz schema. É
para isso que o dump roda antes, em `/opt/labflow/backups/` (os 7 mais recentes
são mantidos). Restauração:

```bash
cd /opt/labflow && gunzip -c backups/labflow-AAAAMMDD-HHMMSS.sql.gz | docker compose -f docker-compose.prod.yaml --env-file .env exec -T db psql -U labflow -d labflow
```

**O major do Postgres é migração planejada.** A imagem está fixa em
`postgres:16-alpine` de propósito, e o `atualizar.sh` puxa só `front` e `back` —
um major novo não lê o datadir do anterior e o container sobe em loop de erro.

**Há downtime.** Os containers são recriados, não há troca azul-verde. O deploy
da 1.1.0 levou 30 segundos; migrations pesadas alongam isso. Daí a janela de
madrugada.

**A URL da API é embutida no build do front.** `NEXT_PUBLIC_API_URL` entra no
bundle em tempo de build, não em runtime. A imagem publicada usa a variable de
mesmo nome no repositório do front (hoje `https://labflow.net.br/api`). Trocar
de domínio exige alterar a variable e gerar release nova — mexer no `.env` do
servidor não tem efeito.

## Ensaiar numa máquina qualquer

Dá para exercitar o script inteiro fora do servidor, isolado, sem tocar em
produção: basta um nome de projeto próprio e portas que não colidam.

```bash
cd deploy
cat > .env <<'EOF'
VERSAO_FRONT=1.0.0
VERSAO_BACK=1.0.0
MAIN_DB_USER=labflow
MAIN_DB_PASSWORD=teste-local
MAIN_DB=labflow
FRONT_URL=http://localhost:3001
JWT_SECRET=segredo-de-teste-local
EOF

export COMPOSE_PROJECT_NAME=labflow-teste
docker compose -f docker-compose.prod.yaml --env-file .env up -d
LIMPAR_IMAGENS=0 ./atualizar.sh
```

Começar numa versão antiga faz o script enxergar a release atual como novidade e
percorrer o caminho inteiro. O `COMPOSE_PROJECT_NAME` isola containers e volume;
o `LIMPAR_IMAGENS=0` evita o `docker image prune`, que apagaria imagens órfãs da
máquina inteira. Se as portas 3000/3001 estiverem ocupadas, ajuste os `ports:`
temporariamente — em produção elas precisam continuar em `127.0.0.1`.

Ao terminar:

```bash
docker compose -f docker-compose.prod.yaml down -v && rm -f .env && rm -rf backups
```

Variáveis úteis: `FORCAR=1` recria os containers mesmo sem versão nova,
`LIMITE_SAUDE` encurta a espera pelo healthcheck, `LIMPAR_IMAGENS=0` pula o
prune.
