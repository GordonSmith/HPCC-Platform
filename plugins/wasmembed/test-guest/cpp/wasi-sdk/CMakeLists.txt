cmake_minimum_required(VERSION 3.22)

# set(WASI_SDK_PREFIX ${CMAKE_CURRENT_SOURCE_DIR}/wasi-sdk-20.0)
# set(CMAKE_TOOLCHAIN_FILE "${WASI_SDK_PREFIX}/share/cmake/wasi-sdk.cmake")
# set(CMAKE_SYSROOT "${WASI_SDK_PREFIX}/share/wasi-sysroot")

project(wasi-sdk)



# set(VCPKG_ROOT ${REPO_DIR}/vcpkg)
# set(VCPKG_TARGET_TRIPLET wasm32-emscripten)
# set(VCPKG_INSTALLED_DIR ${VCPKG_ROOT}/vcpkg-installed_wasm/${VCPKG_TARGET_TRIPLET})
# set(VCPKG_INCLUDE_DIR ${VCPKG_INSTALLED_DIR}/include)
# set(VCPKG_LIB_DIR ${VCPKG_INSTALLED_DIR}/lib)
# set(VCPKG_SHARE_DIR ${VCPKG_INSTALLED_DIR}/share)

add_subdirectory(add)
add_subdirectory(test)
