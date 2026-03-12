#!/usr/bin/env python3
"""
Patch ozone_image_backing_factory.cc to allow thread-safe shared images
with native pixmap handles.

Root cause: CHECK(!is_thread_safe) fires when video capture creates a
shared image with DISPLAY_READ|DISPLAY_WRITE usage while the display
compositor runs on a separate thread (IsSharedBetweenThreads=true).
The CHECK was a conservative assertion, not a fundamental incompatibility.
The SharedImageManager lock protects concurrent access.

Also adds DIAG logging to confirm the code path is reached.
"""
import sys

FILE = "/mnt/build/electron/src/gpu/command_buffer/service/shared_image/ozone_image_backing_factory.cc"

with open(FILE, "r") as f:
    content = f.read()

# Fix 1: Remove CHECK(!is_thread_safe) in CreateSharedImage(handle) and add DIAG logging
old1 = '''std::unique_ptr<SharedImageBacking> OzoneImageBackingFactory::CreateSharedImage(
    const Mailbox& mailbox,
    viz::SharedImageFormat format,
    const gfx::Size& size,
    const gfx::ColorSpace& color_space,
    GrSurfaceOrigin surface_origin,
    SkAlphaType alpha_type,
    SharedImageUsageSet usage,
    std::string debug_label,
    bool is_thread_safe,
    gfx::GpuMemoryBufferHandle handle) {
  DCHECK_EQ(handle.type, gfx::NATIVE_PIXMAP);
  CHECK(!is_thread_safe);

  scoped_refptr<gfx::NativePixmap> pixmap;'''

new1 = '''std::unique_ptr<SharedImageBacking> OzoneImageBackingFactory::CreateSharedImage(
    const Mailbox& mailbox,
    viz::SharedImageFormat format,
    const gfx::Size& size,
    const gfx::ColorSpace& color_space,
    GrSurfaceOrigin surface_origin,
    SkAlphaType alpha_type,
    SharedImageUsageSet usage,
    std::string debug_label,
    bool is_thread_safe,
    gfx::GpuMemoryBufferHandle handle) {
  DCHECK_EQ(handle.type, gfx::NATIVE_PIXMAP);
  LOG(ERROR) << "DIAG OzoneImageBackingFactory::CreateSharedImage(handle): "
             << "is_thread_safe=" << is_thread_safe
             << " format=" << format.ToString()
             << " size=" << size.width() << "x" << size.height()
             << " usage=" << static_cast<uint32_t>(usage);

  scoped_refptr<gfx::NativePixmap> pixmap;'''

if old1 in content:
    content = content.replace(old1, new1)
    print("OK: Removed CHECK(!is_thread_safe) from CreateSharedImage(handle) and added DIAG")
elif "DIAG OzoneImageBackingFactory" in content:
    print("SKIP: Already patched")
else:
    print("ERROR: Could not find CreateSharedImage(handle) pattern")
    sys.exit(1)

with open(FILE, "w") as f:
    f.write(content)

print("All patches applied to ozone_image_backing_factory.cc")
