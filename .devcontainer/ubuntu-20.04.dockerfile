FROM ubuntu:20.04 AS BASE_OS

ENV DEBIAN_FRONTEND=noninteractive

RUN apt update

# Build Tools  ---
RUN apt install -y git cmake python3 curl
RUN apt install -y build-essential pkg-config autoconf libtool bison flex

RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
RUN apt install -y nodejs

# Libraries  ---
RUN apt install -y groff-base libmemcached-dev default-jdk python3-dev libnuma-dev uuid-dev

