#!/usr/bin/env sh
set -eu

echo "Obsolete: production now uses existing /etc/ssl/said-diplom certificate files for said-diplom.ru. Renew those host certificates outside Docker/Certbot if needed." >&2
exit 1
