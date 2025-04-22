#!/bin/bash

CURRENT_DIR="$(pwd)"
FULL_PATH_TO_SCRIPT="$(realpath "${BASH_SOURCE[-1]}")"
SCRIPT_DIRECTORY="$(dirname "$FULL_PATH_TO_SCRIPT")"
echo "SCRIPT_DIRECTORY: ${SCRIPT_DIRECTORY}"

# List of current vertsion can be found in https://github.com/emscripten-core/emsdk/tags  ---
# UPDATE README.md
VERSION=4.0.7

cd ${SCRIPT_DIRECTORY}
if [ ! -d "${SCRIPT_DIRECTORY}/emsdk" ] 
then
    git clone https://github.com/emscripten-core/emsdk.git
fi

cd ${SCRIPT_DIRECTORY}/emsdk
git fetch
git pull
./emsdk install $VERSION-upstream
./emsdk activate $VERSION-upstream
cd ${CURRENT_DIR}
