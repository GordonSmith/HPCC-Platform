vcpkg_execute_required_process(
    COMMAND cargo install wasm-tools
    WORKING_DIRECTORY ${CURRENT_BUILDTREES_DIR}
    LOGNAME build-${TARGET_TRIPLET}-dbg
)

vcpkg_execute_required_process(
    # COMMAND cargo install --git https://github.com/bytecodealliance/wit-bindgen --tag wit-bindgen-cli-${VERSION} wit-bindgen-cli 
    COMMAND cargo install --git https://github.com/bytecodealliance/wit-bindgen wit-bindgen-cli 
    WORKING_DIRECTORY ${CURRENT_BUILDTREES_DIR}
    LOGNAME build-${TARGET_TRIPLET}-dbg
)

vcpkg_download_distfile(
    COMMAND_PATH
    URLS "https://github.com/bytecodealliance/preview2-prototyping/releases/download/latest/wasi_preview1_component_adapter.command.wasm"
    FILENAME "wasi_preview1_component_adapter.command.wasm"
    SHA512 7f6145ab60066d0ad5927cf190c4411b0354a94e4580c7a0fa26b39241341aa312b802a654029eb15aa696ebb1cf93ad5bff029313481fb6950dafa126351d70
)

vcpkg_download_distfile(
    REACTOR_PATH
    URLS "https://github.com/bytecodealliance/preview2-prototyping/releases/download/latest/wasi_preview1_component_adapter.reactor.wasm"
    FILENAME "wasi_preview1_component_adapter.reactor.wasm"
    SHA512 6c53c720b2851e6bd6646ee81216ae78404abb4619f1af05f2c6b0ef51ed29580133f7ea3fc31ce6085b4086b02f9dda6824d42b3280549a4ff76efbb6161f89
)

file(COPY ${COMMAND_PATH} DESTINATION ${CURRENT_PACKAGES_DIR}/share/wit-bindgen)
file(COPY ${REACTOR_PATH} DESTINATION ${CURRENT_PACKAGES_DIR}/share/wit-bindgen)

# file(REMOVE_RECURSE "${CURRENT_PACKAGES_DIR}/wasi-sdk/share/wasi-sysroot/include/net" "${CURRENT_PACKAGES_DIR}/wasi-sdk/share/wasi-sysroot/include/scsi")

# # Handle copyright
# file(INSTALL ${SOURCE_PATH}/share/misc/config.guess DESTINATION ${CURRENT_PACKAGES_DIR}/share/wasi-sdk RENAME copyright)
