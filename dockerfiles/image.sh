#!/bin/bash
set -e

globals() {
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

    CMAKE_OPTIONS="-G Ninja -DVCPKG_FILES_DIR=/hpcc-dev -DCPACK_THREADS=$(nproc) -DUSE_OPTIONAL=OFF -DCONTAINERIZED=ON -DINCLUDE_PLUGINS=ON -DSUPPRESS_V8EMBED=ON"

    create_build_image
}

create_build_image() {
    echo "  --- Create 'build-$BUILD_OS:$GITHUB_REF' image---"
    docker build --rm -f "$SCRIPT_DIR/vcpkg/$BUILD_OS.dockerfile" \
        -t build-$BUILD_OS:$GITHUB_REF \
        -t build-$BUILD_OS:latest \
        --build-arg DOCKER_NAMESPACE=$DOCKER_USERNAME \
        --build-arg VCPKG_REF=$VCPKG_REF \
            "$SCRIPT_DIR/." 
}

create_platform_core_image() {
    local label=$1
    local base=$2
    echo "  --- Create '$label:$GITHUB_REF' image ---"
    docker build --rm -f "$SCRIPT_DIR/vcpkg/platform-core.dockerfile" \
        -t $label:$GITHUB_REF \
        -t $label:latest \
        --build-arg BASE_IMAGE=$base \
            "$SCRIPT_DIR/vcpkg/." 
}

finalize_platform_core_image() {
    local label=$1
    local crc=$2
    local cmd=$3
    echo "  --- Finalize '$label:$GITHUB_REF' image ---"
    CONTAINER=$(docker run -d \
        --mount source=hpcc_src,target=/hpcc-dev/HPCC-Platform,type=volume \
        --mount source=hpcc_build,target=/hpcc-dev/build,type=volume \
        $label:$GITHUB_REF "tail -f /dev/null")
    docker exec --user root $CONTAINER /bin/bash -c "$cmd"
    docker exec --user root $CONTAINER /bin/bash -c "eclcc -pch"
    docker commit $CONTAINER hpccsystems/$label:$GITHUB_BRANCH-$crc
    docker stop $CONTAINER
    docker rm $CONTAINER
}

clean() {
    echo "  --- Clean  ---"
    docker volume rm hpcc_src hpcc_build 2>/dev/null || true
}

run() {
    local cmd=$1
    docker run --rm \
        --mount source=$ROOT_DIR,target=/hpcc-dev/HPCC-Platform-local,type=bind,readonly \
        --mount source=hpcc_src,target=/hpcc-dev/HPCC-Platform,type=volume \
        --mount source="$ROOT_DIR/.git",target=/hpcc-dev/HPCC-Platform/.git,type=bind \
        --mount source=hpcc_build,target=/hpcc-dev/build,type=volume \
        build-$BUILD_OS:$GITHUB_REF \
            "cd /hpcc-dev/HPCC-Platform && \
            $cmd"

}

init_hpcc_src() {
    echo "  --- Init hpcc_src volume ---"
    if ! docker volume ls -q -f name=hpcc_src | grep -q hpcc_src; then
        echo "  --- git reset ---"
        run "git reset --hard --recurse-submodules"
    fi
}

reconfigure() {
    echo "  --- Clean cmake cache ---"
    init_hpcc_src
    run "rm -rf /hpcc-dev/HPCC-Platform/vcpkg/vcpkg && \
        rm -rf /hpcc-dev/build/CMakeCache.txt CMakeFiles"
}

configure() {
    local options=$1
    echo "  --- cmake config $options ---"
    run "cmake -S /hpcc-dev/HPCC-Platform -B /hpcc-dev/build $options"
}

fetch_build_type() {
    echo $(run "grep 'CMAKE_BUILD_TYPE:' /hpcc-dev/build/CMakeCache.txt | cut -d '=' -f 2")
}

calc_diffs() {
    init_hpcc_src
    echo "  --- Calc diff ---"
    run "git ls-files --modified --exclude-standard" > rsync_include.txt

    pushd $ROOT_DIR >/dev/null
    git ls-files --modified --exclude-standard >> rsync_include.txt
    echo "$GITHUB_REF" > tmp.txt
    while read file; do 
        if [ -f "$file" ]; then
            md5sum "$file" | cut -d ' ' -f 1 >> tmp.txt
        fi
    done < rsync_include.txt
    local crc=$(md5sum tmp.txt | cut -d ' ' -f 1)
    rm tmp.txt
    popd >/dev/null
    echo $crc
}

sync_files() {
    echo "  --- Sync files ---"
    run "rsync -av --files-from=/hpcc-dev/HPCC-Platform-local/rsync_include.txt /hpcc-dev/HPCC-Platform-local/ /hpcc-dev/HPCC-Platform/ && 
        git submodule update --init --recursive"
}

