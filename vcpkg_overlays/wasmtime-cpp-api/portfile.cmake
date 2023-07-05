vcpkg_download_distfile(ARCHIVE
    URLS "https://github.com/bytecodealliance/wasmtime-cpp/archive/refs/tags/v${VERSION}.tar.gz"
    FILENAME "v${VERSION}.tar.gz"
    SHA512 884d6c885d2e4860fb4775467cbe42e38a5b047f54a91bc2b4232be68045a33e747bc7a7bca8629c262b438168d1dbd796d50232b74272f14a4d8a25acb15c6a
)

vcpkg_extract_source_archive_ex(
    OUT_SOURCE_PATH SOURCE_PATH
    ARCHIVE ${ARCHIVE}
)

file(COPY ${SOURCE_PATH}/include/. DESTINATION ${CURRENT_PACKAGES_DIR}/include/wasmtime-cpp-api)

# # Handle copyright
file(INSTALL ${SOURCE_PATH}/LICENSE DESTINATION ${CURRENT_PACKAGES_DIR}/share/wasmtime-cpp-api RENAME copyright)

