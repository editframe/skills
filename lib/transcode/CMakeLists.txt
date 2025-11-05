cmake_minimum_required(VERSION 3.15)

# Force specific compilers before project() call to avoid cc detection
set(CMAKE_C_COMPILER "/usr/bin/gcc")
set(CMAKE_CXX_COMPILER "/usr/bin/g++")

# Bypass ALL compiler detection and testing to avoid glibc 2.39 FD_SETSIZE issues
set(CMAKE_C_COMPILER_WORKS TRUE CACHE BOOL "C compiler works")
set(CMAKE_CXX_COMPILER_WORKS TRUE CACHE BOOL "CXX compiler works")
set(CMAKE_C_ABI_COMPILED TRUE CACHE BOOL "C ABI compiled")
set(CMAKE_CXX_ABI_COMPILED TRUE CACHE BOOL "CXX ABI compiled")
set(CMAKE_C_COMPILER_ID "GNU" CACHE STRING "C compiler ID")
set(CMAKE_CXX_COMPILER_ID "GNU" CACHE STRING "CXX compiler ID")
set(CMAKE_C_COMPILER_VERSION "13.3.0" CACHE STRING "C compiler version")
set(CMAKE_CXX_COMPILER_VERSION "13.3.0" CACHE STRING "CXX compiler version")
set(CMAKE_C_STANDARD_COMPUTED_DEFAULT "17" CACHE STRING "C standard default")
set(CMAKE_C_EXTENSIONS_COMPUTED_DEFAULT "ON" CACHE BOOL "C extensions default")
set(CMAKE_CXX_STANDARD_COMPUTED_DEFAULT "17" CACHE STRING "CXX standard default")
set(CMAKE_CXX_EXTENSIONS_COMPUTED_DEFAULT "ON" CACHE BOOL "CXX extensions default")
set(CMAKE_SIZEOF_VOID_P 8 CACHE STRING "sizeof(void*)")

project(playback)

# Include Node-API and node-addon-api headers
include_directories(${CMAKE_JS_INC})
include_directories(${CMAKE_SOURCE_DIR}/../../node_modules/node-addon-api)

# Find FFmpeg packages
find_package(PkgConfig REQUIRED)

# Set PKG_CONFIG_PATH to include /usr/local/lib/pkgconfig for custom FFmpeg build
set(ENV{PKG_CONFIG_PATH} "/usr/local/lib/pkgconfig:$ENV{PKG_CONFIG_PATH}")

pkg_check_modules(FFMPEG REQUIRED IMPORTED_TARGET
    libavcodec
    libavformat
    libavutil
    libswscale
    libswresample
    libavfilter
)

# Find libcurl using pkg-config (more reliable for cross-compilation)
pkg_check_modules(CURL REQUIRED IMPORTED_TARGET libcurl)

# Add source files (excluding problematic StreamTranscodeWorker for now)
file(GLOB CORE_SOURCE_FILES 
    "src/pipeline/*.cpp"
    "src/pipeline/*.h"
    "src/async/*.cpp"
    "src/async/*.h"
    "src/logging.cpp"
    "src/ConstructorReferences.cpp"
    "src/ValidateRemoteSource.cpp"
    "src/GetFFMpegVersion.cpp"
    "src/GetFFMpegConfiguration.cpp"
    "src/GetKeyframes.cpp"
    "src/FFmpegUtils.cpp"
)

# Add remaining async worker files
set(ADDITIONAL_FILES
    "src/async/FetchByteRangeAsyncWorker.cpp"
)

# Only include specific main files we need for AsyncWorker testing
set(SOURCE_FILES 
    ${CORE_SOURCE_FILES}
    ${ADDITIONAL_FILES}
    "src/playback.cpp"
    "src/module.cpp"
)

# Create addon
add_library(${PROJECT_NAME} SHARED ${SOURCE_FILES} ${CMAKE_JS_SRC})
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")

# Link libraries
target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB} PkgConfig::FFMPEG PkgConfig::CURL)

# Define NAPI_VERSION
target_compile_definitions(${PROJECT_NAME} PRIVATE NAPI_VERSION=7)

# Set optimization flags based on build type
if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release CACHE STRING "Build type" FORCE)
endif()

# Set compiler flags for different build types
set(CMAKE_CXX_FLAGS_DEBUG "-g -O0")
set(CMAKE_CXX_FLAGS_RELEASE "-O3")

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add flags to work around glibc 2.39 FD_SETSIZE issues
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -U_FORTIFY_SOURCE")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -U_FORTIFY_SOURCE")

# Use simpler linker flags
set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -Wl,--no-as-needed")
set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} -Wl,--no-as-needed")

message(STATUS "Build type: ${CMAKE_BUILD_TYPE}")
message(STATUS "CXX flags: ${CMAKE_CXX_FLAGS}")
message(STATUS "CXX flags for ${CMAKE_BUILD_TYPE}: ${CMAKE_CXX_FLAGS_${CMAKE_BUILD_TYPE}}")