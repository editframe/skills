import path from "node:path";
import { fileURLToPath } from "node:url";
import { vitePluginEditframe as editframe } from "@editframe/vite-plugin";
import { createServer, type ViteDevServer, type Plugin } from "vite";

import { withSpinner } from "./withSpinner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vite plugin to force @editframe/* imports to resolve to monorepo source files
 */
function forceSourceResolution(sourceRoot: string): Plugin {
  const aliases: Record<string, string> = {
    "@editframe/elements": path.resolve(sourceRoot, "elements/src/index.ts"),
    "@editframe/api": path.resolve(sourceRoot, "api/src/index.ts"),
    "@editframe/assets": path.resolve(sourceRoot, "assets/src/index.ts"),
    "@editframe/react": path.resolve(sourceRoot, "react/src/index.ts"),
  };
  
  return {
    name: "force-source-resolution",
    enforce: "pre",
    config() {
      // Return config to set resolve aliases at the config level
      return {
        resolve: {
          alias: Object.entries(aliases).map(([find, replacement]) => ({
            find,
            replacement,
          })),
        },
      };
    },
    resolveId(id, importer) {
      // Direct package imports
      if (aliases[id]) {
        console.log(`[source] Resolved ${id} -> ${aliases[id]}`);
        return {
          id: aliases[id],
          external: false,
        };
      }
      
      // Handle subpath imports like @editframe/elements/styles.css
      for (const [pkg, pkgPath] of Object.entries(aliases)) {
        if (id.startsWith(pkg + "/")) {
          const subpath = id.slice(pkg.length + 1);
          const pkgName = pkg.split("/").pop(); // Get "elements" from "@editframe/elements"
          
          // Special case: styles.css maps to dist/style.css (built file)
          if (subpath === "styles.css") {
            const resolved = path.resolve(sourceRoot, `${pkgName}/dist/style.css`);
            console.log(`[source] Resolved ${id} -> ${resolved}`);
            return { id: resolved, external: false };
          }
        }
      }
      
      return null;
    },
  };
}

export class PreviewServer {
  static async start(directory: string) {
    return new PreviewServer(await startPreviewServer(directory));
  }

  constructor(private previewServer: ViteDevServer) {}

  get url() {
    return `http://localhost:${this.previewServer.config.server.port}`;
  }
}

const startPreviewServer = async (directory: string) => {
  return await withSpinner("Starting vite...", async () => {
    // If running from the dev script (via tsx), ORIGINAL_CWD contains the user's actual directory
    const baseCwd = process.env.ORIGINAL_CWD || process.cwd();
    const resolvedDirectory = path.resolve(baseCwd, directory);
    const cacheRoot = path.join(resolvedDirectory, "assets");
    
    // When running from the dev script (tsx), use source files from monorepo
    const isDevScript = !!process.env.ORIGINAL_CWD;
    const packagesRoot = path.resolve(__dirname, "../../..");
    
    const plugins = [
      editframe({
        root: resolvedDirectory,
        cacheRoot,
      }),
    ];
    
    if (isDevScript) {
      // Add plugin to force source resolution BEFORE other plugins
      plugins.unshift(forceSourceResolution(packagesRoot));
    }
    
    const devServer = await createServer({
      server: {
        watch: null,
      },
      root: resolvedDirectory,
      optimizeDeps: isDevScript ? {
        // Disable deps discovery and pre-bundling for dev mode (new Vite 5.1+ API)
        noDiscovery: true,
        include: [],
      } : undefined,
      plugins,
    });
    await devServer.listen();
    return devServer;
  });
};
