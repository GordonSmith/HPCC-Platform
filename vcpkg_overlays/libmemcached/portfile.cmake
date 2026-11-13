set(VERSION 1.0.18)

vcpkg_download_distfile(ARCHIVE
    URLS "https://launchpad.net/libmemcached/1.0/${VERSION}/+download/libmemcached-${VERSION}.tar.gz"
    FILENAME "libmemcached-${VERSION}.tar.gz"
    SHA512 2d95fea63b8b6dc7ded42c3a88a54aad74d5a1d417af1247144dae4a88c3b639a3aabc0c2b66661ff69a7609a314efaaae236e10971af9c428a4bca0a0101585
)

vcpkg_extract_source_archive_ex(
    OUT_SOURCE_PATH SOURCE_PATH
    ARCHIVE "${ARCHIVE}"
    PATCHES 
        "permissive.patch"
)

vcpkg_configure_make(
    SOURCE_PATH "${SOURCE_PATH}"
)
vcpkg_install_make()

file(REMOVE_RECURSE "${CURRENT_PACKAGES_DIR}/debug/share")
   
file(INSTALL "${SOURCE_PATH}/COPYING" DESTINATION "${CURRENT_PACKAGES_DIR}/share/libmemcached" RENAME copyright)
