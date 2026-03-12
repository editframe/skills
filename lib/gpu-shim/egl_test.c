/**
 * Minimal EGL diagnostic: tests whether the NVIDIA EGL driver can create
 * a display on Cloud Run (no X11, no /dev/dri, just /dev/nvidia0).
 *
 * Tests EGL_DEFAULT_DISPLAY, EGL_PLATFORM_DEVICE_EXT, and
 * EGL_PLATFORM_SURFACELESS_MESA in sequence.
 */
#include <EGL/egl.h>
#include <EGL/eglext.h>
#include <stdio.h>
#include <string.h>
#include <dlfcn.h>

#ifndef EGL_PLATFORM_SURFACELESS_MESA
#define EGL_PLATFORM_SURFACELESS_MESA 0x31DD
#endif

#ifndef EGL_PLATFORM_DEVICE_EXT
#define EGL_PLATFORM_DEVICE_EXT 0x313F
#endif

typedef EGLDisplay (*PFNEGLGETPLATFORMDISPLAYEXTPROC)(EGLenum, void*, const EGLint*);
typedef EGLBoolean (*PFNEGLQUERYDEVICESEXTPROC)(EGLint, EGLDeviceEXT*, EGLint*);

static void print_egl_error(const char* label) {
    EGLint err = eglGetError();
    printf("  %s: EGL error 0x%x\n", label, err);
}

static void try_init(const char* label, EGLDisplay dpy) {
    if (dpy == EGL_NO_DISPLAY) {
        printf("  %s: EGL_NO_DISPLAY\n", label);
        print_egl_error(label);
        return;
    }
    printf("  %s: got display %p\n", label, dpy);

    EGLint major, minor;
    if (eglInitialize(dpy, &major, &minor)) {
        printf("  %s: EGL %d.%d initialized OK\n", label, major, minor);

        const char* vendor = eglQueryString(dpy, EGL_VENDOR);
        const char* version = eglQueryString(dpy, EGL_VERSION);
        const char* apis = eglQueryString(dpy, EGL_CLIENT_APIS);
        const char* extensions = eglQueryString(dpy, EGL_EXTENSIONS);
        printf("  vendor:     %s\n", vendor ? vendor : "(null)");
        printf("  version:    %s\n", version ? version : "(null)");
        printf("  client_apis: %s\n", apis ? apis : "(null)");

        /* Print surface-related extensions */
        if (extensions) {
            printf("  extensions (surface-related):\n");
            const char* ext = extensions;
            while (*ext) {
                const char* end = strchr(ext, ' ');
                if (!end) end = ext + strlen(ext);
                int len = end - ext;
                if (strstr(ext, "surfaceless") || strstr(ext, "device") ||
                    strstr(ext, "platform") || strstr(ext, "stream") ||
                    strstr(ext, "output") || strstr(ext, "drm")) {
                    printf("    %.*s\n", len, ext);
                }
                ext = *end ? end + 1 : end;
            }
        }

        /* Try to create a GLES2 context */
        eglBindAPI(EGL_OPENGL_ES_API);
        EGLint configAttribs[] = {
            EGL_RENDERABLE_TYPE, EGL_OPENGL_ES2_BIT,
            EGL_SURFACE_TYPE, EGL_PBUFFER_BIT,
            EGL_NONE
        };
        EGLConfig config;
        EGLint numConfigs;
        if (eglChooseConfig(dpy, configAttribs, &config, 1, &numConfigs) && numConfigs > 0) {
            EGLint ctxAttribs[] = { EGL_CONTEXT_CLIENT_VERSION, 2, EGL_NONE };
            EGLContext ctx = eglCreateContext(dpy, config, EGL_NO_CONTEXT, ctxAttribs);
            if (ctx != EGL_NO_CONTEXT) {
                printf("  GLES2 context: OK\n");
                /* Try to make current without a surface (surfaceless) */
                if (eglMakeCurrent(dpy, EGL_NO_SURFACE, EGL_NO_SURFACE, ctx)) {
                    printf("  MakeCurrent (surfaceless): OK\n");
                } else {
                    printf("  MakeCurrent (surfaceless): FAILED\n");
                    print_egl_error("MakeCurrent");
                }
                eglDestroyContext(dpy, ctx);
            } else {
                printf("  GLES2 context: FAILED\n");
                print_egl_error("eglCreateContext");
            }
        } else {
            printf("  eglChooseConfig: FAILED (numConfigs=%d)\n", numConfigs);
            print_egl_error("eglChooseConfig");
        }

        eglTerminate(dpy);
    } else {
        printf("  %s: eglInitialize FAILED\n", label);
        print_egl_error(label);
    }
}

int main() {
    printf("=== EGL diagnostic ===\n");

    /* 1. EGL client extensions (before display) */
    const char* clientExt = eglQueryString(EGL_NO_DISPLAY, EGL_EXTENSIONS);
    printf("EGL client extensions: %s\n\n", clientExt ? clientExt : "(none)");

    /* 2. Default display */
    printf("Test 1: EGL_DEFAULT_DISPLAY\n");
    EGLDisplay dpy1 = eglGetDisplay(EGL_DEFAULT_DISPLAY);
    try_init("default", dpy1);

    /* 3. Platform surfaceless */
    printf("\nTest 2: EGL_PLATFORM_SURFACELESS_MESA\n");
    PFNEGLGETPLATFORMDISPLAYEXTPROC eglGetPlatformDisplayEXT =
        (PFNEGLGETPLATFORMDISPLAYEXTPROC)eglGetProcAddress("eglGetPlatformDisplayEXT");
    if (eglGetPlatformDisplayEXT) {
        EGLDisplay dpy2 = eglGetPlatformDisplayEXT(EGL_PLATFORM_SURFACELESS_MESA, EGL_DEFAULT_DISPLAY, NULL);
        try_init("surfaceless", dpy2);
    } else {
        printf("  eglGetPlatformDisplayEXT not available\n");
    }

    /* 4. Platform device */
    printf("\nTest 3: EGL_PLATFORM_DEVICE_EXT\n");
    PFNEGLQUERYDEVICESEXTPROC eglQueryDevicesEXT =
        (PFNEGLQUERYDEVICESEXTPROC)eglGetProcAddress("eglQueryDevicesEXT");
    if (eglQueryDevicesEXT && eglGetPlatformDisplayEXT) {
        EGLDeviceEXT devices[8];
        EGLint numDevices = 0;
        if (eglQueryDevicesEXT(8, devices, &numDevices)) {
            printf("  Found %d EGL device(s)\n", numDevices);
            for (int i = 0; i < numDevices; i++) {
                printf("  Device %d: %p\n", i, devices[i]);
                EGLDisplay dpy3 = eglGetPlatformDisplayEXT(EGL_PLATFORM_DEVICE_EXT, devices[i], NULL);
                char label[32];
                snprintf(label, sizeof(label), "device[%d]", i);
                try_init(label, dpy3);
            }
        } else {
            printf("  eglQueryDevicesEXT failed\n");
            print_egl_error("eglQueryDevicesEXT");
        }
    } else {
        printf("  EGL device extension not available\n");
    }

    printf("\n=== EGL diagnostic done ===\n");
    return 0;
}
