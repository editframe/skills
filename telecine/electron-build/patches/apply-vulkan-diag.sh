#!/bin/bash
# Diagnostic patches for VulkanImage DMA-BUF import investigation
set -e

SRCDIR=/mnt/build/electron/src
FILE="$SRCDIR/gpu/vulkan/vulkan_image_linux.cc"

python3 -c "
with open('$FILE', 'r') as f:
    content = f.read()

old = '''bool VulkanImage::InitializeFromGpuMemoryBufferHandle(
    VulkanDeviceQueue* device_queue,
    gfx::GpuMemoryBufferHandle gmb_handle,
    const gfx::Size& size,
    VkFormat format,
    VkImageUsageFlags usage,
    VkImageCreateFlags flags,
    VkImageTiling image_tiling,
    uint32_t queue_family_index) {
  if (gmb_handle.type != gfx::GpuMemoryBufferType::NATIVE_PIXMAP) {
    DLOG(ERROR) << \"GpuMemoryBuffer is not supported. type:\" << gmb_handle.type;
    return false;
  }

  queue_family_index_ = queue_family_index;
  auto native_pixmap_handle = std::move(gmb_handle).native_pixmap_handle();

  auto& scoped_fd = native_pixmap_handle.planes[0].fd;
  if (!scoped_fd.is_valid()) {
    DLOG(ERROR) << \"GpuMemoryBufferHandle doesn't have a valid fd.\";
    return false;
  }

  bool using_modifier =
      native_pixmap_handle.modifier != gfx::NativePixmapHandle::kNoModifier &&
      gfx::HasExtension(device_queue->enabled_extensions(),
                        VK_EXT_IMAGE_DRM_FORMAT_MODIFIER_EXTENSION_NAME);'''

new = '''bool VulkanImage::InitializeFromGpuMemoryBufferHandle(
    VulkanDeviceQueue* device_queue,
    gfx::GpuMemoryBufferHandle gmb_handle,
    const gfx::Size& size,
    VkFormat format,
    VkImageUsageFlags usage,
    VkImageCreateFlags flags,
    VkImageTiling image_tiling,
    uint32_t queue_family_index) {
  LOG(ERROR) << \"DIAG VulkanImage::InitializeFromGpuMemoryBufferHandle: \"
             << \"size=\" << size.width() << \"x\" << size.height()
             << \" format=\" << format
             << \" tiling=\" << image_tiling
             << \" type=\" << gmb_handle.type;
  if (gmb_handle.type != gfx::GpuMemoryBufferType::NATIVE_PIXMAP) {
    DLOG(ERROR) << \"GpuMemoryBuffer is not supported. type:\" << gmb_handle.type;
    return false;
  }

  queue_family_index_ = queue_family_index;
  auto native_pixmap_handle = std::move(gmb_handle).native_pixmap_handle();

  auto& scoped_fd = native_pixmap_handle.planes[0].fd;
  if (!scoped_fd.is_valid()) {
    DLOG(ERROR) << \"GpuMemoryBufferHandle doesn't have a valid fd.\";
    return false;
  }

  LOG(ERROR) << \"DIAG VulkanImage: fd=\" << scoped_fd.get()
             << \" modifier=0x\" << std::hex << native_pixmap_handle.modifier
             << \" planes=\" << std::dec << native_pixmap_handle.planes.size()
             << \" stride=\" << native_pixmap_handle.planes[0].stride
             << \" offset=\" << native_pixmap_handle.planes[0].offset;

  bool using_modifier =
      native_pixmap_handle.modifier != gfx::NativePixmapHandle::kNoModifier &&
      gfx::HasExtension(device_queue->enabled_extensions(),
                        VK_EXT_IMAGE_DRM_FORMAT_MODIFIER_EXTENSION_NAME);
  LOG(ERROR) << \"DIAG VulkanImage: using_modifier=\" << using_modifier
             << \" has_drm_ext=\" << gfx::HasExtension(device_queue->enabled_extensions(), VK_EXT_IMAGE_DRM_FORMAT_MODIFIER_EXTENSION_NAME)
             << \" has_dmabuf_ext=\" << gfx::HasExtension(device_queue->enabled_extensions(), VK_EXT_EXTERNAL_MEMORY_DMA_BUF_EXTENSION_NAME);'''

