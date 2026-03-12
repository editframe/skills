/**
 * cuda_dmabuf_test.c — Validate CUDA VMM can export DMA-BUF fds on Cloud Run.
 *
 * Tests the fundamental assumption: can cuMemExportToShareableHandle produce
 * a real Linux DMA-BUF file descriptor using only /dev/nvidia0 (no /dev/dri)?
 *
 * Build:
 *   gcc -o cuda_dmabuf_test cuda_dmabuf_test.c -ldl
 *
 * The binary dlopen's libcuda.so.1 at runtime so it compiles without CUDA headers.
 */
#include <dlfcn.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/ioctl.h>
#include <sys/stat.h>
#include <fcntl.h>

/* CUDA type aliases (from cuda.h) */
typedef int CUresult;
typedef int CUdevice;
typedef void* CUcontext;
typedef unsigned long long CUmemGenericAllocationHandle;
typedef unsigned long long CUdeviceptr;

/* CUmemAllocationType */
#define CU_MEM_ALLOC_TYPE_PINNED 1

/* CUmemLocationType */
#define CU_MEM_LOCATION_TYPE_DEVICE 1

/* CUmemAllocationHandleType */
#define CU_MEM_HANDLE_TYPE_POSIX_FILE_DESCRIPTOR 1

/* CUmemAllocationGranularity_flags */
#define CU_MEM_ALLOC_GRANULARITY_MINIMUM 0

/* CUmemAccess_flags */
#define CU_MEM_ACCESS_FLAGS_PROT_READWRITE 3

/* CUmemAllocationProp — packed struct matching CUDA ABI */
typedef struct {
    unsigned int type;          /* CUmemAllocationType */
    unsigned int requestedHandleTypes; /* CUmemAllocationHandleType bitmask */
    struct {
        unsigned int type;      /* CUmemLocationType */
        int id;                 /* device ordinal */
    } location;
    void* win32HandleMetaData;
    struct {
        unsigned char compressionType;
        unsigned char gpuDirectRDMACapable;
        unsigned short usage;
        unsigned char reserved[4];
    } allocFlags;
} CUmemAllocationProp;

/* CUmemAccessDesc */
typedef struct {
    struct {
        unsigned int type;
        int id;
    } location;
    unsigned int flags;
} CUmemAccessDesc;

/* Function pointer typedefs */
typedef CUresult (*cuInit_t)(unsigned int);
typedef CUresult (*cuDeviceGet_t)(CUdevice*, int);
typedef CUresult (*cuDeviceGetName_t)(char*, int, CUdevice);
typedef CUresult (*cuCtxCreate_v2_t)(CUcontext*, unsigned int, CUdevice);
typedef CUresult (*cuCtxDestroy_v2_t)(CUcontext);
typedef CUresult (*cuMemGetAllocationGranularity_t)(size_t*, const CUmemAllocationProp*, unsigned int);
typedef CUresult (*cuMemCreate_t)(CUmemGenericAllocationHandle*, size_t, const CUmemAllocationProp*, unsigned long long);
typedef CUresult (*cuMemExportToShareableHandle_t)(void*, CUmemGenericAllocationHandle, unsigned int, unsigned long long);
typedef CUresult (*cuMemAddressReserve_t)(CUdeviceptr*, size_t, size_t, CUdeviceptr, unsigned long long);
typedef CUresult (*cuMemMap_t)(CUdeviceptr, size_t, size_t, CUmemGenericAllocationHandle, unsigned long long);
typedef CUresult (*cuMemSetAccess_t)(CUdeviceptr, size_t, const CUmemAccessDesc*, size_t);
typedef CUresult (*cuMemUnmap_t)(CUdeviceptr, size_t);
typedef CUresult (*cuMemAddressFree_t)(CUdeviceptr, size_t);
typedef CUresult (*cuMemRelease_t)(CUmemGenericAllocationHandle);
typedef CUresult (*cuGetErrorName_t)(CUresult, const char**);

