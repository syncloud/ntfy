#!/bin/bash -xe

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

NAME=$1
VERSION=$(cat ${DIR}/version)
ARCH=$(dpkg --print-architecture)
SNAP_DIR=${DIR}/build/snap

while ! apt update; do
  sleep 1
  echo "retry"
done
while ! apt -y install squashfs-tools; do
  sleep 1
  echo "retry"
done

cp -r ${DIR}/bin/* ${SNAP_DIR}/bin
cp -r ${DIR}/config ${SNAP_DIR}
cp -r ${DIR}/meta ${SNAP_DIR}

mkdir ${SNAP_DIR}/META
echo ${NAME} >> ${SNAP_DIR}/META/app
echo ${VERSION} >> ${SNAP_DIR}/META/version

echo "version: $VERSION" >> ${SNAP_DIR}/meta/snap.yaml
echo "architectures:" >> ${SNAP_DIR}/meta/snap.yaml
echo "- ${ARCH}" >> ${SNAP_DIR}/meta/snap.yaml

PACKAGE=${NAME}_${VERSION}_${ARCH}.snap
echo ${PACKAGE} > ${DIR}/package.name
mksquashfs ${SNAP_DIR} ${DIR}/${PACKAGE} -noappend -comp xz -no-xattrs -all-root
mkdir ${DIR}/artifact
cp ${DIR}/${PACKAGE} ${DIR}/artifact
