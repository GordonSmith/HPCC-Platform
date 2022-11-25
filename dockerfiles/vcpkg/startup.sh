#!/bin/bash

SOURCE_FOLDER=/hpcc-dev/HPCC-Platform
BUILD_FOLDER=$SOURCE_FOLDER/build-$OS

mkdir -p $BUILD_FOLDER
cp -R /hpcc-dev/build/* $BUILD_FOLDER
cmake -S $SOURCE_FOLDER -B $BUILD_FOLDER -DCMAKE_BUILD_TYPE=RelWithDebInfo \
    -DCONTAINERIZED=OFF \
    -DUSE_OPTIONAL=OFF \
    -DUSE_ELASTICSTACK_CLIENT=OFF \
    -DINCLUDE_PLUGINS=OFF \
    -DUSE_LIBMEMCACHED=OFF \
    -DUSE_AWS=OFF
cmake --build $BUILD_FOLDER --target package -- -j

# mkdir -p /hpcc-dev/HPCC-Platform/assets
# cp $BUILD_FOLDER/*.deb /hpcc-dev/HPCC-Platform/assets
