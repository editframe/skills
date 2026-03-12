/**
 * libgbm_cuda.c — Drop-in replacement for libgbm.so.1 backed by CUDA VMM.
 *
 * Implements the GBM API surface Chromium uses (~18 functions).
 * Buffer allocation uses cuMemCreate + cuMemExportToShareableHandle to produce
 * real DMA-BUF file descriptors backed by NVIDIA GPU memory, without /dev/dri.
 *
 * Build:
 *   gcc -shared -fPIC -Wl,--soname,libgbm.so.1 \
 *       -o libgbm.so.1 libgbm_cuda.c -ldl
 *
 * Install as /usr/lib/x86_64-linux-gnu/libgbm.so.1 (replaces Mesa's).
 */
#define _GNU_SOURCE
#include <dlfcn.h>
#include <errno.h>
#include <fcntl.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

/* ---- CUDA types (avoid header dependency) ---- */
typedef int CUresult;
typedef int CUdevice;
typedef void* CUcontext;
typedef unsigned long long CUmemGenericAllocationHandle;
typedef unsigned long long CUdeviceptr;

#define CU_MEM_ALLOC_TYPE_PINNED 1
#define CU_MEM_LOCATION_TYPE_DEVICE 1
#define CU_MEM_HANDLE_TYPE_POSIX_FILE_DESCRIPTOR 1
#define CU_MEM_ALLOC_GRANULARITY_MINIMUM 0
#define CU_MEM_ACCESS_FLAGS_PROT_READWRITE 3

typedef struct {
    unsigned int type;
    unsigned int requestedHandleTypes;
    struct { unsigned int type; int id; } location;
    void* win32HandleMetaData;
    struct { unsigned char a; unsigned char b; unsigned short c; unsigned char d[4]; } allocFlags;
} CUmemAllocationProp;

typedef struct {
    struct { unsigned int type; int id; } location;
    unsigned int flags;
} CUmemAccessDesc;

/* CUDA function pointers */
static CUresult (*cu_init)(unsigned int);
static CUresult (*cu_device_get)(CUdevice*, int);
static CUresult (*cu_ctx_create)(CUcontext*, unsigned int, CUdevice);
static CUresult (*cu_ctx_destroy)(CUcontext);
static CUresult (*cu_mem_get_granularity)(size_t*, const CUmemAllocationProp*, unsigned int);
static CUresult (*cu_mem_create)(CUmemGenericAllocationHandle*, size_t, const CUmemAllocationProp*, unsigned long long);
static CUresult (*cu_mem_export)(void*, CUmemGenericAllocationHandle, unsigned int, unsigned long long);
static CUresult (*cu_mem_release)(CUmemGenericAllocationHandle);
static CUresult (*cu_mem_addr_reserve)(CUdeviceptr*, size_t, size_t, CUdeviceptr, unsigned long long);
static CUresult (*cu_mem_map)(CUdeviceptr, size_t, size_t, CUmemGenericAllocationHandle, unsigned long long);
static CUresult (*cu_mem_set_access)(CUdeviceptr, size_t, const CUmemAccessDesc*, size_t);
static CUresult (*cu_mem_unmap)(CUdeviceptr, size_t);
static CUresult (*cu_mem_addr_free)(CUdeviceptr, size_t);
static CUresult (*cu_get_error)(CUresult, const char**);

/* ---- GBM format constants (from gbm.h / DRM fourcc) ---- */
#define GBM_FORMAT_ARGB8888  0x34325241
#define GBM_FORMAT_XRGB8888  0x34325258
#define GBM_FORMAT_ABGR8888  0x34324241
#define GBM_FORMAT_XBGR8888  0x34324258
#define GBM_FORMAT_RGB565    0x36314752
#define GBM_FORMAT_ARGB2101010 0x30335241
#define GBM_FORMAT_ABGR2101010 0x30334241
#define GBM_FORMAT_R8        0x20203852
#define GBM_FORMAT_GR88      0x38385247
#define GBM_FORMAT_NV12      0x3231564E

#define GBM_BO_USE_SCANOUT        (1 << 0)
#define GBM_BO_USE_RENDERING      (1 << 2)
#define GBM_BO_USE_LINEAR         (1 << 4)
#define GBM_BO_TRANSFER_READ_WRITE 3
#define GBM_BO_IMPORT_FD_MODIFIER 4

#define DRM_FORMAT_MOD_LINEAR 0ULL
#define DRM_FORMAT_MOD_INVALID ((1ULL << 56) - 1)