check_cache() {
    local label=$1
    local crc=$2
    echo "  --- Check cache ---"
    image_count=$(docker images --quiet hpccsystems/$label:$GITHUB_BRANCH-$crc | wc -l)
    if [ $image_count -gt 0 ]; then
        echo "--- Image already exists  --- "
        echo "docker run --entrypoint /bin/bash -it hpccsystems/$label:$GITHUB_BRANCH-$crc"
        echo "hpccsystems/$label:$GITHUB_BRANCH-$crc"
        exit 0
    fi
}

build() {
    if [ "$MODE" = "release" ]; then
        local label=platform-core
        local base=ubuntu:jammy-20230308
        local build_type="RelWithDebInfo"
        local cmake_options="-DCMAKE_BUILD_TYPE=$build_type -DCPACK_STRIP_FILES=ON"
    elif [ "$MODE" = "debug" ]; then
        local label=platform-core-debug
        local base=build-$BUILD_OS:$GITHUB_REF
        local build_type="Debug"
        local cmake_options="-DCMAKE_BUILD_TYPE=$build_type"
    else
        echo "Invalid build mode: $MODE"
        usage
        exit 1
    fi
    local prev_build_type=$(fetch_build_type | tail -1)
    if [ "$prev_build_type" != "$build_type" ]; then
        RECONFIGURE=1
    fi

    if [ "$RECONFIGURE" -eq 1 ]; then
        reconfigure
    fi

    create_platform_core_image $label $base

    local crc=$(calc_diffs | tail -1)
    echo "crc: $crc"

    check_cache $label $crc

    sync_files

    if [ "$RECONFIGURE" -eq 1 ] || ! docker volume ls | awk '{print $2}' | grep -q "^hpcc_build$"; then
        configure "$CMAKE_OPTIONS $cmake_options"
    fi

    if [ "$MODE" = "release" ]; then
        run "cmake --build /hpcc-dev/build --parallel --target package"
        finalize_platform_core_image $label $crc \
            "dpkg -i /hpcc-dev/build/hpccsystems-platform*.deb || true &&
            apt-get install -f -y"
    elif [ "$MODE" = "debug" ]; then
        run "cmake --build /hpcc-dev/build --parallel"
        finalize_platform_core_image $label $crc \
            "cmake --build /hpcc-dev/build --parallel --target install"
    fi

    echo "docker run --entrypoint /bin/bash -it hpccsystems/$label:$GITHUB_BRANCH-$crc"
    echo "hpccsystems/$label:$GITHUB_BRANCH-$crc"
}

incr() {
    # Add code to perform incremental build here
    echo "Incremental build completed"
}

status() {
    echo "SCRIPT_DIR: $SCRIPT_DIR"
    echo "ROOT_DIR: $ROOT_DIR"
    echo "GITHUB_ACTOR: $GITHUB_ACTOR"
    echo "GITHUB_TOKEN: $GITHUB_TOKEN"
    echo "GITHUB_REF: $GITHUB_REF"
    echo "GITHUB_BRANCH: $GITHUB_BRANCH"
    echo "VCPKG_REF: $VCPKG_REF"
    echo "DOCKER_USERNAME: $DOCKER_USERNAME"
    echo "DOCKER_PASSWORD: $DOCKER_PASSWORD"
    echo "ACTION: $ACTION"
    echo "MODE: $MODE"
    echo "RECONFIGURE: $RECONFIGURE"
    echo "BUILD_OS: $BUILD_OS"
}

# Print usage information
usage() {
    echo "Usage: $0 [-h] {clean|build|incr} [-m MODE] [-r] [OS]"
    echo "  -h, --help     display this help message"
    echo "  clean          remove all build artifacts"
    echo "  build          build the project"
    echo "  incr           perform an incremental build (faster version of 'build -m debug')"
    echo "  status         display environment variables"
    echo "  -m, --mode     specify the build mode (debug or release)"
    echo "                 default mode is release"
    echo "  -r, --reconfigure reconfigure CMake before building"
}

# Set default values
ACTION=
MODE=release
RECONFIGURE=0
BUILD_OS="ubuntu-22.04"
globals

# Parse command line arguments
while [[ $# -gt 0 ]]
do
key="$1"

case $key in
    clean)
    ACTION=clean
    shift # past argument
    ;;
    build)
    ACTION=build
    shift # past argument
    ;;
    incr)
    ACTION=incr
    shift # past argument
    ;;
    status)
    ACTION=status
    shift # past argument
    ;;
    -m|--mode)
    MODE="$2"
    shift # past argument
    shift # past value
    ;;
    -r|--reconfigure)
    RECONFIGURE=1
    shift # past argument
    ;;
    -h|--help)
    usage
    exit 0
    ;;
    *)    # unknown option
    echo "Unknown option: $key"
    usage
    exit 1
    ;;
esac
done

# Call the appropriate function based on the selected action
case $ACTION in
    clean)
    clean
    ;;
    build)
    build
    ;;
    incr)
    incr
    ;;
    status)
    status
    ;;
    *)
    echo "Invalid action selected: $ACTION"
    usage
    exit 1
    ;;
esac
