#!/usr/bin/env bash
#
# Starts PostgreSQL (Docker), the API and the Angular dev server, all at once.
#
#   ./scripts/run.sh                        # Development
#   ./scripts/run.sh --environment Test     # also exposes POST /api/test/reset
#   ./scripts/run.sh --stop-db              # stop the container on exit too
#   ./scripts/run.sh --skip-install         # never run npm ci
#   ./scripts/run.sh --no-browser           # do not open the app
#
# Ctrl+C stops the API and the dev server. The database container is left
# running unless --stop-db is given; the volume is kept either way.

set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
web_dir="$root/web"
api_proj="$root/src/ContactsManager.Api"
api_url="http://localhost:5272"
web_url="http://localhost:4200"
api_port=5272
web_port=4200
db_name="contacts-db"

environment="Development"
skip_install=0
stop_db=0
no_browser=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -e|--environment) environment="${2:-}"; shift 2 ;;
    --skip-install)   skip_install=1; shift ;;
    --no-browser)     no_browser=1; shift ;;
    --stop-db)        stop_db=1; shift ;;
    -h|--help)        sed -n '3,13p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

case "$environment" in
  Development|Test) ;;
  *) echo "--environment must be Development or Test, got '$environment'" >&2; exit 2 ;;
esac

step() { printf '\n\033[36m==> %s\033[0m\n' "$1"; }
note() { printf '\033[90m    %s\033[0m\n' "$1"; }

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "$1 was not found on PATH. $2" >&2; exit 1; }
}

api_pid=""
web_pid=""

cleanup() {
  trap - INT TERM EXIT
  step "Shutting down"
  for pair in "$web_pid:the dev server" "$api_pid:the API"; do
    pid="${pair%%:*}"
    label="${pair#*:}"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      note "stopping $label (pid $pid)"
      # Negative pid kills the whole process group (job control gives each job its
      # own), so the dotnet/node child dies with the subshell that launched it.
      kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
    fi
  done
  wait 2>/dev/null || true

  if [[ $stop_db -eq 1 ]]; then
    note "stopping the database container"
    (cd "$root" && docker compose stop db >/dev/null)
  else
    note "$db_name is still running — 'docker compose stop db' to stop it"
  fi
}

assert_port_free() {
  local port="$1" what="$2"
  if listening "$port"; then
    echo "Port $port is already in use, so $what cannot start. Stop it and run this again." >&2
    exit 1
  fi
}

open_browser() {
  local url="$1"
  # A missing or unwilling browser is no reason to take the whole stack down, so
  # every branch here falls through to just printing the URL.
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
  elif command -v wslview >/dev/null 2>&1; then
    wslview "$url" >/dev/null 2>&1 || true
  elif command -v cmd.exe >/dev/null 2>&1; then
    # Git Bash. The empty first argument is start's window title, not the URL.
    cmd.exe /c start "" "$url" >/dev/null 2>&1 || true
  else
    note "open $url to see the app"
    return
  fi
  note "opened $url in the default browser"
}

wait_until() {
  local what="$1" timeout="$2"; shift 2
  local deadline=$(( SECONDS + timeout ))
  while (( SECONDS < deadline )); do
    if "$@"; then return 0; fi
    sleep 0.5
  done
  echo "Timed out after ${timeout}s waiting for $what." >&2
  return 1
}

listening() {
  # bash's /dev/tcp; no netcat dependency. The Angular dev server binds the IPv6
  # loopback only, so try both families rather than 127.0.0.1 alone.
  (exec 3<>"/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1 ||
    (exec 3<>"/dev/tcp/::1/$1") >/dev/null 2>&1
}

db_healthy() {
  [[ "$(docker inspect -f '{{.State.Health.Status}}' "$db_name" 2>/dev/null)" == "healthy" ]]
}

api_listening() {
  kill -0 "$api_pid" 2>/dev/null || { echo "The API exited before it started listening." >&2; exit 1; }
  listening "$api_port"
}

web_listening() {
  kill -0 "$web_pid" 2>/dev/null || { echo "The dev server exited." >&2; exit 1; }
  listening "$web_port"
}

need docker "Install Docker Desktop and make sure the engine is running."
need dotnet "Install the .NET SDK 10.0.303 or a later 10.0 feature band."
need npm    "Install Node.js 24."

# A port that is already taken would otherwise look like a successful start,
# because the readiness probe cannot tell our process from someone else's.
assert_port_free "$api_port" "the API"
assert_port_free "$web_port" "the dev server"

# --- .env -------------------------------------------------------------------
if [[ ! -f "$root/.env" ]]; then
  step "Creating .env from .env.example"
  cp "$root/.env.example" "$root/.env"
fi

# --- database ---------------------------------------------------------------
step "Starting PostgreSQL"
(cd "$root" && docker compose up -d db)

note "waiting for the health check"
wait_until "PostgreSQL to become healthy" 90 db_healthy
note "$db_name is healthy"

# --- frontend dependencies --------------------------------------------------
if [[ $skip_install -eq 0 && ! -d "$web_dir/node_modules" ]]; then
  step "Installing frontend dependencies (npm ci)"
  (cd "$web_dir" && npm ci)
fi

trap cleanup INT TERM EXIT

# Job control, so each background job below is its own process group and cleanup
# can signal the whole tree rather than just the wrapper.
set -m

# --- api --------------------------------------------------------------------
step "Starting the API on $api_url ($environment)"
# --no-launch-profile so these win over launchSettings.json, which is fixed to Development.
(
  cd "$root"
  ASPNETCORE_ENVIRONMENT="$environment" ASPNETCORE_URLS="$api_url" \
    exec dotnet run --project "$api_proj" --no-launch-profile
) &
api_pid=$!

wait_until "the API to listen on $api_port" 180 api_listening
note "api is up — openapi at $api_url/openapi/v1.json"

# --- frontend ---------------------------------------------------------------
step "Starting the Angular dev server on $web_url"
(cd "$web_dir" && exec npm start) &
web_pid=$!

wait_until "the dev server to listen on $web_port" 180 web_listening

step "All three are running"
echo "    app       $web_url"
echo "    api       $api_url"
echo "    swagger   $api_url/swagger"
echo "    scalar    $api_url/scalar"
echo "    database  $db_name (docker)"
echo ""
if [[ $no_browser -eq 0 ]]; then
  open_browser "$web_url"
fi

printf '\033[33m    Press Ctrl+C to stop.\033[0m\n'

# Return as soon as either one falls over, so the other is cleaned up too.
wait -n || true
