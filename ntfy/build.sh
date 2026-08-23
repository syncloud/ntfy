#!/bin/bash -xe

DIR=$( cd "$( dirname "$0" )" && pwd )

BUILD_DIR=${DIR}/../build/snap
SRC_DIR=${DIR}/../build/ntfy-src

while ! apt-get update; do
  sleep 1
  echo "retry"
done
while ! apt-get install -y musl-tools musl-dev; do
  sleep 1
  echo "retry"
done

cd ${SRC_DIR}
COMMIT=$(git rev-parse --short HEAD)

mkdir -p ${BUILD_DIR}/bin
CGO_ENABLED=1 CC=musl-gcc go build \
    -o ${BUILD_DIR}/bin/ntfy \
    -tags sqlite_omit_load_extension,osusergo,netgo \
    -ldflags "-linkmode=external -extldflags=-static -s -w -X main.version=${COMMIT} -X main.commit=${COMMIT} -X main.date=$(date +%s)"

${BUILD_DIR}/bin/ntfy --version
