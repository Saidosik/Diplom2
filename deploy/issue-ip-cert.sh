#!/usr/bin/env sh
set -eu

echo "Obsolete: production now uses existing /etc/ssl/said-diplom certificate files for said-diplom.ru. Do not issue IP certificates with Certbot for this deployment." >&2
exit 1
