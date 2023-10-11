#!/bin/bash

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]:-$0}"; )" &> /dev/null && pwd 2> /dev/null; )"
ROOT_DIR="$SCRIPT_DIR/../../../../"

echo "SCRIPT_DIR: $SCRIPT_DIR"
echo "ROOT_DIR: $ROOT_DIR"

docker build --progress plain -f "$ROOT_DIR/dockerfiles/wasm32-wasi/Dockerfile" \
    -t wasm32-wasi:latest \
    "$SCRIPT_DIR/."

CMAKE_OPTIONS="-G Ninja -DCMAKE_BUILD_TYPE=MinSizeRel -DCMAKE_TOOLCHAIN_FILE=/hpcc-dev/wasi-sdk/share/cmake/wasi-sdk.cmake -DWASI_SDK_PREFIX=/hpcc-dev/wasi-sdk"

docker run --rm \
    --mount source="$SCRIPT_DIR",target=/hpcc-dev/wasmembed,type=bind,consistency=cached \
    wasm32-wasi:latest \
    "rm -rf ./build && \
    cmake -S . -B ${ROOT_DIR}/build-wasmembed ${CMAKE_OPTIONS} && \
    cmake --build ${ROOT_DIR}/build-wasmembed --target install"

echo "docker run -it --mount source=\"$SCRIPT_DIR\",target=/hpcc-dev/wasmembed,type=bind,consistency=cached  wasm32-wasi:latest bash"
