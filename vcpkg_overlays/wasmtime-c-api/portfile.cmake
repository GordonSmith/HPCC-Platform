if (VCPKG_TARGET_IS_WINDOWS)
    vcpkg_download_distfile(ARCHIVE
        URLS "https://github.com/bytecodealliance/wasmtime/releases/download/v${VERSION}/wasmtime-v${VERSION}-x86_64-windows-c-api.zip"
        FILENAME "wasmtime-v${VERSION}-x86_64-windows-c-api.zip"
        SHA512 ff1106eece1c8dfada9d240a216a2d484f24a22657d7e0b3fc8141e843ab6aded2016cdb0f348d96bc21e4a71374e6c8f74484d8772f84c9f96cbaccdb6ef7e5
    )
elseif (VCPKG_TARGET_IS_OSX)
    if (VCPKG_TARGET_ARCHITECTURE STREQUAL "arm64")
        vcpkg_download_distfile(ARCHIVE
            URLS "https://github.com/bytecodealliance/wasmtime/releases/download/v${VERSION}/wasmtime-v${VERSION}-aarch64-macos-c-api.tar.xz"
            FILENAME "wasmtime-v${VERSION}-aarch64-macos-c-api.tar.xz"
            SHA512 2f63444ef05717ba3050baad43bb27e113e91044d7013ce7704356550afcc8b3491cc095f14bbd1b92461302f61326f56ea303109003744e7bf575ce6de50fef
        )
    elseif (VCPKG_TARGET_ARCHITECTURE STREQUAL "x64")
        vcpkg_download_distfile(ARCHIVE
            URLS "https://github.com/bytecodealliance/wasmtime/releases/download/v${VERSION}/wasmtime-v${VERSION}-x86_64-macos-c-api.tar.xz"
            FILENAME "wasmtime-v${VERSION}-x86_64-macos-c-api.tar.xz"
            SHA512 baeeb4df6690c746885da10e7b9cab2eebc470d0fcf621865e2ee1a4b12203023711053ede987f743cf7fabb44dd00d259febb4e100dab78b66a1ec06cd0fade
        )
    else()
        message(FATAL_ERROR "Unsupported macOS target architecture for wasmtime-c-api: ${VCPKG_TARGET_ARCHITECTURE}")
    endif()
elseif (VCPKG_TARGET_IS_LINUX)
    if (VCPKG_TARGET_ARCHITECTURE STREQUAL "arm64")
        vcpkg_download_distfile(ARCHIVE
            URLS "https://github.com/bytecodealliance/wasmtime/releases/download/v${VERSION}/wasmtime-v${VERSION}-aarch64-linux-c-api.tar.xz"
            FILENAME "wasmtime-v${VERSION}-aarch64-linux-c-api.tar.xz"
            SHA512 5fbb6697adf71a89ccaafb0ed959879daf8157e2433af982ebab85e75846cb7c09ce2534a479b3107d60887b4cb16d6694a53a1a6001f9fde488d67b874d78de
        )
    elseif (VCPKG_TARGET_ARCHITECTURE STREQUAL "x64")
        vcpkg_download_distfile(ARCHIVE
            URLS "https://github.com/bytecodealliance/wasmtime/releases/download/v${VERSION}/wasmtime-v${VERSION}-x86_64-linux-c-api.tar.xz"
            FILENAME "wasmtime-v${VERSION}-x86_64-linux-c-api.tar.xz"
            SHA512 85632a8b35a97ab1fdb82e0c05dc5c78bf28a307fadea3ab8ccebaf5a5299f4244508ae444d1983415bbe8958fb3b6c498c0249cf6193a21b3c62be4c462f361
        )
    else()
        message(FATAL_ERROR "Unsupported Linux target architecture for wasmtime-c-api: ${VCPKG_TARGET_ARCHITECTURE}")
    endif()
else()
    message(FATAL_ERROR "Unsupported target platform for wasmtime-c-api")
endif()

vcpkg_extract_source_archive(
    SOURCE_PATH
    ARCHIVE "${ARCHIVE}"
)

file(COPY ${SOURCE_PATH}/include/. DESTINATION ${CURRENT_PACKAGES_DIR}/include/wasmtime-c-api)
if (VCPKG_TARGET_IS_WINDOWS)
    file(GLOB wasmtime_dlls "${SOURCE_PATH}/lib/*.dll")
    file(GLOB wasmtime_libs "${SOURCE_PATH}/lib/*.lib")

    if(wasmtime_dlls)
        file(COPY ${wasmtime_dlls} DESTINATION ${CURRENT_PACKAGES_DIR}/debug/bin)
        file(COPY ${wasmtime_dlls} DESTINATION ${CURRENT_PACKAGES_DIR}/bin)
    endif()

    if(wasmtime_libs)
        file(COPY ${wasmtime_libs} DESTINATION ${CURRENT_PACKAGES_DIR}/debug/lib)
        file(COPY ${wasmtime_libs} DESTINATION ${CURRENT_PACKAGES_DIR}/lib)
    endif()
else ()
    file(COPY ${SOURCE_PATH}/lib/. DESTINATION ${CURRENT_PACKAGES_DIR}/debug/lib)
    file(COPY ${SOURCE_PATH}/lib/. DESTINATION ${CURRENT_PACKAGES_DIR}/lib)
endif ()

# Handle copyright
file(INSTALL ${SOURCE_PATH}/LICENSE DESTINATION ${CURRENT_PACKAGES_DIR}/share/wasmtime-c-api RENAME copyright)