/* ---- Internal structures ---- */

struct gbm_device {
    int fd;                     /* original DRM fd (ignored) */
    CUcontext cuda_ctx;
    CUdevice cuda_dev;
    size_t granularity;
    int initialized;
};

struct gbm_bo {
    struct gbm_device *device;
    uint32_t width;
    uint32_t height;
    uint32_t format;
    uint32_t stride;
    size_t alloc_size;
    int dmabuf_fd;
    CUmemGenericAllocationHandle alloc_handle;
    CUdeviceptr gpu_addr;
    uint64_t modifier;
};

struct gbm_import_fd_modifier_data {
    uint32_t width;
    uint32_t height;
    uint32_t format;
    uint32_t num_fds;
    int fds[4];
    int strides[4];
    int offsets[4];
    uint64_t modifier;
};

/* ---- CUDA init ---- */

static void *cuda_lib = NULL;

static int load_cuda(void) {
    if (cuda_lib) return 0;
    cuda_lib = dlopen("libcuda.so.1", RTLD_NOW);
    if (!cuda_lib) return -1;

    #define LOAD(sym, name) sym = dlsym(cuda_lib, name); if (!sym) return -1;
    LOAD(cu_init, "cuInit");
    LOAD(cu_device_get, "cuDeviceGet");
    LOAD(cu_ctx_create, "cuCtxCreate_v2");
    LOAD(cu_ctx_destroy, "cuCtxDestroy_v2");
    LOAD(cu_mem_get_granularity, "cuMemGetAllocationGranularity");
    LOAD(cu_mem_create, "cuMemCreate");
    LOAD(cu_mem_export, "cuMemExportToShareableHandle");
    LOAD(cu_mem_release, "cuMemRelease");
    LOAD(cu_mem_addr_reserve, "cuMemAddressReserve");
    LOAD(cu_mem_map, "cuMemMap");
    LOAD(cu_mem_set_access, "cuMemSetAccess");
    LOAD(cu_mem_unmap, "cuMemUnmap");
    LOAD(cu_mem_addr_free, "cuMemAddressFree");
    LOAD(cu_get_error, "cuGetErrorName");
    #undef LOAD
    return 0;
}

static int bpp_for_format(uint32_t format) {
    switch (format) {
        case GBM_FORMAT_ARGB8888:
        case GBM_FORMAT_XRGB8888:
        case GBM_FORMAT_ABGR8888:
        case GBM_FORMAT_XBGR8888:
        case GBM_FORMAT_ARGB2101010:
        case GBM_FORMAT_ABGR2101010:
            return 4;
        case GBM_FORMAT_RGB565:
        case GBM_FORMAT_GR88:
            return 2;
        case GBM_FORMAT_R8:
            return 1;
        case GBM_FORMAT_NV12:
            return 1; /* Y plane bpp; total is 1.5x */
        default:
            return 4;
    }
}

/* ---- GBM API implementation ---- */

struct gbm_device *gbm_create_device(int fd) {
    fprintf(stderr, "[libgbm_cuda] gbm_create_device(fd=%d) called\n", fd);
    if (load_cuda() != 0) { fprintf(stderr, "[libgbm_cuda] CUDA load failed\n"); return NULL; }
    fprintf(stderr, "[libgbm_cuda] CUDA loaded OK\n");

    struct gbm_device *dev = calloc(1, sizeof(*dev));
    if (!dev) return NULL;
    dev->fd = fd;

    CUresult r;
    r = cu_init(0);
    if (r != 0) { fprintf(stderr, "[libgbm_cuda] cuInit failed: %d\n", r); free(dev); return NULL; }
    fprintf(stderr, "[libgbm_cuda] cuInit OK\n");

    r = cu_device_get(&dev->cuda_dev, 0);
    if (r != 0) { fprintf(stderr, "[libgbm_cuda] cuDeviceGet failed: %d\n", r); free(dev); return NULL; }
    fprintf(stderr, "[libgbm_cuda] cuDeviceGet OK (dev=%d)\n", dev->cuda_dev);

    r = cu_ctx_create(&dev->cuda_ctx, 0, dev->cuda_dev);
    if (r != 0) { fprintf(stderr, "[libgbm_cuda] cuCtxCreate failed: %d\n", r); free(dev); return NULL; }
    fprintf(stderr, "[libgbm_cuda] cuCtxCreate OK\n");

