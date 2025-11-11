import { resolve as resolveTs } from "ts-node/esm";
import * as tsConfigPaths from "tsconfig-paths";
import { pathToFileURL } from "node:url";

// Patch CustomElementRegistry.define to handle duplicate registrations gracefully
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
          try {
            return originalDefine(name, constructor, options);
          } catch (error) {
            // Ignore errors about duplicate registrations
            if (error instanceof Error && error.message?.includes("has already been used with this registry")) {
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
      try {
        return originalDefine(name, constructor, options);
      } catch (error) {
        if (error instanceof Error && error.message?.includes("has already been used with this registry")) {
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
