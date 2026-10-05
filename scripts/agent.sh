#!/usr/bin/env bash
set -e

SERVER_PRIVATE_IP=''
K3S_TOKEN=''

export DEBIAN_FRONTEND=noninteractive
echo 'DPkg::Lock::Timeout "600";' > /etc/apt/apt.conf.d/99lock-timeout

apt-get update
apt-get install -y ca-certificates curl netcat-openbsd \
  docker.io docker-buildx git

hostnamectl set-hostname xin-worker
echo 'preserve_hostname: true' > /etc/cloud/cloud.cfg.d/99-xin-hostname.cfg
echo '127.0.1.1 xin-worker' >> /etc/hosts

REPO=https://github.com/s-honcharenko/cscs412-project2-services.git
APP=/home/ubuntu/xin-arcade

if [ ! -d "$APP" ]; then
  sudo -Hu ubuntu git clone --branch k8s --single-branch "$REPO" "$APP"
fi
docker build -t xin-arcade:latest "$APP"

install -d /var/lib/rancher/k3s/agent/images
docker save -o /var/lib/rancher/k3s/agent/images/xin-arcade.tar xin-arcade:latest

curl -fsSL https://get.k3s.io | K3S_TOKEN="$K3S_TOKEN" sh -s - agent \
  --server "https://$SERVER_PRIVATE_IP:6443"

cat > /etc/update-motd.d/50-xin-arcade <<'MOTD'
#!/bin/bash

node=$(hostname)

D=$'\e[38;5;68m'    # Xin blue  #5277C3
L=$'\e[38;5;110m'   # Xin sky   #7EBAE4
R=$'\e[0m'

cat <<EOF

  ${D}          ▗▄▄▄       ${L}▗▄▄▄▄    ▄▄▄▖${R}${R}
  ${D}          ▜███▙       ${L}▜███▙  ▟███▛${R}${R}
  ${D}           ▜███▙       ${L}▜███▙▟███▛${R}${R}              Xin Arcade by Xin, Inc.
  ${D}            ▜███▙       ${L}▜██████▛${R}${R}               ${node}
  ${D}     ▟█████████████████▙ ${L}▜████▛     ${D}▟▙${R}
  ${D}    ▟███████████████████▙ ${L}▜███▙    ${D}▟██▙${R}        Game portal   :8080
  ${L}           ▄▄▄▄▖           ▜███▙  ${D}▟███▛${R}${R}
  ${L}          ▟███▛             ▜██▛ ${D}▟███▛${R}${R}         Cluster       K3s
  ${L}         ▟███▛               ▜▛ ${D}▟███▛${R}${R}
  ${L}▟███████████▛                  ${D}▟██████████▙${R}${R}    Games
  ${L}▜██████████▛                  ${D}▟███████████▛${R}${R}      Snake       :8091
  ${L}      ▟███▛ ${D}▟▙               ▟███▛${R}${R}               Stack       :8092
  ${L}     ▟███▛ ${D}▟██▙             ▟███▛${R}${R}                Rocks       :8093
  ${L}    ▟███▛  ${D}▜███▙           ▝▀▀▀▀${R}${R}                 Invaders    :8094
  ${L}    ▜██▛    ${D}▜███▙ ${L}▜██████████████████▛${R}           2048        :8095
  ${L}     ▜▛     ${D}▟████▙ ${L}▜████████████████▛${R}
  ${D}           ▟██████▙       ${L}▜███▙${R}${R}
  ${D}          ▟███▛▜███▙       ${L}▜███▙${R}${R}
  ${D}         ▟███▛  ▜███▙       ${L}▜███▙${R}${R}
  ${D}         ▝▀▀▀    ▀▀▀▀▘       ${L}▀▀▀▘${R}${R}
EOF
MOTD
chmod 755 /etc/update-motd.d/50-xin-arcade
