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
            if (existing === constructor) {
              // Already registered with same constructor - safe to skip
              return;
            }
            // Different constructor - this is an actual error, let it throw
          } catch {
            // get() can throw if element doesn't exist - that's fine, proceed with define
          }
          return originalDefine(name, constructor, options);
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
        if (existing === constructor) {
          // Already registered with same constructor - safe to skip
          return;
        }
        // Different constructor - this is an actual error, let it throw
      } catch {
        // get() can throw if element doesn't exist - that's fine, proceed with define
      }
      return originalDefine(name, constructor, options);
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
