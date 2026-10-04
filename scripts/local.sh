#!/usr/bin/env bash
set -euo pipefail

docker build -t xin-arcade:latest .

k3d cluster create xin --servers 1 --agents 1 \
  -p '8080:8080@server:0' \
  -p '8091-8095:8091-8095@server:0' \
  --k3s-arg '--disable=traefik@server:*' \
  --k3s-arg '--disable=servicelb@server:*' \
  --k3s-arg '--service-node-port-range=8080-8095@server:*'

k3d image import xin-arcade:latest -c xin

kubectl --context k3d-xin label node k3d-xin-agent-0 node-role.kubernetes.io/worker=worker

bash run_xin_arcade.sh
