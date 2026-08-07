#!/usr/bin/env bash
#
# Atualiza o LabFlow para a última release publicada no GitHub.
#
# Pensado para rodar por cron numa janela de baixa utilização. Se não houver
# versão nova, sai sem tocar em nada — então pode rodar todo dia sem medo.
#
# Uso:
#   ./atualizar.sh              # atualiza se houver release nova
#   FORCAR=1 ./atualizar.sh     # recria os containers mesmo sem versão nova
#   LIMPAR_IMAGENS=0 ...        # não roda `docker image prune` ao final
#
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE="$DIR/docker-compose.prod.yaml"
ENV_FILE="$DIR/.env"
BACKUP_DIR="${LABFLOW_BACKUP_DIR:-$DIR/backups}"
BACKUPS_MANTIDOS=7

REPO_FRONT='Matheusl-Silva/LabFlow-Front'
REPO_BACK='Matheusl-Silva/LabFlow-Back'

dc() { docker compose -f "$COMPOSE" "$@"; }
log() { printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
erro() { log "ERRO: $*" >&2; }

# --- Pré-requisitos -----------------------------------------------------------

[ -f "$COMPOSE" ] || { erro "compose não encontrado em $COMPOSE"; exit 1; }
[ -f "$ENV_FILE" ] || { erro ".env não encontrado em $ENV_FILE"; exit 1; }
command -v docker >/dev/null || { erro "docker não está no PATH"; exit 1; }
command -v curl >/dev/null || { erro "curl não está instalado"; exit 1; }

# --- Helpers de .env ----------------------------------------------------------

# Lê uma chave do .env sem dar `source` no arquivo (que executaria o conteúdo).
valor_env() {
  grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- || true
}

definir_env() {
  local chave=$1 valor=$2
  if grep -qE "^${chave}=" "$ENV_FILE"; then
    # `|` como separador porque a versão nunca contém esse caractere.
    sed -i "s|^${chave}=.*|${chave}=${valor}|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$chave" "$valor" >>"$ENV_FILE"
  fi
}

# --- GitHub -------------------------------------------------------------------

# Última release de um repo público, sem token e sem depender de jq.
ultima_versao() {
  local repo=$1 tag
  tag=$(curl -fsSL --max-time 30 \
    -H 'Accept: application/vnd.github+json' \
    "https://api.github.com/repos/${repo}/releases/latest" |
    grep -m1 '"tag_name"' | cut -d'"' -f4)
  [ -n "$tag" ] || return 1
  # As imagens são publicadas sem o "v" do nome da tag (ex.: tag v1.1.0 -> 1.1.0).
  printf '%s' "${tag#v}"
}

# --- Saúde --------------------------------------------------------------------

esperar_saudavel() {
  # LIMITE_SAUDE existe para encurtar a espera em testes; em produção o padrão
  # precisa acomodar as migrations do backend.
  local servico=$1 limite=${2:-${LIMITE_SAUDE:-240}} id estado rodando
  local fim=$((SECONDS + limite))

  while ((SECONDS < fim)); do
    id="$(dc ps -q "$servico" 2>/dev/null || true)"
    if [ -n "$id" ]; then
      estado="$(docker inspect -f '{{.State.Health.Status}}' "$id" 2>/dev/null || echo desconhecido)"
      [ "$estado" = healthy ] && return 0

      # Se o container já morreu, esperar o timeout inteiro não ajuda em nada.
      rodando="$(docker inspect -f '{{.State.Running}}' "$id" 2>/dev/null || echo false)"
      if [ "$rodando" = false ]; then
        erro "container de '$servico' parou durante a subida"
        return 1
      fi
    fi
    sleep 5
  done

  erro "'$servico' não ficou saudável em ${limite}s"
  return 1
}

# --- Backup do banco ----------------------------------------------------------

# Roda ANTES de subir a versão nova porque o start:prod do backend aplica as
# migrations pendentes automaticamente — e voltar a imagem antiga não desfaz
# migration nenhuma. Este dump é a única saída real num rollback de schema.
backup_banco() {
  local usuario banco destino
  usuario=$(valor_env MAIN_DB_USER)
  banco=$(valor_env MAIN_DB)
  [ -n "$usuario" ] && [ -n "$banco" ] || { erro "MAIN_DB_USER/MAIN_DB ausentes no .env"; return 1; }

  mkdir -p "$BACKUP_DIR"
  destino="$BACKUP_DIR/labflow-$(date '+%Y%m%d-%H%M%S').sql.gz"

  log "Fazendo backup do banco em $destino"
  if ! dc exec -T db pg_dump -U "$usuario" "$banco" | gzip >"$destino"; then
    rm -f "$destino"
    erro "pg_dump falhou — abortando a atualização"
    return 1
  fi

  # Mantém só os N mais recentes.
  ls -1t "$BACKUP_DIR"/labflow-*.sql.gz 2>/dev/null |
    tail -n +$((BACKUPS_MANTIDOS + 1)) | xargs -r rm -f

  return 0
}

# --- Fluxo --------------------------------------------------------------------

log "Verificando releases..."

nova_front=$(ultima_versao "$REPO_FRONT") || { erro "não consegui consultar a release do front"; exit 1; }
nova_back=$(ultima_versao "$REPO_BACK") || { erro "não consegui consultar a release do back"; exit 1; }

atual_front=$(valor_env VERSAO_FRONT)
atual_back=$(valor_env VERSAO_BACK)

log "front: ${atual_front:-<vazio>} -> ${nova_front} | back: ${atual_back:-<vazio>} -> ${nova_back}"

if [ "$nova_front" = "$atual_front" ] && [ "$nova_back" = "$atual_back" ] && [ "${FORCAR:-0}" != 1 ]; then
  log "Nenhuma versão nova. Nada a fazer."
  exit 0
fi

backup_banco || exit 1

log "Baixando imagens..."
definir_env VERSAO_FRONT "$nova_front"
definir_env VERSAO_BACK "$nova_back"

if ! dc pull front back; then
  erro "falha no pull — revertendo o .env e mantendo a versão atual no ar"
  definir_env VERSAO_FRONT "$atual_front"
  definir_env VERSAO_BACK "$atual_back"
  exit 1
fi

log "Subindo containers..."
# Só front e back são recriados; o db fica de pé (a tag dele é flutuante e um
# pull traria um major novo, incompatível com o data directory existente).
if dc up -d front back && esperar_saudavel back && esperar_saudavel front; then
  log "Atualizado: front ${nova_front}, back ${nova_back}"
  # O prune remove imagens órfãs do host INTEIRO. Num servidor dedicado é o que
  # se quer; ao testar numa máquina de desenvolvimento, use LIMPAR_IMAGENS=0.
  if [ "${LIMPAR_IMAGENS:-1}" = 1 ]; then
    docker image prune -f >/dev/null 2>&1 || true
  fi
  exit 0
fi

# --- Rollback -----------------------------------------------------------------

erro "a versão nova não subiu — voltando para front ${atual_front:-?} / back ${atual_back:-?}"
dc logs --tail 50 back front || true

if [ -z "$atual_front" ] || [ -z "$atual_back" ]; then
  erro "sem versão anterior registrada no .env, rollback automático impossível"
  exit 1
fi

definir_env VERSAO_FRONT "$atual_front"
definir_env VERSAO_BACK "$atual_back"

if dc up -d front back && esperar_saudavel back && esperar_saudavel front; then
  # As migrations aplicadas pela versão nova NÃO voltam junto com a imagem.
  # Se o problema for de schema, restaure o dump mais recente de $BACKUP_DIR.
  erro "rollback concluído — versão anterior no ar. Confira as migrations."
else
  erro "ROLLBACK FALHOU — sistema fora do ar, precisa de intervenção manual."
fi

exit 1
