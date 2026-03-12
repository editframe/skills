/**
 * fake_drm.c — LD_PRELOAD shim that fakes /dev/dri/renderD128.
 *
 * Intercepts open/open64/openat to redirect /dev/dri/renderD* to /dev/null,
 * then intercepts ioctl on those fds to respond to the DRM ioctls that
 * Chromium's ozone-drm platform and libgbm use during initialization.
 *
 * Build:
 *   gcc -shared -fPIC -o fake_drm.so fake_drm.c -ldl
 *
 * Usage:
 *   LD_PRELOAD=/path/to/fake_drm.so electron --ozone-platform=drm ...
 */
#define _GNU_SOURCE
#include <dlfcn.h>
#include <errno.h>
#include <fcntl.h>
#include <stdarg.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/ioctl.h>
#include <sys/stat.h>
#include <sys/sysmacros.h>
#include <unistd.h>
#include <dirent.h>

/* ---------- DRM ioctl constants (from drm.h / drm_mode.h) ---------- */

#define DRM_IOCTL_BASE    'd'
#define DRM_IO(nr)        _IO(DRM_IOCTL_BASE, nr)
#define DRM_IOR(nr, type) _IOR(DRM_IOCTL_BASE, nr, type)
#define DRM_IOW(nr, type) _IOW(DRM_IOCTL_BASE, nr, type)
#define DRM_IOWR(nr, type) _IOWR(DRM_IOCTL_BASE, nr, type)

/* DRM_IOCTL_VERSION */
struct drm_version {
    int version_major;
    int version_minor;
    int version_patchlevel;
    size_t name_len;
    char *name;
    size_t date_len;
    char *date;
    size_t desc_len;
    char *desc;
};
#define DRM_IOCTL_VERSION DRM_IOWR(0x00, struct drm_version)

/* DRM_IOCTL_GET_CAP */
struct drm_get_cap {
    uint64_t capability;
    uint64_t value;
};
#define DRM_IOCTL_GET_CAP DRM_IOWR(0x0c, struct drm_get_cap)

#define DRM_CAP_PRIME            0x5
#define DRM_PRIME_CAP_IMPORT     0x1
#define DRM_PRIME_CAP_EXPORT     0x2
#define DRM_CAP_DUMB_BUFFER      0x1
#define DRM_CAP_TIMESTAMP_MONOTONIC 0x6
#define DRM_CAP_ADDFB2_MODIFIERS 0x10
#define DRM_CAP_SYNCOBJ          0x13
#define DRM_CAP_SYNCOBJ_TIMELINE 0x14

/* DRM_IOCTL_SET_CLIENT_CAP */
struct drm_set_client_cap {
    uint64_t capability;
    uint64_t value;
};
#define DRM_IOCTL_SET_CLIENT_CAP DRM_IOW(0x0d, struct drm_set_client_cap)

/* DRM_IOCTL_MODE_GETRESOURCES */
struct drm_mode_card_res {
    uint64_t fb_id_ptr;
    uint64_t crtc_id_ptr;
    uint64_t connector_id_ptr;
    uint64_t encoder_id_ptr;
    uint32_t count_fbs;
    uint32_t count_crtcs;
    uint32_t count_connectors;
    uint32_t count_encoders;
    uint32_t min_width, max_width;
    uint32_t min_height, max_height;
};
#define DRM_IOCTL_MODE_GETRESOURCES DRM_IOWR(0xA0, struct drm_mode_card_res)

/* DRM_IOCTL_GET_UNIQUE */
struct drm_unique {
    size_t unique_len;
    char *unique;
};
#define DRM_IOCTL_GET_UNIQUE DRM_IOWR(0x01, struct drm_unique)

/* DRM_IOCTL_SET_VERSION */
struct drm_set_version {
    int drm_di_major;
    int drm_di_minor;
    int drm_dd_major;
    int drm_dd_minor;
};
#define DRM_IOCTL_SET_VERSION DRM_IOWR(0x07, struct drm_set_version)

/* DRM_IOCTL_AUTH_MAGIC */
#define DRM_IOCTL_AUTH_MAGIC DRM_IOW(0x11, uint32_t)

