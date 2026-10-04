#!/usr/bin/env bash
set -euo pipefail

kubectl apply -f k8s.yaml
kubectl rollout status deployment/xin-arcade --timeout=180s
kubectl get nodes -o wide
kubectl get deployment,replicaset,pods -o wide
kubectl get service xin-arcade
