project(test)

set(CMAKE_EXECUTABLE_SUFFIX ".wasm")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -nostartfiles -fno-exceptions --sysroot=${WASI_SDK_PREFIX}/share/wasi-sysroot -Wl,--no-entry")

include_directories(
    ${WIT_OUTPUT_DIR}
)

add_executable(test
    main.cpp
    ${WIT_OUTPUT_DIR}/wit/test.c
)

target_link_libraries(test
    ${WIT_OUTPUT_DIR}/wit/test_component_type.o
)

add_custom_command(
    TARGET test POST_BUILD
    COMMAND wasm-tools component new ${CMAKE_CURRENT_BINARY_DIR}/test.wasm -o ${CMAKE_CURRENT_BINARY_DIR}/test.component.wasm --adapt wasi_snapshot_preview1=${WIT_BINDGEN_PREFIX}/wasi_preview1_component_adapter.reactor.wasm
    # COMMAND npx jco transpile ${CMAKE_CURRENT_BINARY_DIR}/test.component.wasm -o ${CMAKE_CURRENT_BINARY_DIR}/js --wasi-shim --map wasi-*=@bytecodealliance/preview2-shim/* --map print=../../../../src-components/test/logger.js 
)
set_property(SOURCE main.cpp APPEND PROPERTY OBJECT_DEPENDS ${WIT_OUTPUT_DIR}/wit/test.c)

install(TARGETS test
    EXPORT addConfig
    RUNTIME DESTINATION bin
)

install(EXPORT addConfig
    FILE addConfig.cmake
    NAMESPACE add::
    DESTINATION lib/cmake/add
)
