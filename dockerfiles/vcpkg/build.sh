#!/bin/bash
set -e

# Default values
force_config=false
full_reset=false

# Function to display help message
function show_help {
  echo "Usage: $0 [options]"
  echo "Options:"
  echo "  -f, --force        Force CMake configuration"
  echo "  -r, --reset        Full reset of build environment"
  echo "  --help             Display this help message"
  exit 0
}

# Parse command-line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -f|--force)
      force_config=true
      shift ;;
    -r|--reset)
      full_reset=true
      shift ;;
    --help)
      show_help ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help to see the available options."
      exit 1 ;;
  esac
done

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]:-$0}"; )" &> /dev/null && pwd 2> /dev/null; )";
ROOT_DIR=$(git rev-parse --show-toplevel)

export $(grep -v '^#' $ROOT_DIR/.env | sed -e 's/\r$//' | xargs) > /dev/null

GITHUB_ACTOR="${GITHUB_ACTOR:-hpcc-systems}"
GITHUB_TOKEN="${GITHUB_TOKEN:-none}"
GITHUB_REF=$(git rev-parse --short=8 HEAD)
GITHUB_BRANCH=$(git branch --show-current)

pushd $ROOT_DIR/vcpkg
VCPKG_REF=$(git rev-parse --short=8 HEAD)
popd
DOCKER_USERNAME="${DOCKER_USERNAME:-hpccbuilds}"
DOCKER_PASSWORD="${DOCKER_PASSWORD:-none}"

echo "SCRIPT_DIR: $SCRIPT_DIR"
echo "ROOT_DIR: $ROOT_DIR"
echo "GITHUB_ACTOR: $GITHUB_ACTOR"
echo "GITHUB_TOKEN: $GITHUB_TOKEN"
echo "GITHUB_REF: $GITHUB_REF"
echo "GITHUB_BRANCH: $GITHUB_BRANCH"
echo "VCPKG_REF: $VCPKG_REF"
echo "DOCKER_USERNAME: $DOCKER_USERNAME"
echo "DOCKER_PASSWORD: $DOCKER_PASSWORD"

# docker login -u $DOCKER_USERNAME -p $DOCKER_PASSWORD

CMAKE_OPTIONS="-G Ninja -DCMAKE_BUILD_TYPE=Debug -DVCPKG_FILES_DIR=/hpcc-dev -DCPACK_THREADS=0 -DUSE_OPTIONAL=OFF -DCONTAINERIZED=ON -DINCLUDE_PLUGINS=ON -DSUPPRESS_V8EMBED=ON"
CMAKE_CONFIGURE="cmake -S /hpcc-dev/HPCC-Platform -B /hpcc-dev/build ${CMAKE_OPTIONS}"