if old not in content:
    print('WARNING: InitializeFromGpuMemoryBufferHandle pattern not found')
else:
    content = content.replace(old, new)
    with open('$FILE', 'w') as f:
        f.write(content)
    print('OK: Patched InitializeFromGpuMemoryBufferHandle entry')
"

# Add logging around the vkCreateImage / memory import
python3 -c "
with open('$FILE', 'r') as f:
    content = f.read()

old = '''  // TODO support multiple plane
  bool result = InitializeSingleOrJointPlanes(
      device_queue, size, format, usage, flags, image_tiling,
      &external_image_create_info, &import_memory_fd_info, requirements);
  // If Initialize successfully, the fd in scoped_fd should be owned by vulkan,
  // otherwise take the ownership of the fd back.
  if (!result) {
    scoped_fd.reset(memory_fd);
  }

  return result;'''

new = '''  // TODO support multiple plane
  LOG(ERROR) << \"DIAG VulkanImage: calling InitializeSingleOrJointPlanes...\";
  bool result = InitializeSingleOrJointPlanes(
      device_queue, size, format, usage, flags, image_tiling,
      &external_image_create_info, &import_memory_fd_info, requirements);
  LOG(ERROR) << \"DIAG VulkanImage: InitializeSingleOrJointPlanes returned \" << result;
  // If Initialize successfully, the fd in scoped_fd should be owned by vulkan,
  // otherwise take the ownership of the fd back.
  if (!result) {
    scoped_fd.reset(memory_fd);
  }

  return result;'''

if old not in content:
    print('WARNING: InitializeSingleOrJointPlanes call pattern not found')
else:
    content = content.replace(old, new)
    with open('$FILE', 'w') as f:
        f.write(content)
    print('OK: Patched InitializeSingleOrJointPlanes call')
"

echo "--- vulkan_image_linux.cc done ---"

# Also patch InitializeSingleOrJointPlanes in vulkan_image.cc to log vkCreateImage result
FILE="$SRCDIR/gpu/vulkan/vulkan_image.cc"

python3 -c "
with open('$FILE', 'r') as f:
    content = f.read()

old = '''  VkResult result = vkCreateImage(vk_device, &create_info_,
                                  nullptr /* pAllocator */, &image_);
  create_info_.pNext = nullptr;

  if (result != VK_SUCCESS) {
    DLOG(ERROR) << \"vkCreateImage failed result:\" << result;
    return false;
  }

  return true;'''

new = '''  LOG(ERROR) << \"DIAG VulkanImage::CreateVkImage: format=\" << create_info_.format
             << \" tiling=\" << create_info_.tiling
             << \" size=\" << create_info_.extent.width << \"x\" << create_info_.extent.height
             << \" has_pNext=\" << (create_info_.pNext != nullptr);
  VkResult result = vkCreateImage(vk_device, &create_info_,
                                  nullptr /* pAllocator */, &image_);
  create_info_.pNext = nullptr;

  LOG(ERROR) << \"DIAG VulkanImage::CreateVkImage: vkCreateImage returned \" << result;
  if (result != VK_SUCCESS) {
    DLOG(ERROR) << \"vkCreateImage failed result:\" << result;
    return false;
  }

  return true;'''

if old not in content:
    print('WARNING: vkCreateImage pattern not found')
else:
    content = content.replace(old, new)
    with open('$FILE', 'w') as f:
        f.write(content)
    print('OK: Patched vkCreateImage')
"

echo "--- vulkan_image.cc done ---"
echo "All vulkan diagnostic patches applied."
