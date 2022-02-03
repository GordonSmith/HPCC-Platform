  ##########################################################

  # common compiler/linker flags

  if ("${CMAKE_BUILD_TYPE}" STREQUAL "")
    set ( CMAKE_BUILD_TYPE "Release" )
  elseif (NOT "${CMAKE_BUILD_TYPE}" MATCHES "^Debug$|^Release$|^RelWithDebInfo$")
    message (FATAL_ERROR "Unknown build type ${CMAKE_BUILD_TYPE}")
  endif ()
  message ("-- Making ${CMAKE_BUILD_TYPE} system")

  if (CMAKE_SIZEOF_VOID_P EQUAL 8)
    set ( ARCH64BIT 1 )
  else ()
    set ( ARCH64BIT 0 )
  endif ()
  message ("-- 64bit architecture is ${ARCH64BIT}")

  set (CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} -D_DEBUG -DDEBUG")

  IF (USE_INLINE_TSC)
    add_definitions (-DINLINE_GET_CYCLES_NOW)
  ENDIF()

  set (CMAKE_THREAD_PREFER_PTHREAD 1)
  find_package(Threads)
  IF (NOT THREADS_FOUND)
    message(FATAL_ERROR "No threading support found")
  ENDIF()

  if ("${CMAKE_CXX_COMPILER_ID}" MATCHES "Clang")
   set (CMAKE_COMPILER_IS_CLANGXX 1)
  endif()
  if ("${CMAKE_C_COMPILER_ID}" MATCHES "Clang")
   set (CMAKE_COMPILER_IS_CLANG 1)
  endif()
  if ((CMAKE_COMPILER_IS_GNUCC OR CMAKE_COMPILER_IS_CLANG) AND (NOT ${CMAKE_C_COMPILER_VERSION} MATCHES "[0-9]+\\.[0-9]+\\.[0-9]+"))
      execute_process(COMMAND ${CMAKE_C_COMPILER} -dumpversion OUTPUT_VARIABLE CMAKE_C_COMPILER_VERSION OUTPUT_STRIP_TRAILING_WHITESPACE)
  endif ()
  if ((CMAKE_COMPILER_IS_GNUCXX OR CMAKE_COMPILER_IS_CLANGXX) AND (NOT ${CMAKE_CXX_COMPILER_VERSION} MATCHES "[0-9]+\\.[0-9]+\\.[0-9]+"))
      execute_process(COMMAND ${CMAKE_CXX_COMPILER} -dumpversion OUTPUT_VARIABLE CMAKE_CXX_COMPILER_VERSION OUTPUT_STRIP_TRAILING_WHITESPACE)
  endif()
  if (CMAKE_COMPILER_IS_GNUCC AND NOT CMAKE_BUILD_TYPE STREQUAL "Debug" AND NOT CMAKE_BUILD_TYPE STREQUAL "RelWithDebInfo")
    add_definitions (-fvisibility=hidden)
  endif ()
  if (CMAKE_COMPILER_IS_CLANGXX AND CMAKE_BUILD_TYPE STREQUAL "Debug" AND NOT "${CMAKE_CXX_COMPILER_VERSION}" VERSION_LESS "10.0.0")
    add_definitions (-fsanitize=undefined -fno-sanitize=alignment -fsanitize-trap=undefined)
    SET (CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} -fsanitize=undefined")
    SET (CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -fsanitize=undefined")
  endif ()
  if ((CMAKE_COMPILER_IS_GNUCXX AND CMAKE_CXX_COMPILER_VERSION VERSION_GREATER 8.0.0) AND CMAKE_BUILD_TYPE STREQUAL "Debug")
    add_definitions (-fsanitize=undefined -fno-sanitize=alignment -fsanitize-undefined-trap-on-error)
    SET (CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} -fsanitize=undefined")
    SET (CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -fsanitize=undefined")
  endif ()
  if (CMAKE_COMPILER_IS_CLANGXX)
    execute_process( COMMAND ${CMAKE_CXX_COMPILER} --version OUTPUT_VARIABLE clang_full_version_string )
    if (${clang_full_version_string} MATCHES "Apple LLVM version ([0-9]+\\.[0-9]+\\.[0-9]+).*")
      string (REGEX REPLACE "Apple LLVM version ([0-9]+\\.[0-9]+\\.[0-9]+).*" "\\1" APPLE_CLANG_VERSION ${clang_full_version_string})
    endif()
    if (${clang_full_version_string} MATCHES ".*based on LLVM ([0-9]+\\.[0-9]+).*")
      string (REGEX REPLACE ".*based on LLVM ([0-9]+\\.[0-9]+).*" "\\1" CLANG_VERSION ${clang_full_version_string})
    else()
      if (${clang_full_version_string} MATCHES ".*clang version ([0-9]+\\.[0-9]+).*")
        string (REGEX REPLACE ".*clang version ([0-9]+\\.[0-9]+).*" "\\1" CLANG_VERSION ${clang_full_version_string})
      endif()
    endif()
  endif ()

  if (WIN32)
    # On windows, the vcproj generator generates both windows and debug build capabilities, and the release mode is appended to the directory later
    # This output location matches what our existing windows release scripts expect - might make sense to move out of tree sometime though
    set ( EXECUTABLE_OUTPUT_PATH "${CMAKE_BINARY_DIR}/bin" )
    set ( LIBRARY_OUTPUT_PATH "${CMAKE_BINARY_DIR}/bin" )
    # Workaround CMake's odd decision to default windows stack size to 10000000
    STRING(REGEX REPLACE "/STACK:[0-9]+" "" CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS}")
    SET (CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} /LARGEADDRESSAWARE")

    if (${ARCH64BIT} EQUAL 1)
      add_definitions(/bigobj)
    endif ()

    if ("${CMAKE_BUILD_TYPE}" MATCHES "Debug")
      add_definitions(/Zi)
    endif ()
    if ("${GIT_COMMAND}" STREQUAL "")
        set ( GIT_COMMAND "git.cmd" )
    endif ()

    #Strip the old flag to avoid warnings about conflicting flags
    string(REGEX REPLACE "/EH[A-Za-z]*" "" CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS}")
    SET (CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} /EHa")

    if (USE_SIGNED_CHAR AND USE_UNSIGNED_CHAR )
        message (FATAL_ERROR "Can't use USE_SIGNED_CHAR and USE_UNSIGNED_CHAR together!")
    else()
        if (USE_SIGNED_CHAR)
            message ("Build system with signed char type.")
            # This is default for MSVC
        endif ()
        if (USE_UNSIGNED_CHAR )
          message ("Build system with unsigned char type.")
           add_definitions(/J)
        endif ()
    endif ()


    #===  WARNING ======
    # Temporary disable warnings. Reenable them one by one to reexamine and fix them.
    IF (NOT ALL_WARNINGS_ON)
      set (WARNINGS_IGNORE "/wd4267 /wd4244 /wd6340 /wd6297 /wd4018 /wd4302 /wd4311 /wd4320 /wd4800") # data conversion warnings
      set (WARNINGS_IGNORE "${WARNINGS_IGNORE} /wd4251 /wd4275") # dll-interface for used by clients
      set (WARNINGS_IGNORE "${WARNINGS_IGNORE} /wd6246")   # local variable hidden by outer scope
      set (WARNINGS_IGNORE "${WARNINGS_IGNORE} /wd6031")   # Return value ignored
      set (WARNINGS_IGNORE "${WARNINGS_IGNORE} /wd4005")   # MACRO redef: same value
      set (CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${WARNINGS_IGNORE}")
    ENDIF()


  else ()
    if (NOT CMAKE_USE_PTHREADS_INIT)
      message (FATAL_ERROR "pthreads support not detected")
    endif ()
    set ( EXECUTABLE_OUTPUT_PATH "${CMAKE_BINARY_DIR}/${CMAKE_BUILD_TYPE}/bin" )
    set ( LIBRARY_OUTPUT_PATH "${CMAKE_BINARY_DIR}/${CMAKE_BUILD_TYPE}/libs" )

    if (CMAKE_COMPILER_IS_GNUCXX OR CMAKE_COMPILER_IS_CLANGXX)
      message ("Using compiler: ${CMAKE_CXX_COMPILER_ID} :: ${CMAKE_CXX_COMPILER_VERSION} :: ${CLANG_VERSION} :: ${APPLE_CLANG_VERSION}")
      SET (CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -frtti -fPIC -fmessage-length=0 -Werror=format -Wformat-security -Wformat-nonliteral -pthread -Wuninitialized")
      SET (CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} -rdynamic")
      SET (CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -g -fno-inline-functions")
      if (CMAKE_COMPILER_IS_GNUCXX)
        SET (CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -g -fno-default-inline")
        if (CMAKE_CXX_COMPILER_VERSION VERSION_GREATER 4.2.4 OR CMAKE_CXX_COMPILER_VERSION VERSION_EQUAL 4.2.4)
          SET (CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Werror=return-type -Werror=format-nonliteral")
        endif ()
        if (CMAKE_CXX_COMPILER_VERSION VERSION_GREATER 4.4.0 OR CMAKE_CXX_COMPILER_VERSION VERSION_EQUAL 4.4.0)
          SET (CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wno-psabi")
        endif ()
        if (CMAKE_CXX_COMPILER_VERSION VERSION_GREATER 2.95.3 OR CMAKE_CXX_COMPILER_VERSION VERSION_EQUAL 2.95.3)
          SET (CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wparentheses")
        endif ()
      endif ()
      SET (CMAKE_CXX_FLAGS_RELWITHDEBINFO "${CMAKE_CXX_FLAGS_RELEASE}")
      SET (CMAKE_C_FLAGS_RELWITHDEBINFO "${CMAKE_C_FLAGS_RELEASE}")
      SET (CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++11")
      if (GENERATE_COVERAGE_INFO)
        message ("Build system with coverage.")
        if (CMAKE_COMPILER_IS_CLANGXX)
          SET (CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fprofile-instr-generate -fcoverage-mapping")
        else()
          SET (CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fprofile-arcs -ftest-coverage")
        endif()
      endif()
      # Handle forced default char type
      if (USE_SIGNED_CHAR AND USE_UNSIGNED_CHAR )
        message (FATAL_ERROR "Can't use USE_SIGNED_CHAR and USE_UNSIGNED_CHAR together!")
      else()
        if (USE_SIGNED_CHAR)
            message ("Build system with signed char type.")
            SET (CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fsigned-char")
        endif ()
        if (USE_UNSIGNED_CHAR )
            message ("Build system with unsigned char type.")
            SET (CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -funsigned-char")
        endif ()
      endif ()
    endif ()
    if (CMAKE_COMPILER_IS_CLANGXX)
      SET (CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Werror=logical-op-parentheses -Werror=bool-conversions -Werror=return-type -Werror=comment")
      if (APPLE)
        SET (CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -stdlib=libc++")
        SET (CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wno-deprecated-declarations")
      endif ()
      SET (CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS}  -Werror=bitwise-op-parentheses -Werror=tautological-compare")
      SET (CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS}  -Wno-switch-enum -Wno-format-zero-length -Wno-switch")
      SET (CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS}  -Qunused-arguments")  # Silence messages about pthread not being used when linking...
      SET (CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS}  -Wno-inconsistent-missing-override -Wno-unknown-warning-option")  # Until we fix them all, whcih would be a huge task...
      if (CLANG_VERSION VERSION_GREATER 3.6 OR CLANG_VERSION VERSION_EQUAL 3.6 OR APPLE_CLANG_VERSION VERSION_GREATER 6.0)
        SET (CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wno-pointer-bool-conversion")
      endif()
    endif()
    # All of these are defined in platform.h too, but need to be defned before any system header is included
    ADD_DEFINITIONS (-D_LARGEFILE_SOURCE=1 -D_LARGEFILE64_SOURCE=1 -D_FILE_OFFSET_BITS=64 -D__USE_LARGEFILE64=1 -D__USE_FILE_OFFSET64=1)
    if ("${GIT_COMMAND}" STREQUAL "")
        set ( GIT_COMMAND "git" )
    endif ()
  endif ()

  # check for old glibc and add required libs ...
  if (NOT APPLE AND NOT WIN32)
    execute_process(
        COMMAND /bin/bash -c "ldd --version | head -n 1 | awk '{print $NF}'"
        WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
        OUTPUT_VARIABLE GLIBC_VER
        OUTPUT_STRIP_TRAILING_WHITESPACE
    )
    message(STATUS "GLIBC version: ${GLIBC_VER}")
    if ("${GLIBC_VER}" VERSION_LESS "2.18")
        set(CMAKE_C_STANDARD_LIBRARIES "${CMAKE_C_STANDARD_LIBRARIES} -lrt")
        set(CMAKE_CXX_STANDARD_LIBRARIES "${CMAKE_CXX_STANDARD_LIBRARIES} -lrt")
    endif()
  endif()

  if ( NOT PLUGIN )
    if (CMAKE_COMPILER_IS_GNUCXX)
      #Ensure that missing symbols are reported as errors at link time (default for osx/windows)
      SET (CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} -Wl,-z,defs")
      SET (CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -Wl,-z,defs")
      endif()
  endif()
