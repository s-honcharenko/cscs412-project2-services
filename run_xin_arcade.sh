#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

docker compose build portal
docker compose up -d --build --wait

for port in 8080 8081 8082 8083 8084 8085 8091 8092 8093 8094 8095; do
  printf '%s  %s\n' "$port" "$(curl -s -o /dev/null -w '%{http_code}' "localhost:$port")"
done
