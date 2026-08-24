#!/bin/bash -e
# usage: run.sh <artifact-subdir> <full-domain> <device-user> <device-password> <ssh-user> <ssh-password>
DIR=$(cd "$(dirname "$0")" && pwd)
cd "$DIR"

if [ $# -ne 6 ]; then
    echo "usage: $0 <artifact-subdir> <full-domain> <device-user> <device-password> <ssh-user> <ssh-password>"
    exit 1
fi

export PLAYWRIGHT_APP_DOMAIN=ntfy.$2
export PLAYWRIGHT_DEVICE_HOST=ntfy.$2
export PLAYWRIGHT_DEVICE_USER=$3
export PLAYWRIGHT_DEVICE_PASSWORD=$4
export PLAYWRIGHT_SSH_USER=$5
export PLAYWRIGHT_SSH_PASSWORD=$6
export PLAYWRIGHT_ARTIFACT_DIR=/drone/src/artifact/$1

while ! apt-get update; do
  sleep 1
  echo "retry"
done
while ! apt-get install -y sshpass openssh-client curl; do
  sleep 1
  echo "retry"
done

echo "--- resolving ${PLAYWRIGHT_APP_DOMAIN}"
getent hosts "${PLAYWRIGHT_APP_DOMAIN}" || true
cat /etc/resolv.conf || true
echo "--- unauthenticated response"
curl -sk -D- -o /dev/null --max-time 20 "https://${PLAYWRIGHT_APP_DOMAIN}/" || true

npm ci --no-audit --no-fund

for project in desktop mobile; do
  PLAYWRIGHT_PROJECT=${project} npx playwright test --project=${project}
done
