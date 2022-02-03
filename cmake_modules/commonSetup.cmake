################################################################################
#    HPCC SYSTEMS software Copyright (C) 2012 HPCC Systems®.
#
#    Licensed under the Apache License, Version 2.0 (the "License");
#    you may not use this file except in compliance with the License.
#    You may obtain a copy of the License at
#
#       http://www.apache.org/licenses/LICENSE-2.0
#
#    Unless required by applicable law or agreed to in writing, software
#    distributed under the License is distributed on an "AS IS" BASIS,
#    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#    See the License for the specific language governing permissions and
#    limitations under the License.
################################################################################

# File  : commonSetup.cmake
#
#########################################################
# Description:
# ------------
# sets up various cmake options.
#########################################################

IF ("${COMMONSETUP_DONE}" STREQUAL "")
  SET (COMMONSETUP_DONE 1)

  cmake_policy ( SET CMP0011 NEW )
  if (NOT (CMAKE_MAJOR_VERSION LESS 3))
    cmake_policy ( SET CMP0026 OLD )
    if (NOT (CMAKE_MINOR_VERSION LESS 1))
      cmake_policy ( SET CMP0054 NEW )
    endif()
  endif()

  include(${CMAKE_MODULE_PATH}/hpcc_options.cmake)

  if (VCPKG_APPLOCAL_DEPS)
    include(${HPCC_SOURCE_DIR}/cmake_modules/vcpkgSetup.cmake)
  endif ()

if (WIN32)
  option(USE_JWT "Enable JSON Web Tokens" OFF)
else ()
  option(USE_JWT "Enable JSON Web Tokens" ON)
