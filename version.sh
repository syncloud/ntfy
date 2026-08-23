#!/bin/bash -xe

DIR=$( cd "$( dirname "$0" )" && pwd )

echo ${DRONE_BUILD_NUMBER} > ${DIR}/version
