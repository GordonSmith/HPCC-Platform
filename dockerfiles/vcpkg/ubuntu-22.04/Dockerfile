FROM hpccbuilds/vcpkg-ubuntu-22.04:bc445c2 

RUN ln -s /hpcc-dev/tools/cmake/bin/cmake /usr/local/bin/cmake

RUN apt-get update
RUN apt-get install --no-install-recommends -y \
    curl \
    zip \
    unzip \
    tar \
    git \
    bison \
    flex \
    build-essential \
    binutils-dev \
    pkg-config \
    uuid-dev \
    libtool \
    autotools-dev \
    automake 

RUN apt-get install -y ca-certificates

RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs

RUN apt-get install --no-install-recommends -y \
    libmemcached-dev \
    libnuma-dev \
    libssl-dev

RUN apt-get install --no-install-recommends -y \
    default-jdk \
    python3-dev

# RUN sudo apt-get install -y bison flex build-essential binutils-dev libldap2-dev libcppunit-dev libicu-dev libxslt1-dev \
#             zlib1g-dev libboost-regex-dev libarchive-dev libv8-dev default-jdk libapr1-dev libaprutil1-dev libiberty-dev \
#             libhiredis-dev libtbb-dev libxalan-c-dev libnuma-dev libevent-dev libatlas-base-dev libblas-dev python3-dev \
#             default-libmysqlclient-dev libsqlite3-dev libmemcached-dev libcurl4-openssl-dev pkg-config uuid-dev libtool autotools-dev automake \
#             libssl-dev xmlstarlet libncurses-dev

