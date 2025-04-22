#!/bin/bash

FULL_PATH_TO_SCRIPT="$(realpath "${BASH_SOURCE[-1]}")"
SCRIPT_DIRECTORY="$(dirname "$FULL_PATH_TO_SCRIPT")"

source ${SCRIPT_DIRECTORY}/emsdk/emsdk_env.sh

if [[ "$OSTYPE" == "msys" ]]; then
    /c/Program\ Files/CMake/bin/cmake "$@"
else
    /usr/bin/cmake "$@"
fi
