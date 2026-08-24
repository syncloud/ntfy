#!/bin/bash -xe
DIR=$(cd "$(dirname "$0")" && pwd)
cd "$DIR"
go test ./... -count=1