/* DRM_IOCTL_MODE_GETPLANERESOURCES */
struct drm_mode_get_plane_res {
    uint64_t plane_id_ptr;
    uint32_t count_planes;
};
#define DRM_IOCTL_MODE_GETPLANERESOURCES DRM_IOWR(0xB5, struct drm_mode_get_plane_res)

/* ---------- Fake fd tracking ---------- */

#define MAX_FAKE_FDS 16
static int fake_fds[MAX_FAKE_FDS];
static int fake_fd_count = 0;

static int is_fake_fd(int fd) {
    for (int i = 0; i < fake_fd_count; i++) {
        if (fake_fds[i] == fd) return 1;
    }
    return 0;
}

static void add_fake_fd(int fd) {
    if (fake_fd_count < MAX_FAKE_FDS) {
        fake_fds[fake_fd_count++] = fd;
    }
}

static void remove_fake_fd(int fd) {
    for (int i = 0; i < fake_fd_count; i++) {
        if (fake_fds[i] == fd) {
            fake_fds[i] = fake_fds[--fake_fd_count];
            return;
        }
    }
}

static int is_dri_path(const char *path) {
    return path && (strncmp(path, "/dev/dri/", 9) == 0);
}

/* ---------- Intercept open/openat ---------- */

typedef int (*open_fn)(const char*, int, ...);
typedef int (*openat_fn)(int, const char*, int, ...);

int open(const char *pathname, int flags, ...) {
    static open_fn real_open = NULL;
    if (!real_open) real_open = (open_fn)dlsym(RTLD_NEXT, "open");

    if (is_dri_path(pathname)) {
        /* Open /dev/null as the backing fd */
        mode_t mode = 0;
        if (flags & O_CREAT) {
            va_list ap;
            va_start(ap, flags);
            mode = va_arg(ap, mode_t);
            va_end(ap);
        }
        int fd = real_open("/dev/null", flags & ~O_CREAT, mode);
        if (fd >= 0) {
            add_fake_fd(fd);
            fprintf(stderr, "[fake_drm] open(%s) -> fake fd %d\n", pathname, fd);
        }
        return fd;
    }

    if (flags & O_CREAT) {
        va_list ap;
        va_start(ap, flags);
        mode_t mode = va_arg(ap, mode_t);
        va_end(ap);
        return real_open(pathname, flags, mode);
    }
    return real_open(pathname, flags);
}

int open64(const char *pathname, int flags, ...) {
    static open_fn real_open64 = NULL;
    if (!real_open64) real_open64 = (open_fn)dlsym(RTLD_NEXT, "open64");

    if (is_dri_path(pathname)) {
        mode_t mode = 0;
        if (flags & O_CREAT) {
            va_list ap;
            va_start(ap, flags);
            mode = va_arg(ap, mode_t);
            va_end(ap);
        }
        int fd = real_open64("/dev/null", flags & ~O_CREAT, mode);
        if (fd >= 0) {
            add_fake_fd(fd);
        }
        return fd;
    }

    if (flags & O_CREAT) {
        va_list ap;
        va_start(ap, flags);
        mode_t mode = va_arg(ap, mode_t);
        va_end(ap);
        return real_open64(pathname, flags, mode);
    }
    return real_open64(pathname, flags);
}

int openat(int dirfd, const char *pathname, int flags, ...) {
    static openat_fn real_openat = NULL;
    if (!real_openat) real_openat = (openat_fn)dlsym(RTLD_NEXT, "openat");

    if (is_dri_path(pathname)) {
        mode_t mode = 0;
        if (flags & O_CREAT) {
            va_list ap;
            va_start(ap, flags);
            mode = va_arg(ap, mode_t);
            va_end(ap);
        }
        int fd = real_openat(dirfd, "/dev/null", flags & ~O_CREAT, mode);
        if (fd >= 0) {
            add_fake_fd(fd);
        }
        return fd;
    }

    if (flags & O_CREAT) {
        va_list ap;
        va_start(ap, flags);
        mode_t mode = va_arg(ap, mode_t);
        va_end(ap);
        return real_openat(dirfd, pathname, flags, mode);
    }
    return real_openat(dirfd, pathname, flags);
}

/* Intercept close to clean up tracking */
int close(int fd) {
    static int (*real_close)(int) = NULL;
    if (!real_close) real_close = dlsym(RTLD_NEXT, "close");
    if (is_fake_fd(fd)) remove_fake_fd(fd);
    return real_close(fd);
}

