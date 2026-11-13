vcpkg_download_distfile(ARCHIVE
    URLS "https://github.com/bytecodealliance/wasmtime-cpp/archive/refs/tags/v${VERSION}.tar.gz"
    FILENAME "v${VERSION}.tar.gz"
    SHA512 55f5b440a3ad8962806ca2327090c6c6b872c0c99fb894e909e8cabd4c345e742009e0206ba7b694e35ec02e978839ac192393ba68cfbe3b3e36263f60ac9eee
)

vcpkg_extract_source_archive_ex(
    OUT_SOURCE_PATH SOURCE_PATH
    ARCHIVE ${ARCHIVE}
)

file(COPY ${SOURCE_PATH}/include/. DESTINATION ${CURRENT_PACKAGES_DIR}/include/wasmtime-cpp-api)

# Handle copyright
file(INSTALL ${SOURCE_PATH}/LICENSE DESTINATION ${CURRENT_PACKAGES_DIR}/share/wasmtime-cpp-api RENAME copyright)