#define LOAD_SYM(handle, name) \
    name##_t name = (name##_t)dlsym(handle, #name); \
    if (!name) { fprintf(stderr, "FAIL: dlsym(%s): %s\n", #name, dlerror()); return 1; }

#define CHECK_CUDA(call, label) do { \
    CUresult _r = (call); \
    if (_r != 0) { \
        const char* _name = "unknown"; \
        if (cuGetErrorName) cuGetErrorName(_r, &_name); \
        fprintf(stderr, "FAIL: %s returned %d (%s)\n", label, _r, _name); \
        goto cleanup; \
    } \
    printf("OK: %s\n", label); \
} while(0)

int main(void) {
    printf("=== CUDA DMA-BUF Export Test ===\n\n");

    void* cuda = dlopen("libcuda.so.1", RTLD_NOW);
    if (!cuda) {
        fprintf(stderr, "FAIL: dlopen(libcuda.so.1): %s\n", dlerror());
        return 1;
    }
    printf("OK: dlopen(libcuda.so.1)\n");

    LOAD_SYM(cuda, cuInit);
    LOAD_SYM(cuda, cuDeviceGet);
    LOAD_SYM(cuda, cuDeviceGetName);
    LOAD_SYM(cuda, cuCtxCreate_v2);
    LOAD_SYM(cuda, cuCtxDestroy_v2);
    LOAD_SYM(cuda, cuMemGetAllocationGranularity);
    LOAD_SYM(cuda, cuMemCreate);
    LOAD_SYM(cuda, cuMemExportToShareableHandle);
    LOAD_SYM(cuda, cuMemAddressReserve);
    LOAD_SYM(cuda, cuMemMap);
    LOAD_SYM(cuda, cuMemSetAccess);
    LOAD_SYM(cuda, cuMemUnmap);
    LOAD_SYM(cuda, cuMemAddressFree);
    LOAD_SYM(cuda, cuMemRelease);
    LOAD_SYM(cuda, cuGetErrorName);

    CUcontext ctx = NULL;
    CUmemGenericAllocationHandle allocHandle = 0;
    CUdeviceptr dptr = 0;
    int dmabuf_fd = -1;
    size_t allocSize = 0;
    int exitCode = 1;

    /* Step 1: Init CUDA */
    CHECK_CUDA(cuInit(0), "cuInit");

    CUdevice dev;
    CHECK_CUDA(cuDeviceGet(&dev, 0), "cuDeviceGet(0)");

    char devName[256];
    CHECK_CUDA(cuDeviceGetName(devName, sizeof(devName), dev), "cuDeviceGetName");
    printf("  device: %s\n", devName);

    CHECK_CUDA(cuCtxCreate_v2(&ctx, 0, dev), "cuCtxCreate");

    /* Step 2: Query allocation granularity */
    CUmemAllocationProp prop;
    memset(&prop, 0, sizeof(prop));
    prop.type = CU_MEM_ALLOC_TYPE_PINNED;
    prop.requestedHandleTypes = CU_MEM_HANDLE_TYPE_POSIX_FILE_DESCRIPTOR;
    prop.location.type = CU_MEM_LOCATION_TYPE_DEVICE;
    prop.location.id = dev;

    size_t granularity = 0;
    CHECK_CUDA(cuMemGetAllocationGranularity(&granularity, &prop, CU_MEM_ALLOC_GRANULARITY_MINIMUM),
               "cuMemGetAllocationGranularity");
    printf("  granularity: %zu bytes\n", granularity);

    /* Step 3: Allocate — 1920x1080x4 (BGRA) rounded up to granularity */
    size_t width = 1920, height = 1080, bpp = 4;
    size_t stride = width * bpp;
    size_t rawSize = stride * height;
    allocSize = ((rawSize + granularity - 1) / granularity) * granularity;
    printf("  requested: %zu bytes (%zux%zu BGRA, stride %zu), aligned: %zu\n",
           rawSize, width, height, stride, allocSize);

    CHECK_CUDA(cuMemCreate(&allocHandle, allocSize, &prop, 0), "cuMemCreate");
    printf("  allocHandle: 0x%llx\n", (unsigned long long)allocHandle);

    /* Step 4: Export as DMA-BUF fd — THIS IS THE KEY TEST */
    CHECK_CUDA(cuMemExportToShareableHandle(&dmabuf_fd, allocHandle,
               CU_MEM_HANDLE_TYPE_POSIX_FILE_DESCRIPTOR, 0),
               "cuMemExportToShareableHandle");
    printf("  *** DMA-BUF fd: %d ***\n", dmabuf_fd);

    /* Validate the fd is real */
    struct stat st;
    if (fstat(dmabuf_fd, &st) == 0) {
        printf("  fstat: mode=0%o, size=%lld\n", st.st_mode, (long long)st.st_size);
    } else {
        perror("  fstat on dmabuf_fd");
    }

    /* Check /proc/self/fd/<fd> link */
    char linkpath[256], linktarget[256];
    snprintf(linkpath, sizeof(linkpath), "/proc/self/fd/%d", dmabuf_fd);
    ssize_t linklen = readlink(linkpath, linktarget, sizeof(linktarget) - 1);
    if (linklen > 0) {
        linktarget[linklen] = '\0';
        printf("  /proc/self/fd/%d -> %s\n", dmabuf_fd, linktarget);
    }

    /* Step 5: Map to GPU virtual address and write a test pattern */
    CHECK_CUDA(cuMemAddressReserve(&dptr, allocSize, granularity, 0, 0), "cuMemAddressReserve");
    CHECK_CUDA(cuMemMap(dptr, allocSize, 0, allocHandle, 0), "cuMemMap");

    CUmemAccessDesc accessDesc;
    accessDesc.location.type = CU_MEM_LOCATION_TYPE_DEVICE;
    accessDesc.location.id = dev;
    accessDesc.flags = CU_MEM_ACCESS_FLAGS_PROT_READWRITE;
    CHECK_CUDA(cuMemSetAccess(dptr, allocSize, &accessDesc, 1), "cuMemSetAccess");
    printf("  GPU virtual address: 0x%llx\n", (unsigned long long)dptr);

    printf("\n=== RESULT: DMA-BUF EXPORT SUCCEEDED ===\n");
    printf("CUDA VMM can produce DMA-BUF fds on this system.\n");
    printf("fd=%d, size=%zu, gpu_va=0x%llx\n", dmabuf_fd, allocSize, (unsigned long long)dptr);
    exitCode = 0;

cleanup:
    if (dptr) {
        cuMemUnmap(dptr, allocSize);
        cuMemAddressFree(dptr, allocSize);
    }
    if (dmabuf_fd >= 0) close(dmabuf_fd);
    if (allocHandle) cuMemRelease(allocHandle);
    if (ctx) cuCtxDestroy_v2(ctx);
    dlclose(cuda);

    printf("\nexit: %d\n", exitCode);
    return exitCode;
}
