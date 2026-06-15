#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="${PROJECT_DIR:-Diplom2}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
FRESH_CONFIRM_WORD="FRESH"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${LOG_FILE:-$SCRIPT_DIR/up_$(date +%Y%m%d_%H%M%S).log}"

log() {
  printf '\n\033[1;32m[%s]\033[0m %s\n' "$(date +'%Y-%m-%d %H:%M:%S')" "$*"
}

run() {
  printf '\n\033[1;34m$ %q' "$1"
  shift || true
  printf ' %q' "$@"
  printf '\033[0m\n'
  "$@"
}

find_project() {
  if [[ -f "$SCRIPT_DIR/$COMPOSE_FILE" && -d "$SCRIPT_DIR/.git" ]]; then
    printf '%s\n' "$SCRIPT_DIR"
    return 0
  fi

  if [[ -d "$SCRIPT_DIR/$PROJECT_DIR" && -f "$SCRIPT_DIR/$PROJECT_DIR/$COMPOSE_FILE" ]]; then
    printf '%s\n' "$SCRIPT_DIR/$PROJECT_DIR"
    return 0
  fi

  if [[ -d "$PWD/$PROJECT_DIR" && -f "$PWD/$PROJECT_DIR/$COMPOSE_FILE" ]]; then
    printf '%s\n' "$PWD/$PROJECT_DIR"
    return 0
  fi

  if [[ -f "$PWD/$COMPOSE_FILE" && -d "$PWD/.git" ]]; then
    printf '%s\n' "$PWD"
    return 0
  fi

  return 1
}

main() {
  exec > >(tee -a "$LOG_FILE") 2>&1

  log "Старт production deploy. Лог: $LOG_FILE"

  PROJECT_ROOT="$(find_project)" || {
    echo "Не нашёл проект. Скрипт должен лежать либо в корне Diplom2, либо рядом с папкой Diplom2."
    echo "Можно указать папку явно: PROJECT_DIR=/path/to/Diplom2 ./up.sh"
    exit 1
  }

  cd "$PROJECT_ROOT"
  log "Проект: $(pwd)"

  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Не найден $ENV_FILE в $(pwd)"
    exit 1
  fi

  if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo "Не найден $COMPOSE_FILE в $(pwd)"
    exit 1
  fi

  COMPOSE=(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")

  log "git pull"
  run git git pull --ff-only

  log "docker compose up -d --build"
  run docker "${COMPOSE[@]}" up -d --build

  log "restart reverse-proxy"
  run docker "${COMPOSE[@]}" restart reverse-proxy

  echo
  echo "ВНИМАНИЕ: команда migrate:fresh --seed УДАЛИТ ВСЕ ТАБЛИЦЫ И ДАННЫЕ в базе, затем создаст их заново и заполнит seed-данными."
  echo "Для production это разрушительная операция."

  if [[ "${CONFIRM_FRESH:-}" != "yes" ]]; then
    read -r -p "Чтобы продолжить, напиши ${FRESH_CONFIRM_WORD}: " ANSWER
    if [[ "$ANSWER" != "$FRESH_CONFIRM_WORD" ]]; then
      echo "Миграция отменена. Deploy остановлен после restart reverse-proxy."
      exit 0
    fi
  fi

  log "php artisan migrate:fresh --seed"
  run docker "${COMPOSE[@]}" exec -T backend php artisan migrate:fresh --seed

  log "docker compose ps"
  run docker "${COMPOSE[@]}" ps

  log "Готово"
}

main "$@"