/* ---------- Intercept fstat to return DRM device major/minor ---------- */

int __fxstat(int ver, int fd, struct stat *buf) {
    static int (*real_fxstat)(int, int, struct stat*) = NULL;
    if (!real_fxstat) real_fxstat = dlsym(RTLD_NEXT, "__fxstat");
    int r = real_fxstat(ver, fd, buf);
    if (r == 0 && is_fake_fd(fd)) {
        /* Make it look like a DRM render node: major=226, minor=128 */
        buf->st_rdev = makedev(226, 128);
        buf->st_mode = S_IFCHR | 0666;
    }
    return r;
}

int fstat(int fd, struct stat *buf) {
    static int (*real_fstat)(int, struct stat*) = NULL;
    if (!real_fstat) real_fstat = dlsym(RTLD_NEXT, "fstat");
    int r = real_fstat(fd, buf);
    if (r == 0 && is_fake_fd(fd)) {
        buf->st_rdev = makedev(226, 128);
        buf->st_mode = S_IFCHR | 0666;
    }
    return r;
}

/* fstat64 uses struct stat64 on glibc */
struct stat64;
int fstat64(int fd, struct stat64 *buf) {
    static int (*real_fstat64)(int, struct stat64*) = NULL;
    if (!real_fstat64) real_fstat64 = dlsym(RTLD_NEXT, "fstat64");
    int r = real_fstat64(fd, buf);
    if (r == 0 && is_fake_fd(fd)) {
        /* stat64 layout: st_rdev at same relative position, cast through stat */
        struct stat *s = (struct stat*)buf;
        s->st_rdev = makedev(226, 128);
        s->st_mode = S_IFCHR | 0666;
    }
    return r;
}

/* ---------- Intercept stat for /dev/dri paths ---------- */

int __xstat(int ver, const char *path, struct stat *buf) {
    static int (*real_xstat)(int, const char*, struct stat*) = NULL;
    if (!real_xstat) real_xstat = dlsym(RTLD_NEXT, "__xstat");
    if (is_dri_path(path)) {
        int r = real_xstat(ver, "/dev/null", buf);
        if (r == 0) {
            buf->st_rdev = makedev(226, 128);
            buf->st_mode = S_IFCHR | 0666;
        }
        return r;
    }
    return real_xstat(ver, path, buf);
}

int stat(const char *path, struct stat *buf) {
    static int (*real_stat)(const char*, struct stat*) = NULL;
    if (!real_stat) real_stat = dlsym(RTLD_NEXT, "stat");
    if (is_dri_path(path)) {
        int r = real_stat("/dev/null", buf);
        if (r == 0) {
            buf->st_rdev = makedev(226, 128);
            buf->st_mode = S_IFCHR | 0666;
        }
        return r;
    }
    return real_stat(path, buf);
}

/* ---------- Intercept directory enumeration for /dev/dri ---------- */

typedef DIR* (*opendir_fn)(const char*);
typedef struct dirent* (*readdir_fn)(DIR*);
typedef int (*closedir_fn)(DIR*);

/* Track the real DIR* we hand back for /dev/dri, so we can intercept reads */
static DIR *fake_dri_dirp = NULL;
static int fake_dri_dir_pos = 0;

DIR *opendir(const char *name) {
    static opendir_fn real_opendir = NULL;
    if (!real_opendir) real_opendir = (opendir_fn)dlsym(RTLD_NEXT, "opendir");
    if (name && strcmp(name, "/dev/dri") == 0) {
        /* Open a real directory so the DIR* is valid glibc memory.
           We intercept readdir to return fake entries. */
        DIR *d = real_opendir("/tmp");
        if (d) {
            fake_dri_dirp = d;
            fake_dri_dir_pos = 0;
            fprintf(stderr, "[fake_drm] opendir(/dev/dri) -> real DIR* %p (backed by /tmp)\n", (void*)d);
        }
        return d;
    }
    return real_opendir(name);
}

/* Fake dirent entry builder — works for both readdir and readdir64 since
   struct dirent and struct dirent64 have the same layout on x86_64 glibc */