    CUmemAllocationProp prop;
    memset(&prop, 0, sizeof(prop));
    prop.type = CU_MEM_ALLOC_TYPE_PINNED;
    prop.requestedHandleTypes = CU_MEM_HANDLE_TYPE_POSIX_FILE_DESCRIPTOR;
    prop.location.type = CU_MEM_LOCATION_TYPE_DEVICE;
    prop.location.id = dev->cuda_dev;

    r = cu_mem_get_granularity(&dev->granularity, &prop, CU_MEM_ALLOC_GRANULARITY_MINIMUM);
    if (r != 0) { fprintf(stderr, "[libgbm_cuda] cuMemGetGranularity failed: %d\n", r); cu_ctx_destroy(dev->cuda_ctx); free(dev); return NULL; }

    dev->initialized = 1;
    fprintf(stderr, "[libgbm_cuda] gbm_create_device OK (granularity=%zu)\n", dev->granularity);
    return dev;
}

const char *gbm_device_get_backend_name(struct gbm_device *dev) {
    (void)dev;
    return "cuda";
}

void gbm_device_destroy(struct gbm_device *dev) {
    if (!dev) return;
    if (dev->cuda_ctx) cu_ctx_destroy(dev->cuda_ctx);
    free(dev);
}

int gbm_device_get_fd(struct gbm_device *dev) {
    return dev ? dev->fd : -1;
}

int gbm_device_is_format_supported(struct gbm_device *dev, uint32_t format, uint32_t usage) {
    (void)dev; (void)usage;
    switch (format) {
        case GBM_FORMAT_ARGB8888:
        case GBM_FORMAT_XRGB8888:
        case GBM_FORMAT_ABGR8888:
        case GBM_FORMAT_XBGR8888:
        case GBM_FORMAT_RGB565:
        case GBM_FORMAT_R8:
        case GBM_FORMAT_GR88:
        case GBM_FORMAT_ARGB2101010:
        case GBM_FORMAT_ABGR2101010:
            return 1;
        default:
            return 0;
    }
}

int gbm_device_get_format_modifier_plane_count(struct gbm_device *dev,
                                                 uint32_t format,
                                                 uint64_t modifier) {
    (void)dev; (void)format; (void)modifier;
    return 1; /* single plane for all RGBA formats */
}

static struct gbm_bo *alloc_bo(struct gbm_device *dev,
                                uint32_t width, uint32_t height,
                                uint32_t format) {
    if (!dev || !dev->initialized) return NULL;

    int bytes = bpp_for_format(format);
    uint32_t stride = width * bytes;
    /* Align stride to 256 bytes for GPU efficiency */
    stride = (stride + 255) & ~255;

    size_t raw_size = (size_t)stride * height;
    /* NV12: add UV plane (half height, same stride) */
    if (format == GBM_FORMAT_NV12)
        raw_size = (size_t)stride * height * 3 / 2;

    size_t aligned = ((raw_size + dev->granularity - 1) / dev->granularity) * dev->granularity;

    CUmemAllocationProp prop;
    memset(&prop, 0, sizeof(prop));
    prop.type = CU_MEM_ALLOC_TYPE_PINNED;
    prop.requestedHandleTypes = CU_MEM_HANDLE_TYPE_POSIX_FILE_DESCRIPTOR;
    prop.location.type = CU_MEM_LOCATION_TYPE_DEVICE;
    prop.location.id = dev->cuda_dev;

    fprintf(stderr, "[libgbm_cuda] alloc_bo: %ux%u fmt=0x%x stride=%u raw=%zu aligned=%zu\n",
            width, height, format, stride, raw_size, aligned);

    CUmemGenericAllocationHandle handle = 0;
    CUresult r = cu_mem_create(&handle, aligned, &prop, 0);
    if (r != 0) {
        const char *name = NULL;
        if (cu_get_error) cu_get_error(r, &name);
        fprintf(stderr, "[libgbm_cuda] alloc_bo: cuMemCreate FAILED: %d (%s)\n", r, name ? name : "?");
        return NULL;
    }

    int fd = -1;
    r = cu_mem_export(&fd, handle, CU_MEM_HANDLE_TYPE_POSIX_FILE_DESCRIPTOR, 0);
    if (r != 0) {
        const char *name = NULL;
        if (cu_get_error) cu_get_error(r, &name);
        fprintf(stderr, "[libgbm_cuda] alloc_bo: cuMemExport FAILED: %d (%s)\n", r, name ? name : "?");
        cu_mem_release(handle);
        return NULL;
    }

    fprintf(stderr, "[libgbm_cuda] alloc_bo: OK fd=%d handle=%llu\n", fd, handle);

    struct gbm_bo *bo = calloc(1, sizeof(*bo));
    if (!bo) { close(fd); cu_mem_release(handle); return NULL; }

    bo->device = dev;
    bo->width = width;
    bo->height = height;
    bo->format = format;
    bo->stride = stride;
    bo->alloc_size = aligned;
    bo->dmabuf_fd = fd;
    bo->alloc_handle = handle;
    bo->modifier = DRM_FORMAT_MOD_LINEAR;
    return bo;
}

