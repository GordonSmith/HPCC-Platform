vcpkg_from_github(
  OUT_SOURCE_PATH SOURCE_PATH
  REPO couchbase/libcouchbase
  REF ${VERSION}
  SHA512 a0f7f18fdf9b30af1568d16f40ddfc5bf540ac3bd25f8441eb3a57231ac30a8179e1de3792a3d2eddd2193d447395c375051a6816c83ac0e86d0871900e0a856
  PATCHES
    fix-cmake4-copy-pdb.patch
  HEAD_REF master
)

vcpkg_cmake_configure(
    SOURCE_PATH "${SOURCE_PATH}"
    OPTIONS
        -DLCB_NO_TESTS=ON
        -DLCB_NO_TOOLS=ON
        -DLCB_NO_PLUGINS=ON

)
vcpkg_cmake_install()

file(REMOVE_RECURSE "${CURRENT_PACKAGES_DIR}/debug/include")
file(REMOVE_RECURSE "${CURRENT_PACKAGES_DIR}/debug/share")
   
file(INSTALL "${SOURCE_PATH}/LICENSE" DESTINATION "${CURRENT_PACKAGES_DIR}/share/${PORT}" RENAME copyright)