static struct dirent *fake_readdir_entry(void) {
    static struct dirent entries[4];
    if (fake_dri_dir_pos == 0) {
        fake_dri_dir_pos++;
        memset(&entries[0], 0, sizeof(struct dirent));
        strcpy(entries[0].d_name, ".");
        entries[0].d_type = DT_DIR;
        entries[0].d_ino = 1;
        entries[0].d_reclen = sizeof(struct dirent);
        return &entries[0];
    }
    if (fake_dri_dir_pos == 1) {
        fake_dri_dir_pos++;
        memset(&entries[1], 0, sizeof(struct dirent));
        strcpy(entries[1].d_name, "..");
        entries[1].d_type = DT_DIR;
        entries[1].d_ino = 2;
        entries[1].d_reclen = sizeof(struct dirent);
        return &entries[1];
    }
    if (fake_dri_dir_pos == 2) {
        fake_dri_dir_pos++;
        memset(&entries[2], 0, sizeof(struct dirent));
        strcpy(entries[2].d_name, "renderD128");
        entries[2].d_type = DT_CHR;
        entries[2].d_ino = 3;
        entries[2].d_reclen = sizeof(struct dirent);
        return &entries[2];
    }
    if (fake_dri_dir_pos == 3) {
        fake_dri_dir_pos++;
        memset(&entries[3], 0, sizeof(struct dirent));
        strcpy(entries[3].d_name, "card0");
        entries[3].d_type = DT_CHR;
        entries[3].d_ino = 4;
        entries[3].d_reclen = sizeof(struct dirent);
        return &entries[3];
    }
    return NULL;
}

struct dirent *readdir(DIR *dirp) {
    static readdir_fn real_readdir = NULL;
    if (!real_readdir) real_readdir = (readdir_fn)dlsym(RTLD_NEXT, "readdir");
    if (fake_dri_dirp && dirp == fake_dri_dirp) {
        return fake_readdir_entry();
    }
    return real_readdir(dirp);
}

/* readdir64 — returns struct dirent64* but on x86_64 glibc the layout
   is identical to struct dirent, so we can safely cast our fake entries */
struct dirent64 *readdir64(DIR *dirp) {
    typedef struct dirent64* (*readdir64_fn)(DIR*);
    static readdir64_fn real_readdir64 = NULL;
    if (!real_readdir64) real_readdir64 = (readdir64_fn)dlsym(RTLD_NEXT, "readdir64");
    if (fake_dri_dirp && dirp == fake_dri_dirp) {
        return (struct dirent64*)fake_readdir_entry();
    }
    return real_readdir64(dirp);
}

int closedir(DIR *dirp) {
    static closedir_fn real_closedir = NULL;
    if (!real_closedir) real_closedir = (closedir_fn)dlsym(RTLD_NEXT, "closedir");
    if (fake_dri_dirp && dirp == fake_dri_dirp) {
        fprintf(stderr, "[fake_drm] closedir(/dev/dri)\n");
        fake_dri_dirp = NULL;
        fake_dri_dir_pos = 0;
    }
    return real_closedir(dirp);
}

/* Intercept access() to make /dev/dri/renderD128 appear to exist */
int access(const char *pathname, int mode) {
    static int (*real_access)(const char*, int) = NULL;
    if (!real_access) real_access = dlsym(RTLD_NEXT, "access");
    if (is_dri_path(pathname)) return 0;
    if (pathname && strcmp(pathname, "/dev/dri") == 0) return 0;
    return real_access(pathname, mode);
}

/* ---------- Intercept ioctl for DRM commands ---------- */

