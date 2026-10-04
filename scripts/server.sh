#!/bin/bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
echo 'DPkg::Lock::Timeout "600";' > /etc/apt/apt.conf.d/99lock-timeout

apt-get update
apt-get install -y ca-certificates curl netcat-openbsd \
  docker.io docker-buildx git

hostnamectl set-hostname xin-server
echo 'preserve_hostname: true' > /etc/cloud/cloud.cfg.d/99-xin-hostname.cfg
echo '127.0.1.1 xin-server' >> /etc/hosts

REPO=https://github.com/s-honcharenko/cscs412-project2-services.git
APP=/home/ubuntu/xin-arcade

if [[ ! -d "$APP" ]]; then
  sudo -Hu ubuntu git clone --branch k8s --single-branch "$REPO" "$APP"
fi
docker build -t xin-arcade:latest "$APP"

install -d /var/lib/rancher/k3s/agent/images
docker save -o /var/lib/rancher/k3s/agent/images/xin-arcade.tar \
  xin-arcade:latest

curl -fsSL https://get.k3s.io | sh -s - server \
  --disable traefik --disable servicelb \
  --service-node-port-range 8080-8095

install -d -o ubuntu -g ubuntu -m 700 /home/ubuntu/.kube
install -o ubuntu -g ubuntu -m 600 /etc/rancher/k3s/k3s.yaml \
  /home/ubuntu/.kube/config

cat > /etc/update-motd.d/50-xin-arcade <<'MOTD'
#!/bin/bash

node=$(hostname)
ip=$(hostname -I | awk '{print $1}')

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
  ${L}          ▟███▛             ▜██▛ ${D}▟███▛${R}${R}         Server IP     ${ip}
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

cat >> /home/ubuntu/.profile <<'PROFILE'
export KUBECONFIG="$HOME/.kube/config"
echo 'Agent join token:'
sudo -n cat /var/lib/rancher/k3s/server/agent-token
PROFILE

cat > /etc/systemd/system/xin-arcade.service <<'UNIT'
[Unit]
Description=Xin Arcade deployment
After=k3s.service
Requires=k3s.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/xin-arcade
Environment=KUBECONFIG=/etc/rancher/k3s/k3s.yaml
ExecStart=/usr/local/bin/kubectl wait --for=create node/xin-worker --timeout=1h
ExecStart=/usr/local/bin/kubectl wait --for=condition=Ready \
  node/xin-worker --timeout=5m
ExecStart=/usr/local/bin/kubectl label node xin-worker \
  node-role.kubernetes.io/worker=worker --overwrite
ExecStart=/bin/bash run_xin_arcade.sh

[Install]
WantedBy=multi-user.target
UNIT
systemctl enable --now --no-block xin-arcade.service
