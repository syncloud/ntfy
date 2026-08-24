#!/bin/bash -xe

DIR=$( cd "$( dirname "$0" )" && pwd )
cd ${DIR}

DISTRO=$1
APP=$2
VERSION=$3

./deps.sh
py.test -x -s test.py --distro=${DISTRO} --ver=${VERSION} --app=${APP}
