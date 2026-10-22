#!/bin/sh
set -eu
if [ "${RENEWED_LINEAGE:-}" != /etc/letsencrypt/live/asa-mail ]; then
    exit 0
fi
install -m 644 "$RENEWED_LINEAGE/fullchain.pem" /opt/asa-mail/tls/fullchain.pem
install -m 600 "$RENEWED_LINEAGE/privkey.pem" /opt/asa-mail/tls/privkey.pem
docker compose -f /opt/asa-mail/compose.yaml restart mailserver
nginx -t
systemctl reload nginx
