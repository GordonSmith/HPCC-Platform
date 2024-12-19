project(component-model)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# find_package(fmt CONFIG REQUIRED)

set(SRC
#   component-model.cpp
    # traits.hpp
    # traits.cpp
    context.hpp
    context.cpp
    string.hpp
    string.cpp
    # flatten.hpp
    # flatten.cpp
    # lift.hpp
    # lift.cpp
    # load.hpp
    # load.cpp
    # lower.hpp
    # lower.cpp
    # store.hpp
    # store.cpp
    # util.hpp
    # util.cpp
    # val.hpp
    # val.cpp
)

add_library(${PROJECT_NAME} STATIC ${SRC})

# target_include_directories(${PROJECT_NAME}
#   ...
# )

target_link_libraries(${PROJECT_NAME} 
#   PRIVATE fmt::fmt
)

set_target_properties(${PROJECT_NAME} PROPERTIES CXX_STANDARD 20)
# target_compile_options(${PROJECT_NAME} PUBLIC "$<$<COMPILE_LANG_AND_ID:CXX,MSVC>:/permissive->")
