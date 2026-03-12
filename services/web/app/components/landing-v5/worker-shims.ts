/**
 * Worker environment shims — must be imported BEFORE any library that
 * checks `typeof window` at module evaluation time (e.g. @react-three/fiber).
 *
 * Because this module has no imports, ESM evaluation order guarantees it
 * runs before any dependency that does have imports.
 */

const _self = typeof self !== "undefined" ? self : globalThis;

// R3F / Three.js check `typeof window` to detect SSR vs browser.
if (typeof (_self as any).window === "undefined") {
  (_self as any).window = _self;
}

// Three.js and troika-three-text use document.createElement('canvas') for
// font metrics and SDF generation.
if (typeof (_self as any).document === "undefined") {
  (_self as any).document = {
    createElement(tag: string) {
      if (tag === "canvas") return new OffscreenCanvas(1, 1);
      return {};
    },
    createElementNS(_ns: string, tag: string) {
      if (tag === "canvas") return new OffscreenCanvas(1, 1);
      return {};
    },
    body: {},
    head: {},
    addEventListener() {},
    removeEventListener() {},
  };
}

if (typeof (_self as any).Image === "undefined") {
  (_self as any).Image = class {
    height = 1;
    width = 1;
    set onload(cb: any) {
      cb(true);
    }
    set onerror(_cb: any) {}
  };
}

// Workers don't have requestAnimationFrame in their global scope.
// R3F and Three.js's WebGLRenderer.setAnimationLoop use it for the render loop.
// Even with frameloop="demand", R3F calls RAF to schedule renders after invalidate().
if (typeof (_self as any).requestAnimationFrame === "undefined") {
  (_self as any).requestAnimationFrame = (cb: (time: number) => void) =>
    setTimeout(() => cb(performance.now()), 16) as unknown as number;
  (_self as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
}

// Some Three.js internals check for `navigator`
if (typeof (_self as any).navigator === "undefined") {
  (_self as any).navigator = { userAgent: "", language: "en" };
}
