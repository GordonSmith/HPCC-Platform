ARG VCPKG_REF=hpcc-platform-9.2.x
FROM hpccsystems/platform-build-base-ubuntu-22.04:$VCPKG_REF

RUN apt-get update && apt-get install --no-install-recommends -y \
    default-jdk \
    ninja-build \
    python3-dev \
    rsync \
    fop \
    libsaxonb-java \
    r-base \
    r-cran-rcpp \
    r-cran-rinside \
    r-cran-inline

RUN git config --global --add safe.directory '*'

WORKDIR /hpcc-dev

ENTRYPOINT ["/compose-dev.sh"]
