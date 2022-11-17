#!/bin/bash

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]:-$0}"; )" &> /dev/null && pwd 2> /dev/null; )";

export $(grep -v '^#' $SCRIPT_DIR/../../.env | xargs -d '\r' | xargs -d '\n') > /dev/null

GITHUB_ACTOR="${GITHUB_ACTOR:-hpcc-systems}"
GITHUB_TOKEN="${GITHUB_TOKEN:-none}"
GITHUB_REF=$(git rev-parse --short=8 HEAD)
cd vcpkg
VCPKG_REF=$(git rev-parse --short=8 HEAD)
cd ..
DOCKER_USERNAME="${DOCKER_USERNAME:-hpccbuilds}"
DOCKER_PASSWORD="${DOCKER_PASSWORD:-none}"

echo "GITHUB_ACTOR: $GITHUB_ACTOR"
echo "GITHUB_TOKEN: $GITHUB_TOKEN"
echo "GITHUB_REF: $GITHUB_REF"
echo "VCPKG_REF: $VCPKG_REF"
echo "DOCKER_USERNAME: $DOCKER_USERNAME"
echo "DOCKER_PASSWORD: $DOCKER_PASSWORD"

docker login -u $DOCKER_USERNAME -p $DOCKER_PASSWORD

# docker build --progress plain --pull --rm -f "$SCRIPT_DIR/centos-7.dockerfile" -t $DOCKER_USERNAME/vcpkg-centos-7:$GITHUB_REF "$SCRIPT_DIR/../.." \
#     --build-arg GITHUB_ACTOR=$GITHUB_ACTOR \
#     --build-arg GITHUB_TOKEN=$GITHUB_TOKEN
# docker push $DOCKER_USERNAME/vcpkg-centos-7:$GITHUB_REF

# docker build --progress plain --pull --rm -f "$SCRIPT_DIR/centos-8.dockerfile" -t $DOCKER_USERNAME/vcpkg-centos-8:$GITHUB_REF "$SCRIPT_DIR/../.." \
#     --build-arg GITHUB_ACTOR=$GITHUB_ACTOR \
#     --build-arg GITHUB_TOKEN=$GITHUB_TOKEN
# docker push $DOCKER_USERNAME/vcpkg-centos-8:$GITHUB_REF

# docker build --progress plain --pull --rm -f "$SCRIPT_DIR/ubuntu-18.04.dockerfile" -t $DOCKER_USERNAME/vcpkg-ubuntu-18.04:$GITHUB_REF "$SCRIPT_DIR/../.." \
#     --build-arg GITHUB_ACTOR=$GITHUB_ACTOR \
#     --build-arg GITHUB_TOKEN=$GITHUB_TOKEN
# docker push $DOCKER_USERNAME/vcpkg-ubuntu-18.04:$GITHUB_REF

# docker build --progress plain --pull --rm -f "$SCRIPT_DIR/ubuntu-20.04.dockerfile" -t $DOCKER_USERNAME/vcpkg-ubuntu-20.04:$GITHUB_REF "$SCRIPT_DIR/../.." \
#     --build-arg GITHUB_ACTOR=$GITHUB_ACTOR \
#     --build-arg GITHUB_TOKEN=$GITHUB_TOKEN
# docker push $DOCKER_USERNAME/vcpkg-ubuntu-20.04:$GITHUB_REF

docker build --progress plain --pull --rm -f "$SCRIPT_DIR/ubuntu-22.04.dockerfile" -t vcpkg-ubuntu-22.04:latest "$SCRIPT_DIR" \
    --build-arg VCPKG_IMAGE=hpccbuilds/vcpkg-ubuntu-22.04:$VCPKG_REF

docker run -it --mount source="$(pwd)",target=/hpcc-dev/HPCC-Platform,type=bind,consistency=cached vcpkg-ubuntu-22.04:latest 

# docker push $DOCKER_USERNAME/vcpkg-ubuntu-22.04:$GITHUB_REF
