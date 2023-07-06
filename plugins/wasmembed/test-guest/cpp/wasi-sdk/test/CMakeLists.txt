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

install(TARGETS test
    EXPORT addConfig
    RUNTIME DESTINATION bin
)

install(EXPORT addConfig
    FILE addConfig.cmake
    NAMESPACE add::
    DESTINATION lib/cmake/add
)
