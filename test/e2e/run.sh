#!/bin/bash -e
# usage: run.sh <artifact-subdir> <full-domain> <device-user> <device-password> <ssh-user> <ssh-password> <push-server>
DIR=$(cd "$(dirname "$0")" && pwd)
cd "$DIR"

if [ $# -ne 7 ]; then
    echo "usage: $0 <artifact-subdir> <full-domain> <device-user> <device-password> <ssh-user> <ssh-password> <push-server>"
    exit 1
fi

export PLAYWRIGHT_APP_DOMAIN=ntfy.$2
export PLAYWRIGHT_DEVICE_HOST=ntfy.$2
export PLAYWRIGHT_DEVICE_USER=$3
export PLAYWRIGHT_DEVICE_PASSWORD=$4
export PLAYWRIGHT_SSH_USER=$5
export PLAYWRIGHT_SSH_PASSWORD=$6
export PLAYWRIGHT_ARTIFACT_DIR=/drone/src/artifact/$1
export PLAYWRIGHT_PUSH_SERVER=$7

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

DEVICE_IP=$(getent hosts "${PLAYWRIGHT_APP_DOMAIN}" | awk '{print $1}' | head -1)
if [ -z "${DEVICE_IP}" ]; then
    echo "cannot resolve ${PLAYWRIGHT_APP_DOMAIN}"
    exit 1
fi
echo "${DEVICE_IP} auth.$2 $2" >> /etc/hosts
echo "--- hosts"
tail -2 /etc/hosts
echo "--- unauthenticated response"
curl -sk -D- -o /dev/null --max-time 20 "https://${PLAYWRIGHT_APP_DOMAIN}/" || true

npm ci --no-audit --no-fund

for attempt in $(seq 1 30); do
    if curl -sf "http://${PLAYWRIGHT_PUSH_SERVER}/deliveries" > /dev/null; then
        break
    fi
    sleep 1
done
curl -sf "http://${PLAYWRIGHT_PUSH_SERVER}/deliveries" > /dev/null || {
    echo "push faker unreachable at ${PLAYWRIGHT_PUSH_SERVER}"
    exit 1
}
echo "--- push faker at ${PLAYWRIGHT_PUSH_SERVER}"

for project in desktop mobile; do
  PLAYWRIGHT_PROJECT=${project} npx playwright test --project=${project}
done
