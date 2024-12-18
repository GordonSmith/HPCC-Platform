if (WIN32)
    vcpkg_download_distfile(ARCHIVE
        URLS "https://github.com/bytecodealliance/wasmtime/releases/download/v${VERSION}/wasmtime-v${VERSION}-x86_64-windows-c-api.zip"
        FILENAME "wasmtime-v${VERSION}-x86_64-windows-c-api.zip"
        SHA512 0
    )
elseif (APPLE)
    vcpkg_download_distfile(ARCHIVE
        URLS "https://github.com/bytecodealliance/wasmtime/releases/download/v${VERSION}/wasmtime-v${VERSION}-x86_64-macos-c-api.tar.xz"
        FILENAME "wasmtime-v${VERSION}-x86_64-macos-c-api.tar.xz"
        SHA512 0
    )
elseif (LINUX)
    vcpkg_download_distfile(ARCHIVE
        URLS "https://github.com/bytecodealliance/wasmtime/releases/download/v${VERSION}/wasmtime-v${VERSION}-x86_64-linux-c-api.tar.xz"
        FILENAME "wasmtime-v${VERSION}-x86_64-linux-c-api.tar.xz"
        SHA512 c0fce5306b74d04680dc1856232d78ab5b22ec6b6c921a62831273541024a55d65799bbb61423e218e3e924536dab20de7286915367fcadc8ec74eab03a788b8
    )
endif()

vcpkg_extract_source_archive_ex(
    OUT_SOURCE_PATH SOURCE_PATH
    ARCHIVE ${ARCHIVE}
)

file(COPY ${SOURCE_PATH}/include/. DESTINATION ${CURRENT_PACKAGES_DIR}/include/wasmtime-c-api)
if (WIN32)
    file(COPY ${SOURCE_PATH}/lib/. DESTINATION ${CURRENT_PACKAGES_DIR}/debug/bin)
    file(COPY ${SOURCE_PATH}/lib/. DESTINATION ${CURRENT_PACKAGES_DIR}/bin)
else ()
    file(COPY ${SOURCE_PATH}/lib/. DESTINATION ${CURRENT_PACKAGES_DIR}/debug/lib)
    file(COPY ${SOURCE_PATH}/lib/. DESTINATION ${CURRENT_PACKAGES_DIR}/lib)
endif ()

# Handle copyright
file(INSTALL ${SOURCE_PATH}/LICENSE DESTINATION ${CURRENT_PACKAGES_DIR}/share/wasmtime-c-api RENAME copyright)

