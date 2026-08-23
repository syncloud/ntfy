#!/bin/bash -e
# usage: run.sh <artifact-subdir> <spec>
DIR=$(cd "$(dirname "$0")" && pwd)
cd "$DIR"

ARTIFACT_SUBDIR=$1
SPEC=$2

export PLAYWRIGHT_FULL_DOMAIN=${PLAYWRIGHT_FULL_DOMAIN:-bookworm.com}
export PLAYWRIGHT_APP_DOMAIN=ntfy.${PLAYWRIGHT_FULL_DOMAIN}
export PLAYWRIGHT_DEVICE_HOST=ntfy.${PLAYWRIGHT_FULL_DOMAIN}
export PLAYWRIGHT_DEVICE_USER=${PLAYWRIGHT_DEVICE_USER:-user}
export PLAYWRIGHT_DEVICE_PASSWORD=${PLAYWRIGHT_DEVICE_PASSWORD:-Password1}
export PLAYWRIGHT_SSH_USER=${PLAYWRIGHT_SSH_USER:-root}
export PLAYWRIGHT_SSH_PASSWORD=${PLAYWRIGHT_SSH_PASSWORD:-Password1}
export PLAYWRIGHT_ARTIFACT_DIR=/drone/src/artifact/${ARTIFACT_SUBDIR}

while ! apt-get update; do
  sleep 1
  echo "retry"
done
while ! apt-get install -y sshpass openssh-client curl; do
  sleep 1
  echo "retry"
done
npm ci --no-audit --no-fund

for project in desktop mobile; do
  PLAYWRIGHT_PROJECT=${project} npx playwright test --project=${project} "$SPEC"
done
