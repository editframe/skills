#!/usr/bin/env bash
# Apply the headless DMA-BUF pixmap patch to Chromium source tree.
# Run from the Chromium src/ root (the electron checkout's src/).
#
# Chromium 136 API: CreateNativePixmap takes viz::SharedImageFormat (not gfx::BufferFormat).
# NativePixmapDmaBuf constructor takes viz::SharedImageFormat.
# GetFourCCFormatFromSharedImageFormat() converts to DRM fourcc.
#
# This replaces TestPixmap in HeadlessSurfaceFactory::CreateNativePixmap with
# a real GBM-backed NativePixmapDmaBuf implementation.

set -euo pipefail

FACTORY_CC="ui/ozone/platform/headless/headless_surface_factory.cc"
BUILD_GN="ui/ozone/platform/headless/BUILD.gn"

if [ ! -f "$FACTORY_CC" ]; then
  echo "ERROR: $FACTORY_CC not found. Run this from the Chromium src/ root." >&2
  exit 1
fi

echo "==> Patching $FACTORY_CC ..."

# ---- 1. Add includes after the existing #include <memory> ----
sed -i '/#include <memory>/a\
#include <fcntl.h>\
#include <unistd.h>\
#include <gbm.h>' "$FACTORY_CC"

# Add base/posix, NativePixmapDmaBuf, and drm_util includes after base/task/thread_pool.h
sed -i '/#include "base\/task\/thread_pool.h"/a\
#include "base/posix/eintr_wrapper.h"\
#include "base/files/scoped_file.h"\
#include "ui/gfx/linux/drm_util_linux.h"\
#include "ui/gfx/linux/native_pixmap_dmabuf.h"\
#include "ui/gfx/native_pixmap_handle.h"' "$FACTORY_CC"

# ---- 2. Add GBM device management + CreateGbmPixmap before kDevNull ----
sed -i '/^const base::FilePath::CharType kDevNull\[\]/i\
// ---------------------------------------------------------------------------\
// GBM device for DMA-BUF-backed native pixmaps (zero-copy GPU capture).\
// Opened lazily on first CreateNativePixmap call.  When a GPU and libgbm.so.1\
// are available, allocations produce real DMA-BUF file descriptors.\
// Without GPU/GBM, falls back to the original TestPixmap stub.\
// ---------------------------------------------------------------------------\
\
static struct gbm_device* g_gbm_device = nullptr;\
static int g_drm_fd = -1;\
static bool g_gbm_init_attempted = false;\
\
static bool EnsureGbmDevice() {\
  if (g_gbm_init_attempted)\
    return g_gbm_device != nullptr;\
  g_gbm_init_attempted = true;\
\
  g_drm_fd = open("/dev/dri/renderD128", O_RDWR | O_CLOEXEC);\
  if (g_drm_fd < 0) {\
    LOG(WARNING) << "headless: /dev/dri/renderD128 unavailable, "\
                    "DMA-BUF pixmaps disabled";\
    return false;\
  }\
\
  g_gbm_device = gbm_create_device(g_drm_fd);\
  if (!g_gbm_device) {\
    LOG(WARNING) << "headless: gbm_create_device failed";\
    close(g_drm_fd);\
    g_drm_fd = -1;\
    return false;\
  }\
\
  LOG(INFO) << "headless: GBM device created for DMA-BUF pixmaps";\
  return true;\
}\
\
static scoped_refptr<gfx::NativePixmap> CreateGbmPixmap(\
    gfx::Size size,\
    viz::SharedImageFormat format) {\
  uint32_t fourcc = GetFourCCFormatFromSharedImageFormat(format);\
  if (!fourcc) {\
    LOG(WARNING) << "headless: unsupported SharedImageFormat for GBM";\
    return nullptr;\
  }\
\
  constexpr uint32_t kFlags = GBM_BO_USE_RENDERING | GBM_BO_USE_LINEAR;\
  struct gbm_bo* bo = gbm_bo_create(\
      g_gbm_device, size.width(), size.height(), fourcc, kFlags);\
  if (!bo) {\
    LOG(WARNING) << "headless: gbm_bo_create failed "\
                 << size.width() << "x" << size.height();\
    return nullptr;\
  }\
\
  gfx::NativePixmapHandle handle;\
  handle.modifier = gbm_bo_get_modifier(bo);\
\
  int num_planes = gbm_bo_get_plane_count(bo);\
  for (int i = 0; i < num_planes; ++i) {\
    int fd = gbm_bo_get_fd(bo);\
    if (fd < 0) {\
      LOG(WARNING) << "headless: DMA-BUF fd unavailable for plane " << i;\
      gbm_bo_destroy(bo);\
      return nullptr;\
    }\
    uint32_t stride = gbm_bo_get_stride_for_plane(bo, i);\
    uint32_t offset = gbm_bo_get_offset(bo, i);\
    uint64_t plane_size = static_cast<uint64_t>(stride) * gbm_bo_get_height(bo);\
    handle.planes.emplace_back(\
        static_cast<int>(stride),\
        static_cast<int>(offset),\
        plane_size,\
        base::ScopedFD(fd));\
  }\
\
  gbm_bo_destroy(bo);\
\
  if (handle.planes.empty())\
    return nullptr;\
\
  LOG(INFO) << "headless: DMA-BUF pixmap " << size.width() << "x"\
            << size.height() << " planes=" << handle.planes.size()\
            << " fd=" << handle.planes[0].fd.get()\
            << " stride=" << handle.planes[0].stride\
            << " mod=0x" << std::hex << handle.modifier;\
\
  return new gfx::NativePixmapDmaBuf(size, format, std::move(handle));\
}\
' "$FACTORY_CC"

# ---- 3. Replace the CreateNativePixmap body ----
# The original body is just "return new TestPixmap(format);"
# We replace it with GBM-first, TestPixmap-fallback.
sed -i 's/  return new TestPixmap(format);/  if (EnsureGbmDevice()) {\
    auto pixmap = CreateGbmPixmap(size, format);\
    if (pixmap)\
      return pixmap;\
  }\
  return new TestPixmap(format);/' "$FACTORY_CC"

echo "==> Patching $BUILD_GN ..."

# ---- 4. Add deps to BUILD.gn ----
# //ui/gfx/linux:drm provides GetFourCCFormatFromSharedImageFormat + drm headers
# //third_party/minigbm provides <gbm.h> (via system pkg-config)
# //ui/gfx provides NativePixmapDmaBuf
# //build/config/linux/libdrm provides <drm_fourcc.h>
sed -i '/"\/\/ui\/platform_window",/a\
    "//ui/gfx",\
    "//ui/gfx/linux:drm",\
    "//third_party/minigbm",\
    "//build/config/linux/libdrm",' "$BUILD_GN"

echo "==> Patch applied successfully."
echo ""
echo "Files modified:"
echo "  - $FACTORY_CC"
echo "  - $BUILD_GN"