endif ()
#########################################################

  if (VCPKG_APPLOCAL_DEPS)
    include(${HPCC_SOURCE_DIR}/cmake_modules/vcpkgSetup.cmake)
  endif ()

  set(CUSTOM_PACKAGE_SUFFIX "" CACHE STRING "Custom package suffix to differentiate development builds")

    # Plugin options
    set(PLUGINS_LIST
    REMBED
    V8EMBED
    MEMCACHED
    REDIS
    SQS
    MYSQLEMBED
    JAVAEMBED
    SQLITE3EMBED
    KAFKA
    COUCHBASEEMBED
    SPARK
    EXAMPLEPLUGIN)
    foreach(plugin ${PLUGINS_LIST})
        option(${plugin} "Create a package with ONLY the ${plugin} plugin" OFF)
        option(INCLUDE_${plugin} "Include ${plugin} within package for testing" OFF)
        option(SUPPRESS_${plugin} "Suppress ${plugin} from INCLUDE_PLUGINS build" OFF)
        # Plugin Release build for individual package
        if(${plugin})
            SET_PLUGIN_PACKAGE("${plugin}")
        # Development build with all plugins for testing
        # Development build with addition of plugin
        elseif((INCLUDE_PLUGINS OR INCLUDE_${plugin}) AND (NOT SUPPRESS_${plugin}) AND (NOT PLUGIN))
            set(${plugin} ON)
        endif()
    endforeach()
    #"cmake -DEXAMPLEPLUGIN=ON <path-to/HPCC-Platform/>" will configure the plugin makefiles to be built with "make".


  if ( NOT MAKE_DOCS_ONLY )
    set(LIBMEMCACHED_MINVERSION "1.0.10")
    if(USE_LIBMEMCACHED)
      if(WIN32)
        message(STATUS "libmemcached not available on Windows.  Disabling for build")
        set(USE_LIBMEMCACHED OFF)
      elseif(APPLE)
        message(STATUS "libmemcached not available on macOS.  Disabling for build")
        set(USE_LIBMEMCACHED OFF)
      else()
        find_package(LIBMEMCACHED ${LIBMEMCACHED_MINVERSION} REQUIRED)
        add_definitions(-DUSE_LIBMEMCACHED)
        include_directories(${LIBMEMCACHED_INCLUDE_DIR})
      endif()
    endif()
  endif()

  if (SIGN_MODULES)
      message(STATUS "GPG signing check")
      execute_process(COMMAND bash "-c" "gpg --version | awk 'NR==1{print $3}'"
        OUTPUT_VARIABLE GPG_VERSION
        OUTPUT_STRIP_TRAILING_WHITESPACE
        ERROR_QUIET)
      set(GPG_COMMAND_STR "gpg")
      if(${GPG_VERSION} VERSION_GREATER "2.1")
          set(GPG_COMMAND_STR "${GPG_COMMAND_STR} --pinentry-mode loopback --batch --no-tty")
      else()
          set(GPG_COMMAND_STR "${GPG_COMMAND_STR} --batch --no-tty")
      endif()
      if(DEFINED SIGN_MODULES_PASSPHRASE)
          set(GPG_COMMAND_STR "${GPG_COMMAND_STR} --passphrase ${SIGN_MODULES_PASSPHRASE}")
      endif()
      if(DEFINED SIGN_MODULES_KEYID)
          set(GPG_COMMAND_STR "${GPG_COMMAND_STR} --default-key ${SIGN_MODULES_KEYID}")
      endif()
      set(GPG_COMMAND_STR "${GPG_COMMAND_STR} --output sm_keycheck.asc --clearsign sm_keycheck.tmp")
      execute_process(COMMAND rm -f sm_keycheck.tmp sm_keycheck.asc TIMEOUT 5
		  WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR} OUTPUT_QUIET ERROR_QUIET)
      execute_process(COMMAND touch sm_keycheck.tmp TIMEOUT 5
          WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR} RESULT_VARIABLE t_rc
          OUTPUT_QUIET ERROR_QUIET)
      if(NOT "${t_rc}" STREQUAL "0")
          message(FATAL_ERROR "Failed to create sm_keycheck.tmp for signing")
      endif()
      execute_process(
          COMMAND bash "-c" "${GPG_COMMAND_STR}"
          TIMOUT 120
          WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
          RESULT_VARIABLE rc_var
          OUTPUT_VARIABLE out_var
          ERROR_VARIABLE err_var
          )
      if(NOT "${rc_var}" STREQUAL "0")
          message(STATUS "GPG signing check - failed")
          message(FATAL_ERROR "gpg signing of std ecllibrary unsupported in current environment. \
          If you wish to build without a signed std ecllibrary add -DSIGN_MODULES=OFF to your \
          cmake invocation.\n${err_var}")
      else()
          message(STATUS "GPG signing check - done")
      endif()
  endif()

  if ( USE_XALAN AND USE_LIBXSLT )
      set(USE_LIBXSLT OFF)
  endif()
  if ( USE_LIBXSLT )
      set(USE_LIBXML2 ON)
  endif()
  if ( USE_XALAN )
      set(USE_XERCES ON)
  endif()

  if ( MAKE_DOCS AND CLIENTTOOLS_ONLY )
      set( MAKE_DOCS OFF )
  endif()

  if ( MAKE_DOCS_ONLY AND NOT CLIENTTOOLS_ONLY )
      set( MAKE_DOCS ON )
      if ( USE_DOCS_AUTO )
        set ( DOCS_AUTO  ON)
      endif()
  endif()

  if ( CLIENTTOOLS_ONLY )
      set(PLATFORM OFF)
      set(DEVEL OFF)
  endif()

  option(PORTALURL "Set url to hpccsystems portal download page")

  if ( NOT PORTALURL )
    set( PORTALURL "http://hpccsystems.com/download" )
  endif()

  if(UNIX AND SIGN_MODULES)
      execute_process(COMMAND bash "-c" "gpg --version | awk 'NR==1{print $3}'"
        OUTPUT_VARIABLE GPG_VERSION
        OUTPUT_STRIP_TRAILING_WHITESPACE
        ERROR_QUIET)
    message(STATUS "gpg version ${GPG_VERSION}")
    #export gpg public key used for signing to new installation
    add_custom_command(OUTPUT ${CMAKE_BINARY_DIR}/pub.key
      COMMAND bash "-c" "gpg --output=${CMAKE_BINARY_DIR}/pub.key --batch --no-tty --export ${SIGN_MODULES_KEYID}"
      WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
      COMMENT "Exporting public key for eclcc signed modules to ${CMAKE_BINARY_DIR}/pub.key"
      VERBATIM
      )
    add_custom_target(export-stdlib-pubkey ALL
      DEPENDS ${CMAKE_BINARY_DIR}/pub.key
      WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
      )
    install(FILES ${CMAKE_BINARY_DIR}/pub.key DESTINATION .${CONFIG_DIR}/rpmnew  COMPONENT Runtime)
    install(PROGRAMS ${CMAKE_MODULE_PATH}publickey.install DESTINATION etc/init.d/install COMPONENT Runtime)
  endif()

  include(${CMAKE_MODULE_PATH}/hpcc_compiler_flags.cmake)

  include(${CMAKE_MODULE_PATH}/hpcc_macros.cmake)

