ARG VCPKG_REF=latest
FROM hpccbuilds/vcpkg-ubuntu-18.04:$VCPKG_REF

RUN apt-get update && apt-get install --no-install-recommends -y \
    libevent-dev \
    libmemcached-dev \
    libnuma-dev \
    libssl-dev\
    default-jdk \
    python3-dev

WORKDIR /hpcc-dev

ENV OS=ubuntu-18.04
ENV SOURCE_FOLDER=/hpcc-dev/HPCC-Platform
ENV BUILD_FOLDER=$SOURCE_FOLDER/build-$OS
ENV CMAKEOPTS="\
    -DCMAKE_BUILD_TYPE=RelWithDebInfo \
    -DCONTAINERIZED=OFF \
    -DUSE_OPTIONAL=OFF \
    -DUSE_ELASTICSTACK_CLIENT=OFF \
    -DUSE_LIBMEMCACHED=OFF \
    -DUSE_AWS=OFF\
    -DINCLUDE_PLUGINS=OFF \
    -DWSSQL_SERVICE=OFF \
    -DCPACK_THREADS=0 \
    -DCPACK_STRIP_FILES=ON\
    "

ENTRYPOINT ["/bin/bash", "--login", "-c", \
    "mkdir -p ${BUILD_FOLDER} && \
    cp -R /hpcc-dev/build/* $BUILD_FOLDER && \
    cmake -S ${SOURCE_FOLDER} -B ${BUILD_FOLDER} ${CMAKEOPTS} && \
    cmake --build ${BUILD_FOLDER} --target package -- -j" \
    ]
