project(component-model)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# find_package(ICU REQUIRED COMPONENTS uc i18n io)

set(SRC
    src/boolean.cpp
    src/boolean.hpp
    src/context.hpp
    src/context.cpp
    src/flags.hpp
    src/float.hpp
    src/float.cpp
    src/integer.hpp
    src/integer.cpp
    src/list.hpp
    src/list.cpp
    src/load.hpp
    src/load.cpp
    src/string.hpp
    src/string.cpp
    src/traits.hpp
    src/traits.cpp
    src/variant.hpp
    src/variant.cpp
    src/util.hpp
    src/util.cpp
)

add_library(${PROJECT_NAME} STATIC ${SRC})

# target_include_directories(${PROJECT_NAME}
#     PRIVATE ${ICU_INCLUDE_DIR}
# )

# target_link_libraries(${PROJECT_NAME} 
#     PRIVATE ${ICU_LIBRARIES}
# )

set_target_properties(${PROJECT_NAME} PROPERTIES CXX_STANDARD 20)
# target_compile_options(${PROJECT_NAME} PUBLIC "$<$<COMPILE_LANG_AND_ID:CXX,MSVC>:/permissive->")

add_subdirectory(tests)