int ioctl(int fd, unsigned long request, ...) {
    static int (*real_ioctl)(int, unsigned long, ...) = NULL;
    if (!real_ioctl) real_ioctl = dlsym(RTLD_NEXT, "ioctl");

    va_list ap;
    va_start(ap, request);
    void *arg = va_arg(ap, void*);
    va_end(ap);

    if (!is_fake_fd(fd)) {
        return real_ioctl(fd, request, arg);
    }

    /* Handle DRM ioctls on our fake fd */
    if (request == DRM_IOCTL_VERSION) {
        struct drm_version *v = (struct drm_version*)arg;
        v->version_major = 3;
        v->version_minor = 49;
        v->version_patchlevel = 0;
        const char *name = "nvidia-drm";
        const char *date = "20150127";
        const char *desc = "NVIDIA DRM (fake)";
        if (v->name && v->name_len >= strlen(name))
            strncpy(v->name, name, v->name_len);
        v->name_len = strlen(name);
        if (v->date && v->date_len >= strlen(date))
            strncpy(v->date, date, v->date_len);
        v->date_len = strlen(date);
        if (v->desc && v->desc_len >= strlen(desc))
            strncpy(v->desc, desc, v->desc_len);
        v->desc_len = strlen(desc);
        return 0;
    }

    if (request == DRM_IOCTL_GET_CAP) {
        struct drm_get_cap *cap = (struct drm_get_cap*)arg;
        switch (cap->capability) {
            case DRM_CAP_PRIME:
                cap->value = DRM_PRIME_CAP_IMPORT | DRM_PRIME_CAP_EXPORT;
                return 0;
            case DRM_CAP_DUMB_BUFFER:
                cap->value = 0;
                return 0;
            case DRM_CAP_TIMESTAMP_MONOTONIC:
                cap->value = 1;
                return 0;
            case DRM_CAP_ADDFB2_MODIFIERS:
                cap->value = 1;
                return 0;
            case DRM_CAP_SYNCOBJ:
            case DRM_CAP_SYNCOBJ_TIMELINE:
                cap->value = 1;
                return 0;
            default:
                cap->value = 0;
                return 0;
        }
    }

    if (request == DRM_IOCTL_SET_CLIENT_CAP) {
        return 0;
    }

    if (request == DRM_IOCTL_MODE_GETRESOURCES) {
        struct drm_mode_card_res *res = (struct drm_mode_card_res*)arg;
        memset(res, 0, sizeof(*res));
        res->min_width = 0;
        res->max_width = 16384;
        res->min_height = 0;
        res->max_height = 16384;
        return 0;
    }

    if (request == DRM_IOCTL_GET_UNIQUE) {
        struct drm_unique *u = (struct drm_unique*)arg;
        const char *unique = "nvidia-drm-0000:03:00.0";
        if (u->unique && u->unique_len >= strlen(unique))
            strncpy(u->unique, unique, u->unique_len);
        u->unique_len = strlen(unique);
        return 0;
    }

    if (request == DRM_IOCTL_SET_VERSION) {
        struct drm_set_version *sv = (struct drm_set_version*)arg;
        sv->drm_di_major = 1;
        sv->drm_di_minor = 4;
        sv->drm_dd_major = 3;
        sv->drm_dd_minor = 49;
        return 0;
    }

    if (request == DRM_IOCTL_AUTH_MAGIC) {
        return 0;
    }

    if (request == DRM_IOCTL_MODE_GETPLANERESOURCES) {
        struct drm_mode_get_plane_res *pr = (struct drm_mode_get_plane_res*)arg;
        pr->count_planes = 0;
        return 0;
    }

    /* Default: return success for unknown DRM ioctls */
    return 0;
}

/* ---------- Intercept drmGetDevices2/drmGetDevices ---------- */

/*
 * drmDevice struct layout from libdrm (xf86drm.h).
 * drmFreeDevice() just calls free() on the pointer, so we must allocate
 * the entire device (struct + nodes array + path strings) in one block.
 */

#define DRM_NODE_PRIMARY 0
#define DRM_NODE_RENDER  2
#define DRM_NODE_MAX     3
#define DRM_BUS_PCI      0

typedef struct _drmPciBusInfo {
    uint16_t domain;
    uint8_t bus;
    uint8_t dev;
    uint8_t func;
} drmPciBusInfo;

typedef struct _drmPciDeviceInfo {
    uint16_t vendor_id;
    uint16_t device_id;
    uint16_t subvendor_id;
    uint16_t subdevice_id;
    uint8_t revision_id;
} drmPciDeviceInfo;

typedef struct _drmDevice {
    char **nodes;
    int available_nodes;
    int bustype;
    union { drmPciBusInfo *pci; void *_pad[4]; } businfo;
    union { drmPciDeviceInfo *pci; void *_pad[4]; } deviceinfo;
} drmDevice, *drmDevicePtr;