MACRO(SIGN_MODULE module)
  if(SIGN_MODULES)
    set(GPG_COMMAND_STR "gpg")
    if(DEFINED SIGN_MODULES_PASSPHRASE)
        set(GPG_COMMAND_STR "${GPG_COMMAND_STR} --passphrase ${SIGN_MODULES_PASSPHRASE}")
    endif()
    if(DEFINED SIGN_MODULES_KEYID)
        set(GPG_COMMAND_STR "${GPG_COMMAND_STR} --default-key ${SIGN_MODULES_KEYID}")
    endif()
    if("${GPG_VERSION}" VERSION_GREATER "2.1")
        set(GPG_COMMAND_STR "${GPG_COMMAND_STR} --pinentry-mode loopback")
    endif()
    set(GPG_COMMAND_STR "${GPG_COMMAND_STR} --batch --yes --no-tty --output ${CMAKE_CURRENT_BINARY_DIR}/${module} --clearsign ${module}")
    add_custom_command(
      OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/${module}
      COMMAND bash "-c" "${GPG_COMMAND_STR}"
      DEPENDS ${CMAKE_CURRENT_SOURCE_DIR}/${module}
      WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
      COMMENT "Adding signed ${module} to project"
      )
  else()
    add_custom_command(
      OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/${module}
      COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_SOURCE_DIR}/${module} ${CMAKE_CURRENT_BINARY_DIR}/${module}
      DEPENDS ${CMAKE_CURRENT_SOURCE_DIR}/${module}
      WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
      COMMENT "Adding unsigned ${module} to project"
      VERBATIM
      )
  endif()
  # Use custom target to cause build to fail if dependency file isn't generated by gpg or cp commands
  get_filename_component(module_without_extension ${module} NAME_WE)
  add_custom_target(
    ${module_without_extension}-ecl ALL
    DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/${module}
    )
  if(SIGN_MODULES)
    add_dependencies(${module_without_extension}-ecl export-stdlib-pubkey)
  endif()
ENDMACRO()

function(LIST_TO_STRING separator outvar)
  set ( tmp_str "" )
  list (LENGTH ARGN list_length)
  if ( ${list_length} LESS 2 )
    set ( tmp_str "${ARGN}" )
  else()
    math(EXPR last_index "${list_length} - 1")

    foreach( index RANGE ${last_index} )
      if ( ${index} GREATER 0 )
        list( GET ARGN ${index} element )
        set( tmp_str "${tmp_str}${separator}${element}")
      else()
        list( GET ARGN 0 element )
        set( tmp_str "${element}")
      endif()
    endforeach()
  endif()
  set ( ${outvar} "${tmp_str}" PARENT_SCOPE )
endfunction()

function(STRING_TO_LIST separator outvar stringvar)
  set( tmp_list "" )
  string(REPLACE "${separator}" ";" tmp_list ${stringvar})
  string(STRIP "${tmp_list}" tmp_list)
  set( ${outvar} "${tmp_list}" PARENT_SCOPE)
endfunction()

###########################################################################
###
## The following sets the dependency list for a package
###
###########################################################################
function(SET_DEPENDENCIES cpackvar)
  set(_tmp "")
  if(${cpackvar})
    STRING_TO_LIST(", " _tmp ${${cpackvar}})
  endif()
  foreach(element ${ARGN})
    list(APPEND _tmp ${element})
  endforeach()
  list(REMOVE_DUPLICATES _tmp)
  LIST_TO_STRING(", " _tmp "${_tmp}")
  set(${cpackvar} "${_tmp}" CACHE STRING "" FORCE)
  message(STATUS "Updated ${cpackvar} to ${${cpackvar}}")
