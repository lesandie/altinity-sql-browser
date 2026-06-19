#!/usr/bin/env bash
# Install the Altinity SQL Browser onto a ClickHouse cluster:
#   1. build the single-file SPA (dist/sql.html)
#   2. render config.json from the OAuth args
#   3. upload both into ClickHouse user_files/ (sql.html, sql-config.json)
#   4. print the http_handlers config to enable /sql
#
# The password is read from the CLICKHOUSE_PASSWORD env var or prompted — never
# passed on the command line (it would leak via `ps`/shell history).
#
# Usage:
#   CLICKHOUSE_PASSWORD=... ./deploy/install.sh \
#     --ch-host clickhouse.example.com \
#     --ch-user admin \
#     --client-id <oauth-client-id> \
#     [--issuer https://accounts.google.com] \
#     [--audience <aud>] \
#     [--cluster my_cluster] \
#     [--secure]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

CH_HOST="" CH_USER="default" ISSUER="https://accounts.google.com"
CLIENT_ID="" AUDIENCE="" CLUSTER="" SECURE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --ch-host) CH_HOST="$2"; shift 2 ;;
    --ch-user) CH_USER="$2"; shift 2 ;;
    --client-id) CLIENT_ID="$2"; shift 2 ;;
    --issuer) ISSUER="$2"; shift 2 ;;
    --audience) AUDIENCE="$2"; shift 2 ;;
    --cluster) CLUSTER="$2"; shift 2 ;;
    --secure) SECURE=1; shift ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

[[ -n "$CH_HOST" ]] || { echo "--ch-host is required" >&2; exit 2; }
[[ -n "$CLIENT_ID" ]] || { echo "--client-id is required" >&2; exit 2; }

if [[ -z "${CLICKHOUSE_PASSWORD:-}" ]]; then
  read -r -s -p "ClickHouse password for $CH_USER@$CH_HOST: " CLICKHOUSE_PASSWORD
  echo
fi
export CLICKHOUSE_PASSWORD

CH=(clickhouse-client --host "$CH_HOST" --user "$CH_USER")
[[ "$SECURE" == 1 ]] && CH+=(--secure)

echo "==> Building dist/sql.html"
node "$ROOT/build/build.mjs"

echo "==> Rendering config.json"
CONFIG_JSON=$(printf '{"issuer":"%s","client_id":"%s","audience":"%s"}' "$ISSUER" "$CLIENT_ID" "$AUDIENCE")

upload() {  # upload <local-bytes-base64> <user_files-filename>
  local b64="$1" fname="$2" tbl="default._asb_$(echo "$fname" | tr '.-' '__')"
  if [[ -n "$CLUSTER" ]]; then
    "${CH[@]}" --query "CREATE TABLE IF NOT EXISTS ${tbl} ON CLUSTER '${CLUSTER}' (content String)
      ENGINE = File('RawBLOB', '/var/lib/clickhouse/user_files/${fname}')"
    "${CH[@]}" --query "INSERT INTO FUNCTION clusterAllReplicas('${CLUSTER}','${tbl%.*}','${tbl#*.}')
      SETTINGS engine_file_truncate_on_insert = 1 SELECT base64Decode('${b64}')"
  else
    "${CH[@]}" --query "CREATE TABLE IF NOT EXISTS ${tbl} (content String)
      ENGINE = File('RawBLOB', '/var/lib/clickhouse/user_files/${fname}')"
    "${CH[@]}" --query "INSERT INTO ${tbl}
      SETTINGS engine_file_truncate_on_insert = 1 SELECT base64Decode('${b64}')"
  fi
  "${CH[@]}" --query "DROP TABLE IF EXISTS ${tbl} ${CLUSTER:+ON CLUSTER '${CLUSTER}'}"
}

echo "==> Uploading sql.html"
upload "$(base64 < "$ROOT/dist/sql.html" | tr -d '\n')" "sql.html"
echo "==> Uploading sql-config.json"
upload "$(printf '%s' "$CONFIG_JSON" | base64 | tr -d '\n')" "sql-config.json"

cat <<EOF

==> Assets uploaded to ClickHouse user_files/.

Final step — enable the HTTP routes. Add deploy/http_handlers.xml to the
server config.d/ (or push it as an ACM cluster setting named
"config.d/sql-browser.xml") and reload ClickHouse. Then open:

    http${SECURE:+s}://$CH_HOST/sql

Also register the OAuth redirect URI  http(s)://$CH_HOST/sql  with your IdP,
and make sure ClickHouse is configured to accept the bearer JWT (token_processor
+ JWKS, or a delegated http_authentication verifier). See README.
EOF
