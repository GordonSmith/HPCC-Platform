# Common Ambient Variables:
# CURRENT_BUILDTREES_DIR    = ${VCPKG_ROOT_DIR}\buildtrees\${PORT}
# CURRENT_PACKAGES_DIR      = ${VCPKG_ROOT_DIR}\packages\${PORT}_${TARGET_TRIPLET}
# CURRENT_PORT_DIR          = ${VCPKG_ROOT_DIR}\ports\${PORT}
# CURRENT_INSTALLED_DIR     = ${VCPKG_ROOT_DIR}\installed\${TRIPLET}
# DOWNLOADS                 = ${VCPKG_ROOT_DIR}\downloads
# PORT                      = current port name (zlib, etc)
# TARGET_TRIPLET            = current triplet (x86-windows, x64-windows-static, etc)
# VCPKG_CRT_LINKAGE         = C runtime linkage type (static, dynamic)
# VCPKG_LIBRARY_LINKAGE     = target library linkage type (static, dynamic)
# VCPKG_ROOT_DIR            = <C:\path\to\current\vcpkg>
# VCPKG_TARGET_ARCHITECTURE = target architecture (x64, x86, arm)
# VCPKG_TOOLCHAIN           = ON OFF
# TRIPLET_SYSTEM_ARCH       = arm x86 x64
# BUILD_ARCH                = "Win32" "x64" "ARM"
# MSBUILD_PLATFORM          = "Win32"/"x64"/${TRIPLET_SYSTEM_ARCH}
# DEBUG_CONFIG              = "Debug Static" "Debug Dll"
# RELEASE_CONFIG            = "Release Static"" "Release DLL"
# VCPKG_TARGET_IS_WINDOWS
# VCPKG_TARGET_IS_UWP
# VCPKG_TARGET_IS_LINUX
# VCPKG_TARGET_IS_OSX
# VCPKG_TARGET_IS_FREEBSD
# VCPKG_TARGET_IS_ANDROID
# VCPKG_TARGET_IS_MINGW
# VCPKG_TARGET_EXECUTABLE_SUFFIX
# VCPKG_TARGET_STATIC_LIBRARY_SUFFIX
# VCPKG_TARGET_SHARED_LIBRARY_SUFFIX
#
# See additional helpful variables in /docs/maintainers/vcpkg_common_definitions.md

vcpkg_from_github(
    OUT_SOURCE_PATH SOURCE_PATH
    REPO datastax/cpp-driver
    REF 2.16.2
    SHA512 86607e9dcfe82b2ab9fb8a43c66dfd082e18bd09edcc71e73e23d44f9e21babb313cfbfc936125babcacc2e066b4723c79c101493d52791fd0bbb1566b34ddf3
    HEAD_REF master
    PATCHES
        appleclang-support.patch
        msvc-arm64-byteorder.patch
)

file(COPY ${CMAKE_CURRENT_LIST_DIR}/cmake/Dependencies.cmake DESTINATION ${SOURCE_PATH}/cmake)
string(COMPARE EQUAL "${VCPKG_LIBRARY_LINKAGE}" "dynamic" CASS_BUILD_SHARED)
string(COMPARE EQUAL "${VCPKG_LIBRARY_LINKAGE}" "static" CASS_BUILD_STATIC)

vcpkg_cmake_configure(
    SOURCE_PATH "${SOURCE_PATH}"
    DISABLE_PARALLEL_CONFIGURE

    OPTIONS
        -DCASS_BUILD_SHARED:BOOL=${CASS_BUILD_SHARED}
        -DCASS_BUILD_STATIC:BOOL=${CASS_BUILD_STATIC}
)

vcpkg_cmake_install()

file(REMOVE_RECURSE "${CURRENT_PACKAGES_DIR}/debug/include")

file(INSTALL "${SOURCE_PATH}/LICENSE.txt" DESTINATION "${CURRENT_PACKAGES_DIR}/share/cpp-driver" RENAME copyright)