struct gbm_bo *gbm_bo_create(struct gbm_device *dev,
                               uint32_t width, uint32_t height,
                               uint32_t format, uint32_t flags) {
    (void)flags;
    return alloc_bo(dev, width, height, format);
}

struct gbm_bo *gbm_bo_create_with_modifiers(struct gbm_device *dev,
                                              uint32_t width, uint32_t height,
                                              uint32_t format,
                                              const uint64_t *modifiers,
                                              const unsigned int count) {
    (void)modifiers; (void)count;
    return alloc_bo(dev, width, height, format);
}

struct gbm_bo *gbm_bo_create_with_modifiers2(struct gbm_device *dev,
                                               uint32_t width, uint32_t height,
                                               uint32_t format,
                                               const uint64_t *modifiers,
                                               const unsigned int count,
                                               uint32_t flags) {
    (void)modifiers; (void)count; (void)flags;
    return alloc_bo(dev, width, height, format);
}

struct gbm_bo *gbm_bo_import(struct gbm_device *dev, uint32_t type,
                              void *buffer, uint32_t usage) {
    (void)usage;
    if (type != GBM_BO_IMPORT_FD_MODIFIER || !buffer) {
        errno = EINVAL;
        return NULL;
    }
    struct gbm_import_fd_modifier_data *data = buffer;
    struct gbm_bo *bo = calloc(1, sizeof(*bo));
    if (!bo) return NULL;

    bo->device = dev;
    bo->width = data->width;
    bo->height = data->height;
    bo->format = data->format;
    bo->stride = data->strides[0];
    bo->dmabuf_fd = (data->num_fds > 0) ? dup(data->fds[0]) : -1;
    bo->modifier = data->modifier;
    bo->alloc_handle = 0; /* imported, not owned */
    return bo;
}

void gbm_bo_destroy(struct gbm_bo *bo) {
    if (!bo) return;
    if (bo->gpu_addr) {
        cu_mem_unmap(bo->gpu_addr, bo->alloc_size);
        cu_mem_addr_free(bo->gpu_addr, bo->alloc_size);
    }
    if (bo->dmabuf_fd >= 0) {
        /* Use real close to avoid our LD_PRELOAD close interceptor */
        static int (*real_close)(int) = NULL;
        if (!real_close) real_close = dlsym(RTLD_NEXT, "close");
        if (real_close) real_close(bo->dmabuf_fd);
        else close(bo->dmabuf_fd);
    }
    if (bo->alloc_handle) cu_mem_release(bo->alloc_handle);
    free(bo);
}

uint32_t gbm_bo_get_width(struct gbm_bo *bo) { return bo ? bo->width : 0; }
uint32_t gbm_bo_get_height(struct gbm_bo *bo) { return bo ? bo->height : 0; }
uint32_t gbm_bo_get_format(struct gbm_bo *bo) { return bo ? bo->format : 0; }
uint32_t gbm_bo_get_bpp(struct gbm_bo *bo) { return bo ? bpp_for_format(bo->format) * 8 : 0; }
uint64_t gbm_bo_get_modifier(struct gbm_bo *bo) { return bo ? bo->modifier : DRM_FORMAT_MOD_INVALID; }
struct gbm_device *gbm_bo_get_device(struct gbm_bo *bo) { return bo ? bo->device : NULL; }
int gbm_bo_get_plane_count(struct gbm_bo *bo) { (void)bo; return 1; }
uint32_t gbm_bo_get_stride(struct gbm_bo *bo) { return bo ? bo->stride : 0; }
uint32_t gbm_bo_get_stride_for_plane(struct gbm_bo *bo, int plane) { (void)plane; return bo ? bo->stride : 0; }
uint32_t gbm_bo_get_offset(struct gbm_bo *bo, int plane) { (void)bo; (void)plane; return 0; }

