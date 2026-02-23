/*
 * LD_PRELOAD shim: intercepts access() to make ANGLE believe /sys/bus/pci/
 * exists on Cloud Run GPU containers (where sysfs has no PCI bus entries).
 *
 * ANGLE's LibPCI constructor calls access("/sys/bus/pci/", F_OK) before
 * attempting to dlopen libpci.so.3. This shim returns 0 for that path,
 * allowing our fake libpci.so.3 to be loaded and return the NVIDIA L4 device.
 */

#define _GNU_SOURCE
#include <dlfcn.h>
#include <string.h>
#include <unistd.h>

typedef int (*access_fn)(const char *, int);

int access(const char *pathname, int mode)
{
    if (pathname &&
        (strcmp(pathname, "/sys/bus/pci/") == 0 ||
         strcmp(pathname, "/sys/bus/pci_express/") == 0))
    {
        return 0;
    }

    static access_fn real_access = NULL;
    if (!real_access)
    {
        real_access = (access_fn)dlsym(RTLD_NEXT, "access");
    }
    return real_access(pathname, mode);
}
