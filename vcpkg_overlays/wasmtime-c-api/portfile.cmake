vcpkg_download_distfile(ARCHIVE
    URLS "https://github.com/bytecodealliance/wasmtime/releases/download/v${VERSION}/wasmtime-v${VERSION}-x86_64-linux-c-api.tar.xz"
    FILENAME "wasmtime-v${VERSION}-x86_64-linux-c-api.tar.xz"
    SHA512 cbbd9c950a60850d553e98e5ca8363cbb7d9c0b5b9d1e42756f48e6b8b86bf3263495a62c78b211390e9c322d81dea6930afa4269c82015c4dc6d9c1effd48c6
)

vcpkg_extract_source_archive_ex(
    OUT_SOURCE_PATH SOURCE_PATH
    ARCHIVE ${ARCHIVE}
)

file(COPY ${SOURCE_PATH}/include/. DESTINATION ${CURRENT_PACKAGES_DIR}/include/wasmtime-c-api)
file(COPY ${SOURCE_PATH}/lib/. DESTINATION ${CURRENT_PACKAGES_DIR}/debug/lib)
file(COPY ${SOURCE_PATH}/lib/. DESTINATION ${CURRENT_PACKAGES_DIR}/lib)

# # Handle copyright
file(INSTALL ${SOURCE_PATH}/LICENSE DESTINATION ${CURRENT_PACKAGES_DIR}/share/wasmtime-c-api RENAME copyright)

