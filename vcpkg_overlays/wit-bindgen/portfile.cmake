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
    URLS "https://github.com/bytecodealliance/wasmtime/releases/download/v10.0.1/wasi_snapshot_preview1.command.wasm"
    FILENAME "wasi_preview1_component_adapter.command.wasm"
    SHA512 57d9cdc62d1f51e807585ad1dbc43930c986f9a041c7dc00b7cafe15c07b953e88740704b43f11b16f1600db0df823adcfc66a0034f34e132b02589b0e0c9fb0
)

vcpkg_download_distfile(
    REACTOR_PATH
    URLS "https://github.com/bytecodealliance/wasmtime/releases/download/v10.0.1/wasi_snapshot_preview1.reactor.wasm"
    FILENAME "wasi_preview1_component_adapter.reactor.wasm"
    SHA512 3e5a3f36c32b63a68ead463aa18963153125a9e36ca682ded144913cbb4d01698fc943fe705c0699b61c1ba308cd7d202b087b66da3788d469c746ca7156220a
)

file(COPY ${COMMAND_PATH} DESTINATION ${CURRENT_PACKAGES_DIR}/share/wit-bindgen)
file(COPY ${REACTOR_PATH} DESTINATION ${CURRENT_PACKAGES_DIR}/share/wit-bindgen)

# file(REMOVE_RECURSE "${CURRENT_PACKAGES_DIR}/wasi-sdk/share/wasi-sysroot/include/net" "${CURRENT_PACKAGES_DIR}/wasi-sdk/share/wasi-sysroot/include/scsi")

# # Handle copyright
# file(INSTALL ${SOURCE_PATH}/share/misc/config.guess DESTINATION ${CURRENT_PACKAGES_DIR}/share/wasi-sdk RENAME copyright)
