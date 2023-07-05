add_custom_command(
    MAIN_DEPENDENCY ${CMAKE_CURRENT_SOURCE_DIR}/test.wit
    OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/cpp/wit/test.c ${CMAKE_CURRENT_BINARY_DIR}/cpp/wit/test.h ${CMAKE_CURRENT_BINARY_DIR}/cpp/wit/test_component_type.o
    COMMAND wit-bindgen markdown ${CMAKE_CURRENT_SOURCE_DIR}/test.wit
    COMMAND wit-bindgen c --out-dir ${CMAKE_CURRENT_BINARY_DIR}/cpp/wit ${CMAKE_CURRENT_SOURCE_DIR}/test.wit
    COMMAND wit-bindgen rust --ownership owning --out-dir ${CMAKE_CURRENT_BINARY_DIR}/rust/wit ${CMAKE_CURRENT_SOURCE_DIR}/test.wit
    COMMAND wit-bindgen teavm-java --out-dir ${CMAKE_CURRENT_BINARY_DIR}/java/wit ${CMAKE_CURRENT_SOURCE_DIR}/test.wit
    COMMAND wit-bindgen tiny-go --out-dir ${CMAKE_CURRENT_BINARY_DIR}/go/wit ${CMAKE_CURRENT_SOURCE_DIR}/test.wit
)
add_custom_target(wit-generate ALL DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/cpp/wit/test.c)

# add_subdirectory(AssemblyScript)
add_subdirectory(cpp)
# add_subdirectory(JavaScript)