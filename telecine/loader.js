import { resolve as resolveTs } from "ts-node/esm";
import * as tsConfigPaths from "tsconfig-paths";
import { pathToFileURL } from "node:url";

// Patch CustomElementRegistry.define to prevent duplicate registrations
// This runs before any modules are loaded, so we can intercept customElements creation
if (typeof globalThis !== "undefined") {
  // Store original defineProperty to intercept customElements
  const originalDefineProperty = Object.defineProperty;
  
  Object.defineProperty = function(obj, prop, descriptor) {
    // Intercept when customElements is being defined
    if (obj === globalThis && prop === "customElements" && descriptor.value) {
      const customElements = descriptor.value;
      
      // Patch define method if it exists
      if (customElements && customElements.define) {
        const originalDefine = customElements.define.bind(customElements);
        customElements.define = function(name, constructor, options) {
          // Check if already registered - if so, skip registration
          try {
            const existing = customElements.get(name);
            if (existing) {
              // Already registered - safe to skip (even if constructor is different, 
              // this is SSR and modules can be loaded multiple times)
              return;
            }
          } catch {
            // get() can throw if element doesn't exist - that's fine, proceed with define
          }
          // Try to define, but catch duplicate registration errors
          try {
            return originalDefine(name, constructor, options);
          } catch (error) {
            // Ignore duplicate registration errors in SSR
            if (error instanceof Error && error.message?.includes("has already been used")) {
              return;
            }
            throw error;
          }
        };
      }
    }
    
    return originalDefineProperty.call(this, obj, prop, descriptor);
  };
  
  // Also patch if customElements already exists
  if (globalThis.customElements && globalThis.customElements.define) {
    const originalDefine = globalThis.customElements.define.bind(globalThis.customElements);
    globalThis.customElements.define = function(name, constructor, options) {
      // Check if already registered - if so, skip registration
      try {
        const existing = globalThis.customElements.get(name);
        if (existing) {
          // Already registered - safe to skip (even if constructor is different,
          // this is SSR and modules can be loaded multiple times)
          return;
        }
      } catch {
        // get() can throw if element doesn't exist - that's fine, proceed with define
      }
      // Try to define, but catch duplicate registration errors
      try {
        return originalDefine(name, constructor, options);
      } catch (error) {
        // Ignore duplicate registration errors in SSR
        if (error instanceof Error && error.message?.includes("has already been used")) {
          return;
        }
        throw error;
      }
    };
  }
}

const { absoluteBaseUrl, paths } = tsConfigPaths.loadConfig();
const matchPath = tsConfigPaths.createMatchPath(absoluteBaseUrl, paths);

export function resolve(specifier, ctx, defaultResolve) {
  const match = matchPath(specifier);
  try {
    return match
      ? resolveTs(pathToFileURL(`${match}`).href, ctx, defaultResolve)
      : resolveTs(specifier, ctx, defaultResolve);
  } catch (e) {
    console.log("resolve error", e);
    throw e;
  }
}

export { load, transformSource } from "ts-node/esm";
