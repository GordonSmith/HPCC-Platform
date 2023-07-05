vcpkg_download_distfile(ARCHIVE
    URLS "https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-20/wasi-sdk-${VERSION}-linux.tar.gz"
    FILENAME "wasi-sdk-${VERSION}-linux.tar.gz"
    SHA512 ff3d368267526887534f50767ff010bd368e9c24178ab2f0cf57a8ed0b3a82fbf85986d620ab2327ac6bb3f456c65adc6edb80626a1289e630dde7e43b191b42
)

vcpkg_extract_source_archive_ex(
    OUT_SOURCE_PATH SOURCE_PATH
    ARCHIVE ${ARCHIVE}
)

file(COPY ${SOURCE_PATH}/. DESTINATION ${CURRENT_PACKAGES_DIR}/wasi-sdk)

file(REMOVE_RECURSE "${CURRENT_PACKAGES_DIR}/wasi-sdk/share/wasi-sysroot/include/net" "${CURRENT_PACKAGES_DIR}/wasi-sdk/share/wasi-sysroot/include/scsi")

# Handle copyright
file(INSTALL ${SOURCE_PATH}/share/misc/config.guess DESTINATION ${CURRENT_PACKAGES_DIR}/share/wasi-sdk RENAME copyright)
