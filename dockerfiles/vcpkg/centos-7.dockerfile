ARG VCPKG_REF=latest
FROM hpccbuilds/vcpkg-centos-7:$VCPKG_REF

RUN yum install -y \
    libevent-devel \
    libmemcached-devel \
    numactl-devel \
    java-11-openjdk-devel \
    python3-devel 

WORKDIR /hpcc-dev

COPY ./startup.sh ./startup.sh

ENTRYPOINT ["/bin/bash", "--login", "-c", "./startup.sh"]
