# https://github.com/WebAssembly/wasi-sdk/releases

if(APPLE)
    vcpkg_download_distfile(ARCHIVE
        URLS "https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-30/wasi-sdk-${VERSION}-arm64-macos.tar.gz"
        FILENAME "wasi-sdk-${VERSION}-arm64-macos.tar.gz"
        SHA512 3c02b23bfcca86d747e612fd50f84b82c0548bca6e76440c85b2f21362bc560bb8f92fd5bbbc9f38a12b0deff836d55f031de08f67eaa3011142d871e51eac33
    )
elseif(UNIX)
    vcpkg_download_distfile(ARCHIVE
        URLS "https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-30/wasi-sdk-${VERSION}-x86_64-linux.tar.gz"
        FILENAME "wasi-sdk-${VERSION}-x86_64-linux.tar.gz"
        SHA512 9b8dc1cec71aa9e870840b30f2b7307d6b48f965d50b724926745780e4e76411f5eb97e443970ecdead90a4932669cc18ae506439f22a24d06e2e8fe44d220b3
    )
elseif(WIN32)
    vcpkg_download_distfile(ARCHIVE
        URLS "https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-30/wasi-sdk-${VERSION}-x86_64-windows.tar.gz"
        FILENAME "wasi-sdk-${VERSION}-x86_64-windows.tar.gz"
        SHA512 cab3dcafc8a07da04bdbc865da86dda62881c61ce818be627c4eb344d45cffa80dcf391ae31448bc303b2404ea2f862032ab65ca5c3916a6c17f7525b0fffa37
    )
endif()

vcpkg_extract_source_archive_ex(
    OUT_SOURCE_PATH SOURCE_PATH
    ARCHIVE ${ARCHIVE}
)

file(COPY ${SOURCE_PATH}/. DESTINATION ${CURRENT_PACKAGES_DIR}/wasi-sdk)

file(REMOVE_RECURSE "${CURRENT_PACKAGES_DIR}/wasi-sdk/share/wasi-sysroot/include/net" "${CURRENT_PACKAGES_DIR}/wasi-sdk/share/wasi-sysroot/include/scsi")

# Handle copyright
file(INSTALL ${SOURCE_PATH}/share/misc/config.guess DESTINATION ${CURRENT_PACKAGES_DIR}/share/wasi-sdk RENAME copyright)
