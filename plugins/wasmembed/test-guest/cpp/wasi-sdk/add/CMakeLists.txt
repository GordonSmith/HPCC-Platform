project(add)

# add_definitions(-D_WASI_EMULATED_SIGNAL)
# add_link_options(-lwasi-emulated-signal)

# set(CMAKE_TOOLCHAIN_FILE "${WASI_SDK_PREFIX}/share/cmake/wasi-sdk.cmake")
# set(CMAKE_SYSROOT "${WASI_SDK_PREFIX}/share/wasi-sysroot")

set(CMAKE_EXECUTABLE_SUFFIX ".wasm")
set(CMAKE_SHARED_LIBRARY_SUFFIX ".wasm")

# set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -nostartfiles -fno-exceptions --sysroot=${WASI_SDK_PREFIX}/share/wasi-sysroot")
# set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -Wl,--no-entry -Wl,--export-all")

set(CMAKE_EXECUTABLE_SUFFIX ".wasm")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -nostartfiles -fno-exceptions --sysroot=${WASI_SDK_PREFIX}/share/wasi-sysroot -Wl,--no-entry")

include_directories(
    ${WIT_OUTPUT_DIR}
)

add_executable(add
    main.cpp
    ${WIT_OUTPUT_DIR}/wit/test.c
)

target_link_libraries(add
    ${WIT_OUTPUT_DIR}/wit/test_component_type.o
)

# add_custom_command(
#     TARGET add POST_BUILD
#     COMMAND wasm-tools component new ${CMAKE_CURRENT_BINARY_DIR}/add.wasm -o ${CMAKE_CURRENT_BINARY_DIR}/add.component.wasm --adapt wasi_snapshot_preview1=${WIT_BINDGEN_PREFIX}/wasi_preview1_component_adapter.reactor.wasm
#     # COMMAND npx jco transpile ${CMAKE_CURRENT_BINARY_DIR}/test.component.wasm -o ${CMAKE_CURRENT_BINARY_DIR}/js --wasi-shim --map wasi-*=@bytecodealliance/preview2-shim/* --map print=../../../../src-components/test/logger.js 
# )
# set_property(SOURCE main.cpp APPEND PROPERTY OBJECT_DEPENDS ${WIT_OUTPUT_DIR}/wit/test.c)

# Install the target and export the target information
install(TARGETS add
    EXPORT addConfig
    RUNTIME DESTINATION bin
)

# Export the target information to a file
install(EXPORT addConfig
    FILE addConfig.cmake
    NAMESPACE add::
    DESTINATION lib/cmake/add
)
