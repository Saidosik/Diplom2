#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ! -f "up.sh" ]]; then
  echo "Файл up.sh не найден. Запусти скрипт из корня проекта Diplom2."
  exit 1
fi

cp up.sh ../up.sh
chmod +x ../up.sh

echo "Готово: ../up.sh"
echo "Запуск из родительского каталога:"
echo "  cd .. && ./up.sh"
