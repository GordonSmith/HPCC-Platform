#!/bin/bash

cmake -S /hpcc-dev/HPCC-Platform -B /hpcc-dev/build -DCMAKE_BUILD_TYPE=RelWithDebInfo -DCONTAINERIZED=OFF -DUSE_OPTIONAL=OFF -DUSE_ELASTICSTACK_CLIENT=OFF -DINCLUDE_PLUGINS=ON -DSUPPRESS_V8EMBED=ON -DSUPPRESS_REMBED=ON -DSUPPRESS_SPARK=ON

cmake --build /hpcc-dev/build --target package -- -j

mkdir -p /hpcc-dev/HPCC-Platform/assets
cp /hpcc-dev/build/*.deb /hpcc-dev/HPCC-Platform/assets