function doBuild() {

    echo "  --- Create Build Image: $1 ---"
    docker build --rm -f "$SCRIPT_DIR/$1.dockerfile" \
        -t build-$1:$GITHUB_REF \
        -t build-$1:latest \
        --build-arg DOCKER_NAMESPACE=$DOCKER_USERNAME \
        --build-arg VCPKG_REF=$VCPKG_REF \
            "$SCRIPT_DIR/." 

    echo "  --- Create Platform Core ---"
    docker build --rm -f "$SCRIPT_DIR/platform-core.dockerfile" \
        -t platform-core:$GITHUB_REF \
        -t platform-core:latest \
            "$SCRIPT_DIR/." 

    if [ "$full_reset" = true ]; then
        docker volume rm hpcc_src hpcc_build hpcc_opt || true
    fi

    echo "  --- rsync ---"
    if ! docker volume ls -q -f name=hpcc_src | grep -q hpcc_src; then
        echo "  --- git reset ---"
        docker run --rm \
            --mount source=hpcc_src,target=/hpcc-dev/HPCC-Platform,type=volume \
            --mount source="$ROOT_DIR/.git",target=/hpcc-dev/HPCC-Platform/.git,type=bind \
            build-$1:$GITHUB_REF \
                "cd /hpcc-dev/HPCC-Platform && \
                git reset --hard --recurse-submodules"
    fi

    docker run --rm \
        --mount source=hpcc_src,target=/hpcc-dev/HPCC-Platform,type=volume \
        --mount source="$ROOT_DIR/.git",target=/hpcc-dev/HPCC-Platform/.git,type=bind \
        build-$1:$GITHUB_REF \
            "cd /hpcc-dev/HPCC-Platform && \
            git ls-files --modified --exclude-standard" > rsync_include.txt

    pushd $ROOT_DIR
    git ls-files --modified --exclude-standard >> rsync_include.txt
    while read file; do 
        if [ -f "$file" ]; then
            md5sum "$file" | cut -d ' ' -f 1 >> tmp.txt
        fi
    done < rsync_include.txt
    CRC=$(md5sum tmp.txt | cut -d ' ' -f 1)
    rm tmp.txt
    GITHUB_BRANCH="$GITHUB_BRANCH-$CRC"
    echo "GITHUB_BRANCH: $GITHUB_BRANCH"
    popd

    image_count=$(docker images --quiet hpccsystems/platform-core:$GITHUB_BRANCH | wc -l)
    if [ $image_count -gt 0 ]; then
        echo "--- Image already exists  ---"
        echo "docker run --entrypoint /bin/bash -it hpccsystems/platform-core:$GITHUB_BRANCH"
        echo "hpccsystems/platform-core:$GITHUB_BRANCH"
        exit 0
    fi

    docker run --rm \
        --mount source=$ROOT_DIR,target=/hpcc-dev/HPCC-Platform-local,type=bind,readonly \
        --mount source=hpcc_src,target=/hpcc-dev/HPCC-Platform,type=volume \
        --mount source="$ROOT_DIR/.git",target=/hpcc-dev/HPCC-Platform/.git,type=bind \
        build-$1:$GITHUB_REF "\
            cd /hpcc-dev/HPCC-Platform && \
            rsync -av --files-from=/hpcc-dev/HPCC-Platform-local/rsync_include.txt /hpcc-dev/HPCC-Platform-local/ /hpcc-dev/HPCC-Platform/ && 
            git submodule update --init --recursive"
     
    if [ "$force_config" = true ]; then
        echo "  --- clean cmake config ---"
        docker run --rm \
            --mount source=hpcc_src,target=/hpcc-dev/HPCC-Platform,type=volume \
            --mount source=hpcc_build,target=/hpcc-dev/build,type=volume \
            build-$1:$GITHUB_REF \
                "cd /hpcc-dev/HPCC-Platform && \
                rm -rf /hpcc-dev/HPCC-Platform/vcpkg/vcpkg && \
                rm -rf /hpcc-dev/build/CMakeCache.txt CMakeFiles"
    fi

    if [ "$force_config" = true ] || ! docker volume ls | awk '{print $2}' | grep -q "^hpcc_build$"; then
        echo "  --- cmake config ---"
        docker run --rm \
            --mount source=hpcc_src,target=/hpcc-dev/HPCC-Platform,type=volume \
            --mount source=hpcc_build,target=/hpcc-dev/build,type=volume \
            build-$1:$GITHUB_REF \
                "cd /hpcc-dev/HPCC-Platform && ${CMAKE_CONFIGURE}"
    fi

    echo "  --- build ---"
    docker run --rm \
        --mount source=hpcc_src,target=/hpcc-dev/HPCC-Platform,type=volume \
        --mount source=hpcc_build,target=/hpcc-dev/build,type=volume \
        --mount source=hpcc_opt,target=/opt,type=volume \
        build-$1:$GITHUB_REF \
            "cd /hpcc-dev/HPCC-Platform && cmake --build /hpcc-dev/build --parallel --target install"

    echo "  --- Update opt contents ---"
    docker run --name temp-$GITHUB_BRANCH \
        --mount source=hpcc_opt,target=/ext,type=volume \
        --user root \
        platform-core:$GITHUB_REF /bin/bash -c "\
            cp -r /ext/* /opt/HPCCSystems && \
            eclcc -pch \
            "

    docker commit temp-$GITHUB_BRANCH hpccsystems/platform-core:$GITHUB_BRANCH
    docker rm temp-$GITHUB_BRANCH
    echo "docker run --entrypoint /bin/bash -it hpccsystems/platform-core:$GITHUB_BRANCH"
    echo "hpccsystems/platform-core:$GITHUB_BRANCH"
}

# doBuild amazonlinux
doBuild "ubuntu-22.04" 
# doBuild ubuntu-20.04
# doBuild centos-8
# doBuild centos-7

# docker build --pull --rm -f "$SCRIPT_DIR/core.dockerfile" \
#     -t $DOCKER_USERNAME/core:$GITHUB_REF \
#     -t $DOCKER_USERNAME/core:latest \
#     "build-ubuntu-22.04" 
# docker push $DOCKER_USERNAME/core:$GITHUB_REF
# docker push $DOCKER_USERNAME/core:latest

# docker run -it -d -p 8010:8010 core:latest touch /var/log/HPCCSystems/myesp/esp.log && /etc/init.d/hpcc-init start && tail -f /var/log/HPCCSystems/myesp/esp.log
