#!/bin/bash -xe

DIR=$( cd "$( dirname "$0" )" && pwd )

REPO=https://github.com/cyberb/ntfy.git
BRANCH=auth-user-header-autocreate
SRC_DIR=${DIR}/../build/ntfy-src

rm -rf ${SRC_DIR}
git clone --depth 1 --branch ${BRANCH} ${REPO} ${SRC_DIR}

cd ${SRC_DIR}
mkdir -p server/docs

cd web
npm ci
npm run build
mv build/index.html build/app.html
rm -rf ../server/site
mv build ../server/site
rm ../server/site/config.js
