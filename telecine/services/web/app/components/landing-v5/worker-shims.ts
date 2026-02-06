/**
 * Worker environment shims — must be imported BEFORE any library that
 * checks `typeof window` at module evaluation time (e.g. @react-three/fiber).
 *
 * Because this module has no imports, ESM evaluation order guarantees it
 * runs before any dependency that does have imports.
 */

const _self = typeof self !== "undefined" ? self : globalThis;

if (typeof (_self as any).window === "undefined") {
  (_self as any).window = _self;
}

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
