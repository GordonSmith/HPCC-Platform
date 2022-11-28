ARG VCPKG_REF=latest
FROM hpccbuilds/vcpkg-centos-8:$VCPKG_REF

RUN dnf config-manager --set-enabled powertools

RUN yum remove -y java-1.*

RUN yum install -y \
    libevent-devel \
    libmemcached-devel \
    numactl-devel \
    java-11-openjdk-devel \
    python3-devel 
# yum install -y libevent-devel numactl-devel java-11-openjdk-devel python3-devel 

WORKDIR /hpcc-dev

ENV OS=centos-8
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
    -DCPACK_THREADS=0 \
    -DCPACK_STRIP_FILES=ON\
    "

ENTRYPOINT ["/bin/bash", "--login", "-c", \
    "mkdir -p ${BUILD_FOLDER} && \
    cp -R /hpcc-dev/build/* $BUILD_FOLDER && \
    cmake -S ${SOURCE_FOLDER} -B ${BUILD_FOLDER} ${CMAKEOPTS} && \
    cmake --build ${BUILD_FOLDER} --target package -- -j" \
    ]
