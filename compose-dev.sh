#!/bin/bash

CONTAINER_ALREADY_STARTED="build-test/CMakeCache.txt"
if [ ! -e $CONTAINER_ALREADY_STARTED ]; then
    mkdir -p build-test
    cp /hpcc-dev/vcpkg_installed ./build-test
    git submodule update --init --recursive
    cmake -S . -B build-test -G Ninja -DCONTAINERIZED=OFF -DUSE_OPTIONAL=OFF -DUSE_CPPUNIT=ON -DINCLUDE_PLUGINS=ON -DSUPPRESS_V8EMBED=ON
    echo "-- First container startup --"
else
    echo "-- Not first container startup --"
fi
