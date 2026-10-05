#!/usr/bin/env bash
set -e

echo 'Xin, Inc. cluster evidence'
date -u
kubectl config current-context

kubectl get nodes -o wide
kubectl get pods -A -o wide
kubectl get deployment,replicaset -l app=xin-arcade -o wide
kubectl get pods -l app=xin-arcade -o wide
kubectl get pods -l app=xin-arcade \
  -o custom-columns=NAME:.metadata.name,UID:.metadata.uid
kubectl get service xin-arcade -o wide
kubectl get endpointslices -l kubernetes.io/service-name=xin-arcade -o wide

kubectl describe deployment xin-arcade
kubectl describe pods -l app=xin-arcade
kubectl describe nodes
kubectl get events --sort-by=.lastTimestamp