/* Fake NVIDIA L4 PCI device: 0000:03:00.0, vendor 0x10de, device 0x27b8 */
static drmDevicePtr make_fake_device(void) {
    /* Single allocation block:
     *   drmDevice struct
     *   char* nodes[DRM_NODE_MAX]
     *   drmPciBusInfo
     *   drmPciDeviceInfo
     *   char card_path[] = "/dev/dri/card0\0"
     *   char render_path[] = "/dev/dri/renderD128\0"
     */
    const char *card_path = "/dev/dri/card0";
    const char *render_path = "/dev/dri/renderD128";
    size_t card_len = strlen(card_path) + 1;
    size_t render_len = strlen(render_path) + 1;

    size_t total = sizeof(drmDevice)
                 + sizeof(char*) * DRM_NODE_MAX
                 + sizeof(drmPciBusInfo)
                 + sizeof(drmPciDeviceInfo)
                 + card_len
                 + render_len;

    char *block = calloc(1, total);
    if (!block) return NULL;

    drmDevice *dev = (drmDevice*)block;
    char *ptr = block + sizeof(drmDevice);

    /* nodes array */
    dev->nodes = (char**)ptr;
    ptr += sizeof(char*) * DRM_NODE_MAX;

    /* PCI bus info */
    drmPciBusInfo *bus = (drmPciBusInfo*)ptr;
    ptr += sizeof(drmPciBusInfo);
    bus->domain = 0;
    bus->bus = 3;
    bus->dev = 0;
    bus->func = 0;

    /* PCI device info */
    drmPciDeviceInfo *info = (drmPciDeviceInfo*)ptr;
    ptr += sizeof(drmPciDeviceInfo);
    info->vendor_id = 0x10de;    /* NVIDIA */
    info->device_id = 0x27b8;    /* L4 */
    info->subvendor_id = 0x10de;
    info->subdevice_id = 0x16a1;
    info->revision_id = 0xa1;

    /* Path strings */
    char *card_str = ptr;
    memcpy(card_str, card_path, card_len);
    ptr += card_len;

    char *render_str = ptr;
    memcpy(render_str, render_path, render_len);

    /* Wire up the device */
    dev->nodes[DRM_NODE_PRIMARY] = card_str;
    dev->nodes[DRM_NODE_RENDER] = render_str;
    dev->available_nodes = (1 << DRM_NODE_PRIMARY) | (1 << DRM_NODE_RENDER);
    dev->bustype = DRM_BUS_PCI;
    dev->businfo.pci = bus;
    dev->deviceinfo.pci = info;

    return dev;
}

/*
 * drmGetDevices2(flags, devices[], max_devices)
 *   devices == NULL → return count
 *   devices != NULL → fill array, return count stored
 */
int drmGetDevices2(uint32_t flags, drmDevicePtr devices[], int max_devices) {
    (void)flags;
    fprintf(stderr, "[fake_drm] drmGetDevices2(flags=%u, devices=%p, max=%d)\n",
            flags, (void*)devices, max_devices);
    if (!devices) return 1; /* one device available */
    if (max_devices < 1) return 0;

    devices[0] = make_fake_device();
    if (!devices[0]) return -12; /* -ENOMEM */
    return 1;
}

int drmGetDevices(drmDevicePtr devices[], int max_devices) {
    return drmGetDevices2(1 /* DRM_DEVICE_GET_PCI_REVISION */, devices, max_devices);
}

/* drmGetDevice2(fd, flags, device) — look up device for an open DRM fd */
int drmGetDevice2(int fd, uint32_t flags, drmDevicePtr *device) {
    (void)flags;
    if (!device) return -22; /* -EINVAL */
    if (!is_fake_fd(fd)) {
        /* Not our fd — try the real function if available */
        static int (*real_fn)(int, uint32_t, drmDevicePtr*) = NULL;
        if (!real_fn) real_fn = dlsym(RTLD_NEXT, "drmGetDevice2");
        if (real_fn) return real_fn(fd, flags, device);
        return -19; /* -ENODEV */
    }
    fprintf(stderr, "[fake_drm] drmGetDevice2(fd=%d)\n", fd);
    *device = make_fake_device();
    return *device ? 0 : -12;
}

/* drmFreeDevice/drmFreeDevices — our structs are single calloc blocks */
void drmFreeDevice(drmDevicePtr *device) {
    if (device && *device) { free(*device); *device = NULL; }
}

void drmFreeDevices(drmDevicePtr devices[], int count) {
    for (int i = 0; i < count; i++) {
        if (devices[i]) { free(devices[i]); devices[i] = NULL; }
    }
}
