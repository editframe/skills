/*
 * Fake libpci.so.3 for Cloud Run GPU containers.
 *
 * Cloud Run exposes /dev/nvidia0 but has no PCI bus in sysfs.
 * Chromium's ANGLE calls dlopen("libpci.so.3") and uses it to enumerate GPUs.
 * This shim implements the 7 symbols ANGLE resolves, returning a single
 * NVIDIA L4 GPU device so Chromium detects the GPU and enables hardware
 * rendering.
 *
 * Compiled against the real pci/pci.h headers to match struct layouts.
 */

#include <pci/pci.h>
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>
#include <stdio.h>

/* NVIDIA L4 identifiers */
#define NVIDIA_VENDOR_ID  0x10de
#define NVIDIA_L4_DEVICE  0x27b8
#define DISPLAY_CLASS     0x0300  /* VGA compatible controller */

/* Single static device node returned by scan */
static struct pci_dev fake_dev;

struct pci_access *pci_alloc(void)
{
    struct pci_access *a = calloc(1, sizeof(*a));
    return a;
}

void pci_init(struct pci_access *a)
{
    (void)a;
}

void pci_scan_bus(struct pci_access *a)
{
    memset(&fake_dev, 0, sizeof(fake_dev));
    fake_dev.access     = a;
    fake_dev.next       = NULL;
    fake_dev.domain_16  = 0;
    fake_dev.domain     = 0;
    fake_dev.bus        = 0;
    fake_dev.dev        = 0;
    fake_dev.func       = 0;
    fake_dev.vendor_id  = NVIDIA_VENDOR_ID;
    fake_dev.device_id  = NVIDIA_L4_DEVICE;
    fake_dev.device_class = DISPLAY_CLASS;
    fake_dev.known_fields = PCI_FILL_IDENT | PCI_FILL_CLASS;
    a->devices = &fake_dev;
}

int pci_fill_info(struct pci_dev *d, int flags)
{
    (void)flags;
    d->known_fields |= flags;
    return d->known_fields;
}

void pci_cleanup(struct pci_access *a)
{
    a->devices = NULL;
    free(a);
}

char *pci_lookup_name(struct pci_access *a, char *buf, int size, int flags, ...)
{
    (void)a;
    (void)flags;
    snprintf(buf, size, "NVIDIA Corporation L4");
    return buf;
}

u8 pci_read_byte(struct pci_dev *d, int pos)
{
    (void)d;
    (void)pos;
    return 0;
}
