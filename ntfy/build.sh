#!/bin/bash -xe

DIR=$( cd "$( dirname "$0" )" && pwd )
. ${DIR}/version.sh
VERSION=$1

BUILD_DIR=${DIR}/../build/snap
SRC_DIR=${DIR}/../build/ntfy-src

cd ${SRC_DIR}

mkdir -p ${BUILD_DIR}/bin
CGO_ENABLED=0 go build \
    -o ${BUILD_DIR}/bin/ntfy \
    -ldflags "-s -w -X main.version=${VERSION} -X main.commit=${BRANCH}"

${BUILD_DIR}/bin/ntfy --version