union gbm_bo_handle {
    void *ptr;
    int32_t s32;
    uint32_t u32;
    int64_t s64;
    uint64_t u64;
};

union gbm_bo_handle gbm_bo_get_handle(struct gbm_bo *bo) {
    union gbm_bo_handle h;
    h.u64 = 0;
    if (bo) h.s32 = bo->dmabuf_fd;
    return h;
}

union gbm_bo_handle gbm_bo_get_handle_for_plane(struct gbm_bo *bo, int plane) {
    (void)plane;
    return gbm_bo_get_handle(bo);
}

int gbm_bo_get_fd(struct gbm_bo *bo) {
    return bo ? dup(bo->dmabuf_fd) : -1;
}

int gbm_bo_get_fd_for_plane(struct gbm_bo *bo, int plane) {
    (void)plane;
    return bo ? dup(bo->dmabuf_fd) : -1;
}

void *gbm_bo_map(struct gbm_bo *bo, uint32_t x, uint32_t y,
                  uint32_t width, uint32_t height,
                  uint32_t flags, uint32_t *stride, void **map_data) {
    (void)x; (void)y; (void)width; (void)height; (void)flags;
    if (!bo || !bo->device) return NULL;

    if (!bo->gpu_addr) {
        CUdeviceptr dptr = 0;
        CUresult r;
        r = cu_mem_addr_reserve(&dptr, bo->alloc_size, bo->device->granularity, 0, 0);
        if (r != 0) return NULL;
        r = cu_mem_map(dptr, bo->alloc_size, 0, bo->alloc_handle, 0);
        if (r != 0) { cu_mem_addr_free(dptr, bo->alloc_size); return NULL; }

        CUmemAccessDesc acc;
        acc.location.type = CU_MEM_LOCATION_TYPE_DEVICE;
        acc.location.id = bo->device->cuda_dev;
        acc.flags = CU_MEM_ACCESS_FLAGS_PROT_READWRITE;
        r = cu_mem_set_access(dptr, bo->alloc_size, &acc, 1);
        if (r != 0) {
            cu_mem_unmap(dptr, bo->alloc_size);
            cu_mem_addr_free(dptr, bo->alloc_size);
            return NULL;
        }
        bo->gpu_addr = dptr;
    }

    if (stride) *stride = bo->stride;
    if (map_data) *map_data = (void*)(uintptr_t)1; /* non-NULL sentinel */
    return (void*)bo->gpu_addr;
}

void gbm_bo_unmap(struct gbm_bo *bo, void *map_data) {
    (void)bo; (void)map_data;
    /* Keep mapping alive; freed in gbm_bo_destroy */
}

int gbm_bo_write(struct gbm_bo *bo, const void *buf, size_t count) {
    (void)bo; (void)buf; (void)count;
    return -1;
}

void gbm_bo_set_user_data(struct gbm_bo *bo, void *data,
                           void (*destroy)(struct gbm_bo*, void*)) {
    (void)bo; (void)data; (void)destroy;
}

void *gbm_bo_get_user_data(struct gbm_bo *bo) {
    (void)bo;
    return NULL;
}

/* ---- Surface stubs (not used by Chromium offscreen) ---- */

struct gbm_surface;

struct gbm_surface *gbm_surface_create(struct gbm_device *dev,
                                         uint32_t width, uint32_t height,
                                         uint32_t format, uint32_t flags) {
    (void)dev; (void)width; (void)height; (void)format; (void)flags;
    return NULL;
}

struct gbm_surface *gbm_surface_create_with_modifiers(struct gbm_device *dev,
                                                        uint32_t width, uint32_t height,
                                                        uint32_t format,
                                                        const uint64_t *modifiers,
                                                        const unsigned int count) {
    (void)dev; (void)width; (void)height; (void)format; (void)modifiers; (void)count;
    return NULL;
}

void gbm_surface_destroy(struct gbm_surface *surface) { (void)surface; }

struct gbm_bo *gbm_surface_lock_front_buffer(struct gbm_surface *surface) {
    (void)surface; return NULL;
}

void gbm_surface_release_buffer(struct gbm_surface *surface, struct gbm_bo *bo) {
    (void)surface; (void)bo;
}

int gbm_surface_has_free_buffers(struct gbm_surface *surface) {
    (void)surface; return 0;
}
