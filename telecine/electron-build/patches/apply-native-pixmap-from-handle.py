#!/usr/bin/env python3
"""Patch headless_surface_factory.cc to implement CreateNativePixmapFromHandle."""
import sys

FILE = "/mnt/build/electron/src/ui/ozone/platform/headless/headless_surface_factory.cc"

with open(FILE, "r") as f:
    content = f.read()

# Insert CreateNativePixmapFromHandle right after CreateNativePixmap
old = """void HeadlessSurfaceFactory::CheckBasePath() const {"""

new = """scoped_refptr<gfx::NativePixmap>
HeadlessSurfaceFactory::CreateNativePixmapFromHandle(
    gfx::AcceleratedWidget widget,
    gfx::Size size,
    viz::SharedImageFormat format,
    gfx::NativePixmapHandle handle) {
  LOG(INFO) << "headless: CreateNativePixmapFromHandle "
            << size.width() << "x" << size.height()
            << " planes=" << handle.planes.size()
            << " mod=0x" << std::hex << handle.modifier;
  return new gfx::NativePixmapDmaBuf(size, format, std::move(handle));
}

void HeadlessSurfaceFactory::CheckBasePath() const {"""

if "CreateNativePixmapFromHandle" not in content:
    if old in content:
        content = content.replace(old, new)
        print("OK: Added CreateNativePixmapFromHandle to headless_surface_factory.cc")
    else:
        print("ERROR: Could not find insertion point")
        sys.exit(1)
else:
    print("SKIP: Already patched")

with open(FILE, "w") as f:
    f.write(content)

# Also patch the header to declare the override
HFILE = "/mnt/build/electron/src/ui/ozone/platform/headless/headless_surface_factory.h"
with open(HFILE, "r") as f:
    hcontent = f.read()

old_h = """  scoped_refptr<gfx::NativePixmap> CreateNativePixmap("""
new_h = """  scoped_refptr<gfx::NativePixmap> CreateNativePixmapFromHandle(
      gfx::AcceleratedWidget widget,
      gfx::Size size,
      viz::SharedImageFormat format,
      gfx::NativePixmapHandle handle) override;
  scoped_refptr<gfx::NativePixmap> CreateNativePixmap("""

if "CreateNativePixmapFromHandle" not in hcontent:
    if old_h in hcontent:
        hcontent = hcontent.replace(old_h, new_h)
        print("OK: Added CreateNativePixmapFromHandle declaration to header")
    else:
        print("ERROR: Could not find insertion point in header")
        sys.exit(1)
else:
    print("SKIP: Header already patched")

with open(HFILE, "w") as f:
    f.write(hcontent)
