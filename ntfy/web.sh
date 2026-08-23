#!/bin/bash -xe

DIR=$( cd "$( dirname "$0" )" && pwd )

REPO=https://github.com/cyberb/ntfy.git
BRANCH=auth-user-header-autocreate
SRC_DIR=${DIR}/../build/ntfy-src

rm -rf ${SRC_DIR}
git clone --depth 1 --branch ${BRANCH} ${REPO} ${SRC_DIR}

cd ${SRC_DIR}
mkdir -p server/docs
cat > server/docs/index.html <<'HTML'
<!doctype html>
<meta http-equiv="refresh" content="0; url=https://docs.ntfy.sh">
<a href="https://docs.ntfy.sh">ntfy documentation</a>
HTML

cd web

build_web() {
  rm -rf node_modules
  npm ci --no-audit --no-fund || return 1
  npm run build
}

attempt=0
until build_web; do
  attempt=$((attempt + 1))
  if [ ${attempt} -ge 3 ]; then
    echo "web build failed after ${attempt} attempts"
    exit 1
  fi
  echo "retry web build"
  sleep 5
done

mv build/index.html build/app.html
rm -rf ../server/site
mv build ../server/site
rm ../server/site/config.js
