set(VERSION 1.0.18)

vcpkg_download_distfile(ARCHIVE
    URLS "https://github.com/awesomized/libmemcached/archive/refs/tags/${VERSION}.tar.gz"
    FILENAME "libmemcached-${VERSION}.tar.gz"
    SHA512 d3ce92de12b6042f7756f06b09baaeb620ecfcd175d412aa1ff88e5d64f52a95d9e528736c9b769ba98a6af05c980ab7564a0e398f41a42a37f4a8223aa29353
)

vcpkg_extract_source_archive_ex(
    OUT_SOURCE_PATH SOURCE_PATH
    ARCHIVE "${ARCHIVE}"
    PATCHES 
        "permissive.patch"
        "flex-2.6.5.patch"
        "no-man-install.patch"
)

vcpkg_configure_make(
    SOURCE_PATH "${SOURCE_PATH}"
)
vcpkg_install_make()

file(REMOVE_RECURSE "${CURRENT_PACKAGES_DIR}/debug/share")
   
file(INSTALL "${SOURCE_PATH}/COPYING" DESTINATION "${CURRENT_PACKAGES_DIR}/share/libmemcached" RENAME copyright)
