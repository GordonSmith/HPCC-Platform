ARG VCPKG_REF=latest
FROM hpccbuilds/vcpkg-ubuntu-18.04:$VCPKG_REF

RUN apt-get update && apt-get install --no-install-recommends -y \
    libmemcached-dev \
    libevent-dev \
    libnuma-dev \
    libssl-dev\
    default-jdk \
    python3-dev

WORKDIR /hpcc-dev

COPY ./startup.sh ./startup.sh

ENTRYPOINT ["./startup.sh"]
