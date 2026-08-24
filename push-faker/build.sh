#!/bin/bash -xe
DIR=$(cd "$(dirname "$0")" && pwd)
cd "$DIR"
CGO_ENABLED=0 go build -o faker .
