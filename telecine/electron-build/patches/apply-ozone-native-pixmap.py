#!/usr/bin/env python3
"""Patch ozone_platform_headless.cc to report supports_native_pixmaps=true."""
import sys

FILE = "/mnt/build/electron/src/ui/ozone/platform/headless/ozone_platform_headless.cc"

with open(FILE, "r") as f:
    content = f.read()

# 1. Add gfx/buffer_format_util.h include
old_inc = '#include "ui/platform_window/platform_window_init_properties.h"'
new_inc = old_inc + '\n#include "ui/gfx/buffer_format_util.h"'
if "buffer_format_util.h" not in content:
    content = content.replace(old_inc, new_inc)
    print("OK: Added buffer_format_util.h include")
else:
    print("SKIP: buffer_format_util.h already included")

# 2. Insert GetPlatformRuntimeProperties and IsNativePixmapConfigSupported
old_block = '// Desktop Linux, not CastOS.\n#if BUILDFLAG(IS_LINUX) && !BUILDFLAG(IS_CASTOS)\n  const PlatformProperties& GetPlatformProperties() override {'

new_block = """  const PlatformRuntimeProperties& GetPlatformRuntimeProperties() override {
    static PlatformRuntimeProperties properties;
    properties.supports_native_pixmaps = true;
    return properties;
  }

  bool IsNativePixmapConfigSupported(gfx::BufferFormat format,
                                     gfx::BufferUsage usage) const override {
    return format == gfx::BufferFormat::BGRA_8888 ||
           format == gfx::BufferFormat::RGBA_8888 ||
           format == gfx::BufferFormat::BGRX_8888 ||
           format == gfx::BufferFormat::RGBX_8888;
  }

// Desktop Linux, not CastOS.
#if BUILDFLAG(IS_LINUX) && !BUILDFLAG(IS_CASTOS)
  const PlatformProperties& GetPlatformProperties() override {"""

if "supports_native_pixmaps = true" not in content:
    if old_block in content:
        content = content.replace(old_block, new_block)
        print("OK: Added GetPlatformRuntimeProperties and IsNativePixmapConfigSupported overrides")
    else:
        print("ERROR: Could not find insertion point for overrides")
        sys.exit(1)
else:
    print("SKIP: Already patched")

with open(FILE, "w") as f:
    f.write(content)
