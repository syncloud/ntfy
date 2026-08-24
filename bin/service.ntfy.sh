#!/bin/bash -e

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && cd .. && pwd )

/bin/rm -f ${SNAP_DATA}/ntfy.sock
exec ${DIR}/bin/ntfy serve --config ${SNAP_DATA}/config/server.yml
