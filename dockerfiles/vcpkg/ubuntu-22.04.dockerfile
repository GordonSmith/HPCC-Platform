ARG VCPKG_REF=latest
FROM hpccsystems/platform-build-base-ubuntu-22.04:$VCPKG_REF

RUN apt-get update && apt-get install --no-install-recommends -y \
    ccache \
    default-jdk \
    python3-dev \
    r-base \
    r-cran-rcpp \
    r-cran-rinside \
    r-cran-inline

WORKDIR /hpcc-dev

ENTRYPOINT ["/bin/bash", "--login", "-c"]