endfunction()

  ##################################################################

  set ( SCM_GENERATED_DIR ${CMAKE_BINARY_DIR}/generated )

  ##################################################################

  # Build tag generation

  set(projname ${HPCC_PROJECT})
  set(majorver ${HPCC_MAJOR})
  set(minorver ${HPCC_MINOR})
  set(point ${HPCC_POINT})
  if ( "${HPCC_MATURITY}" STREQUAL "release" )
    set(stagever "${HPCC_SEQUENCE}")
  else()
    set(stagever "${HPCC_MATURITY}${HPCC_SEQUENCE}")
  endif()
  set(version ${majorver}.${minorver}.${point})

  IF ("${CMAKE_BUILD_TYPE}" STREQUAL "Debug")
    set( stagever "${stagever}Debug" )
  ENDIF ("${CMAKE_BUILD_TYPE}" STREQUAL "Debug")

  ###########################################################################

    if(USE_OPTIONAL)
        message(WARNING "USE_OPTIONAL set - missing dependencies for optional features will automatically disable them")
    endif()

    if(NOT "${EXTERNALS_DIRECTORY}" STREQUAL "")
        message(STATUS "Using externals directory at ${EXTERNALS_DIRECTORY}")
    endif()

    IF ( NOT MAKE_DOCS_ONLY )
      # On macOS, search Homebrew for keg-only versions of Bison and Flex. Xcode does
      # not provide new enough versions for us to use.
      if (CMAKE_HOST_SYSTEM_NAME MATCHES "Darwin")
        execute_process(
            COMMAND brew --prefix bison
            RESULT_VARIABLE BREW_BISON
            OUTPUT_VARIABLE BREW_BISON_PREFIX
            OUTPUT_STRIP_TRAILING_WHITESPACE
        )
        if (BREW_BISON EQUAL 0 AND EXISTS "${BREW_BISON_PREFIX}")
            message(STATUS "Found Bison keg installed by Homebrew at ${BREW_BISON_PREFIX}")
            set(BISON_EXECUTABLE "${BREW_BISON_PREFIX}/bin/bison")
        endif()

        execute_process(
            COMMAND brew --prefix flex
            RESULT_VARIABLE BREW_FLEX
            OUTPUT_VARIABLE BREW_FLEX_PREFIX
            OUTPUT_STRIP_TRAILING_WHITESPACE
        )
        if (BREW_FLEX EQUAL 0 AND EXISTS "${BREW_FLEX_PREFIX}")
          message(STATUS "Found Flex keg installed by Homebrew at ${BREW_FLEX_PREFIX}")
          set(FLEX_EXECUTABLE "${BREW_FLEX_PREFIX}/bin/flex")
        endif ()
      endif ()
      FIND_PACKAGE(BISON)
      FIND_PACKAGE(FLEX)
      IF ( BISON_FOUND AND FLEX_FOUND )
        SET(BISON_exename ${BISON_EXECUTABLE})
        SET(FLEX_exename ${FLEX_EXECUTABLE})
        IF (WIN32 OR APPLE)
          SET(bisoncmd ${BISON_exename})
          SET(flexcmd ${FLEX_exename})
        ELSE()
          SET(bisoncmd "bison")
          SET(flexcmd "flex")
        ENDIF()
      ELSE ()
        IF ("${EXTERNALS_DIRECTORY}" STREQUAL "")
          IF (WIN32)
            SET(bisoncmd "win_bison")
            SET(flexcmd "win_flex")
          ELSE()
            SET(bisoncmd "bison")
            SET(flexcmd "flex")
          ENDIF()
        ELSE()
          IF (WIN32)
            SET(bisoncmdprefix "call")
            SET(flexcmdprefix "call")
            SET(bisoncmd "${EXTERNALS_DIRECTORY}\\bison\\bison.bat")
            SET(flexcmd "${EXTERNALS_DIRECTORY}\\bison\\flex.bat")
          ELSE ()
            SET(bisoncmd "${EXTERNALS_DIRECTORY}/bison/bison")
            SET(flexcmd "${EXTERNALS_DIRECTORY}/bison/flex")
          ENDIF()
        ENDIF()
      ENDIF ()

      IF ("${BISON_VERSION}" STREQUAL "")
        IF (WIN32)
          # cmake bug workaround - it converts path separators fine in add_custom_command but not here
          STRING(REPLACE "/" "\\" BISON_exename "${bisoncmd}")
        ELSE()
          SET(BISON_exename "${bisoncmd}")
        ENDIF()
        EXECUTE_PROCESS(COMMAND ${BISON_exename} --version
          OUTPUT_VARIABLE BISON_version_output
          ERROR_VARIABLE BISON_version_error
          RESULT_VARIABLE BISON_version_result
          OUTPUT_STRIP_TRAILING_WHITESPACE)
        STRING(REGEX REPLACE "^[^0-9]*([0-9.]+).*" "\\1" BISON_VERSION "${BISON_version_output}")
      ENDIF()

      IF ("${FLEX_VERSION}" STREQUAL "")
        IF (WIN32)
          # cmake bug workaround - it converts path separators fine in add_custom_command but not here
          STRING(REPLACE "/" "\\" FLEX_exename "${flexcmd}")
        ELSE()
          SET(FLEX_exename "${flexcmd}")
        ENDIF()
        EXECUTE_PROCESS(COMMAND ${FLEX_exename} --version
          OUTPUT_VARIABLE FLEX_version_output
          ERROR_VARIABLE FLEX_version_error
          RESULT_VARIABLE FLEX_version_result
          OUTPUT_STRIP_TRAILING_WHITESPACE)
        STRING(REGEX REPLACE "^[^0-9]*([0-9.]+).*" "\\1" FLEX_VERSION "${FLEX_version_output}")
      ENDIF()

      IF ("${BISON_VERSION}" VERSION_LESS "2.4.1")
        MESSAGE(FATAL_ERROR "You need bison version 2.4.1 or later to build this project (version ${BISON_VERSION} detected)")
      ENDIF()

      message(STATUS "Found Bison v${BISON_VERSION}")

      IF ("${BISON_VERSION}" VERSION_LESS "2.7.0")
        #Ignore all warnings - not recommend to develope on this version!
        SET(bisonopt "-Wnone")
      ELSE()
        SET(bisonopt -Werror -Wno-other)
      ENDIF()

      IF ("${BISON_VERSION}" VERSION_LESS "3.0.0")
        SET(bisonopt ${bisonopt} --name-prefix=eclyy)
        SET(ENV{BISON_MAJOR_VER} "2")
      ELSE()
        SET(bisonopt ${bisonopt} -Dapi.prefix={eclyy})
        SET(ENV{BISON_MAJOR_VER} "3")
      ENDIF()

      IF ("${FLEX_VERSION}" VERSION_LESS "2.5.35")
        MESSAGE(FATAL_ERROR "You need flex version 2.5.35 or later to build this project (version ${FLEX_VERSION} detected)")
      ENDIF()

      IF (CMAKE_COMPILER_IS_GNUCXX)
        IF ("${CMAKE_CXX_COMPILER_VERSION}" VERSION_LESS "7.3.0")
          MESSAGE(FATAL_ERROR "You need Gnu c++ version 7.3.0 or later to build this project (version ${CMAKE_CXX_COMPILER_VERSION} detected)")
        ENDIF()
      ENDIF()
    ENDIF()
  ###########################################################################

  # External library setup - some can be optionally selected based on USE_xxx flags, some are required

  IF (MAKE_DOCS)
    find_package(XSLTPROC)
    IF (XSLTPROC_FOUND)
      add_definitions (-D_USE_XSLTPROC)
    ELSE()
      message(FATAL_ERROR "XSLTPROC requested but package not found")
    ENDIF()
    find_package(FOP)
    IF (FOP_FOUND)
      add_definitions (-D_USE_FOP)
    ELSE()
      message(FATAL_ERROR "FOP requested but package not found")
    ENDIF()

    IF ( DOCS_AUTO )
      find_package(SAXON)
      IF (SAXON_FOUND)
        add_definitions (-D_USE_SAXON)
      ELSE()
        message(FATAL_ERROR "SAXON, a XSLT and XQuery processor, is required for documentation build but not found.")
      ENDIF()
    ENDIF()

  ENDIF(MAKE_DOCS)

  IF ( NOT MAKE_DOCS_ONLY )
      IF (USE_OPENLDAP)
        find_package(OPENLDAP)
        IF (OPENLDAP_FOUND)
          add_definitions (-D_USE_OPENLDAP)
        ELSE()
          message(FATAL_ERROR "OPENLDAP requested but package not found")
        ENDIF()
      ELSE()
        add_definitions (-D_NO_LDAP)
      ENDIF(USE_OPENLDAP)

      IF (USE_CPPUNIT)
        find_package(CPPUNIT)
        IF (CPPUNIT_FOUND)
          add_definitions (-D_USE_CPPUNIT)
          include_directories(${CPPUNIT_INCLUDE_DIR})
        ELSE()
          message(FATAL_ERROR "CPPUNIT requested but package not found")
        ENDIF()
      ELSE()
        SET(CPPUNIT_INCLUDE_DIR "")
        SET(CPPUNIT_LIBRARIES "")
      ENDIF(USE_CPPUNIT)

      IF (USE_AERON)
         add_definitions (-D_USE_AERON)
      ENDIF(USE_AERON)

      IF (CONTAINERIZED)
         add_definitions (-D_CONTAINERIZED)
      ENDIF(CONTAINERIZED)

      IF (USE_ICU)
        find_package(ICU)
        IF (ICU_FOUND)
          add_definitions (-D_USE_ICU)
          IF (NOT WIN32)
            add_definitions (-DUCHAR_TYPE=uint16_t)
          ENDIF()
          include_directories(${ICU_INCLUDE_DIR})
        ELSE()
          message(FATAL_ERROR "ICU requested but package not found")
        ENDIF()
      ENDIF(USE_ICU)

      if(USE_XALAN)
        find_package(XALAN)
        if (XALAN_FOUND)
          add_definitions (-D_USE_XALAN)
        else()
          message(FATAL_ERROR "XALAN requested but package not found")
        endif()
      endif(USE_XALAN)

      if(USE_LIBXSLT)
        find_package(LIBXSLT)
        if (LIBXSLT_FOUND)
          add_definitions (-D_USE_LIBXSLT)
        else()
          message(FATAL_ERROR "LIBXSLT requested but package not found")
        endif()
      endif(USE_LIBXSLT)

      if(USE_XERCES)
        find_package(XERCES)
        if (XERCES_FOUND)
          add_definitions (-D_USE_XERCES)
        else()
          message(FATAL_ERROR "XERCES requested but package not found")
        endif()
      endif(USE_XERCES)

      if(USE_LIBXML2)
        find_package(LIBXML2)
        if (LIBXML2_FOUND)
          add_definitions (-D_USE_LIBXML2)
        else()
          message(FATAL_ERROR "LIBXML2 requested but package not found")
        endif()
      endif(USE_LIBXML2)

      if(USE_CBLAS)
        find_package(CBLAS)
        if(CBLAS_FOUND)
            add_definitions(-D_USE_CBLAS)
        else()
            message(FATAL_ERROR "CBLAS requested but package not found")
        endif()
      endif(USE_CBLAS)

      if(USE_ZLIB)
        find_package(ZLIB)
        if (ZLIB_FOUND)
          add_definitions (-D_USE_ZLIB)
        else()
          message(FATAL_ERROR "ZLIB requested but package not found")
        endif()
      endif(USE_ZLIB)

      if(USE_LIBARCHIVE)
        if (WIN32)
          if(NOT USE_ZLIB)
            message(FATAL ERROR "LIBARCHIVE requires ZLIB")
          endif(NOT USE_ZLIB)
          find_package(BZip2)
          if (BZIP2_FOUND)
            add_definitions (-D_USE_BZIP2)
          else()
            message(FATAL_ERROR "LIBARCHIVE requires BZIP2 but package not found")
          endif()
        endif (WIN32)
        find_package(LIBARCHIVE)
        if (LIBARCHIVE_FOUND)
          add_definitions (-D_USE_LIBARCHIVE)
        else()
          message(FATAL_ERROR "LIBARCHIVE requested but package not found")
        endif()
      endif(USE_LIBARCHIVE)

      if(USE_URIPARSER)
        find_package(Uriparser)
        if (URIPARSER_FOUND)
          add_definitions (-D_USE_URIPARSER)
        else()
          message(FATAL_ERROR "URIPARSER requested but package not found")
        endif()
      endif(USE_URIPARSER)

      if(USE_BOOST_REGEX)
        if(CENTOS_6_BOOST)
          include(${CMAKE_MODULE_PATH}/buildBOOST_REGEX.cmake)
          message(STATUS "CENTOS_6_BOOST_REGEX enabled")
          add_definitions (-D_USE_BOOST_REGEX)
        else()
          find_package(BOOST_REGEX)
          if (BOOST_REGEX_FOUND)
            message(STATUS "BOOST_REGEX enabled")
            add_definitions (-D_USE_BOOST_REGEX)
          else()
            message(FATAL_ERROR "BOOST_REGEX requested but package not found")
          endif()
        endif()
      else(USE_BOOST_REGEX)
        if (USE_C11_REGEX)
          if ((NOT CMAKE_COMPILER_IS_GNUCC) OR (CMAKE_CXX_COMPILER_VERSION VERSION_GREATER 4.9.0))
            message(STATUS "C11_REGEX enabled")
            add_definitions (-D_USE_C11_REGEX)
          else()
            message(STATUS "C11_REGEX requested but not supported on this platform")
          endif()
        else(USE_C11_REGEX)
          message(STATUS "NO REGEX requested")
        endif(USE_C11_REGEX)
      endif(USE_BOOST_REGEX)

      if(USE_OPENSSL)
        find_package(OpenSSL)
        if (OPENSSL_FOUND)
          add_definitions (-D_USE_OPENSSL)
          include_directories(${OPENSSL_INCLUDE_DIR})
          link_directories(${OPENSSL_LIBRARY_DIR})
        else()
          message(FATAL_ERROR "OPENSSL requested but package not found")
        endif()
      endif(USE_OPENSSL)

      if(USE_MYSQL_REPOSITORY)
        find_package(MYSQL)
        if (MYSQL_FOUND)
          add_definitions (-D_USE_MYSQL_REPOSITORY)
        else()
          message(FATAL_ERROR "MYSQL requested but package not found")
        endif()
      else()
        add_definitions (-D_NO_MYSQL_REPOSITORY)
      endif(USE_MYSQL_REPOSITORY)

      if(USE_APR)
        find_package(APR)
        if (APR_FOUND)
          add_definitions (-D_USE_APR)
          include_directories(${APR_INCLUDE_DIR})
          link_directories(${APR_LIBRARY_DIR})
        else()
          message(FATAL_ERROR "APR requested but package not found")
        endif()
        if (APRUTIL_FOUND)
          include_directories(${APRUTIL_INCLUDE_DIR})
          link_directories(${APRUTIL_LIBRARY_DIR})
        else()
          message(FATAL_ERROR "APRUTIL requested but package not found")
        endif()
      else()
        add_definitions (-D_NO_APR)
      endif(USE_APR)

      if (USE_NUMA)
        find_package(NUMA)
        add_definitions (-D_USE_NUMA)
        if (NOT NUMA_FOUND)
          message(FATAL_ERROR "NUMA requested but package not found")
        endif()
      endif()

      if(USE_TBB)
          message(STATUS "Enabled use of TBB")
          add_definitions (-D_USE_TBB)
      endif(USE_TBB)
      if(USE_TBBMALLOC)
          message(STATUS "Enabled use of TBBMALLOC")
          add_definitions (-D_USE_TBBMALLOC)
          if(USE_TBBMALLOC_ROXIE)
              message(STATUS "Enabled use of TBBMALLOC_ROXIE")
          endif(USE_TBBMALLOC_ROXIE)
      endif(USE_TBBMALLOC)

  ENDIF()
  ###########################################################################
  ###
  ## The following sets the install directories and names.
  ###
  if ( PLATFORM OR PLUGIN )
      set ( CMAKE_INSTALL_PREFIX "${INSTALL_DIR}" )
  else ( )
    set ( CMAKE_INSTALL_PREFIX "${INSTALL_DIR}/${version}/clienttools" )
  endif ( PLATFORM OR PLUGIN )
  if(APPLE)
    set(CMAKE_MACOSX_RPATH ON)
  endif()
  set (CMAKE_SKIP_BUILD_RPATH  FALSE)
  set (CMAKE_BUILD_WITH_INSTALL_RPATH FALSE)
  set (CMAKE_INSTALL_RPATH "${CMAKE_INSTALL_PREFIX}/${LIB_DIR};${CMAKE_INSTALL_PREFIX}/${PLUGINS_DIR};${CMAKE_INSTALL_PREFIX}/${LIB_DIR}/external")
  set (CMAKE_INSTALL_RPATH_USE_LINK_PATH TRUE)

endif ("${COMMONSETUP_DONE}" STREQUAL "")
