#!/bin/bash

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]:-$0}"; )" &> /dev/null && pwd 2> /dev/null; )";

export $(grep -v '^#' $SCRIPT_DIR/../../.env | xargs -d '\r' | xargs -d '\n')

GITHUB_ACTOR="${GITHUB_ACTOR:-hpcc-systems}"
GITHUB_TOKEN="${GITHUB_TOKEN:-none}"

# !!!  Execute from repo root !!! 

docker build --progress plain --pull --rm -f "$SCRIPT_DIR\Dockerfile" -t centos-8:latest \
    --build-arg GITHUB_ACTOR=$GITHUB_ACTOR \
    --build-arg GITHUB_TOKEN=$GITHUB_TOKEN \
    --build-arg BUILD_TAG=candidate-8.8.x \
    --build-arg BUILD_TYPE=Release \
    "dockerfiles\platform-build-centos-8"
