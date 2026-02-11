import type { UserConfig } from "tsdown";

/**
 * Shared tsdown configuration base
 * Used by all packages to maintain consistency
 */
export const createTsdownConfig = (
  options: {
    entry?: string[];
    platform?: "browser" | "node" | "neutral";
    cjs?: boolean;
    dts?: UserConfig["dts"] | false;
    plugins?: UserConfig["plugins"];
    hooks?: UserConfig["hooks"];
    copy?: UserConfig["copy"];
    external?: (string | RegExp)[];
    additionalExports?: Record<string, string>; // For CSS, JSON, etc.
    [key: string]: unknown;
  } = {},
): UserConfig => {
  const {
    entry = ["src/index.ts"],
    platform = "browser",
    cjs = false,
    dts = true,
    plugins = [],
    hooks = {},
    copy = [],
    external = [],
    additionalExports = {},
    ...overrides
  } = options;

  return {
    entry,
    format: cjs ? ["esm", "cjs"] : ["esm"],
    platform,
    target: "es2022",
    outDir: "dist",
    dts:
      dts === false
        ? false
        : typeof dts === "object"
          ? dts
          : {
              resolve: false,
            },
    treeshake: true,
    clean: true,
    unbundle: true,
    sourcemap: true,
    publint: true,
    unused: {
      level: "suggestion",
    },
    exports: {
      customExports: (exports, _context) => {
        const enhanced: Record<string, any> = {};

        // Transform each export to use conditional exports structure
        for (const [key, value] of Object.entries(exports)) {
          // Skip special keys and additional exports
          if (
            key === "./package.json" ||
            key === "./types.json" ||
            additionalExports[key]
          ) {
            enhanced[key] = value;
            continue;
          }

          // For code entry points, create proper conditional exports
          if (typeof value === "string" && value.endsWith(".js")) {
            // ESM-only: tsdown passes a string path
            const dtsPath = value.replace(/\.js$/, ".d.ts");

            enhanced[key] = {
              import: {
                types: dtsPath,
                default: value,
              },
            };
          } else if (
            typeof value === "object" &&
            value !== null &&
            "import" in value &&
            "require" in value
          ) {
            // Dual format: tsdown passes {import: "...", require: "..."}
            const importPath = (value as Record<string, string>).import;
            const requirePath = (value as Record<string, string>).require;

            enhanced[key] = {
              import: {
                types: importPath.replace(/\.js$/, ".d.ts"),
                default: importPath,
              },
              require: {
                types: requirePath.replace(/\.cjs$/, ".d.cts"),
                default: requirePath,
              },
            };
          } else {
            enhanced[key] = value;
          }
        }

        // Merge in additional non-code exports (CSS, JSON, etc.)
        return { ...enhanced, ...additionalExports };
      },
    },
    ...(external.length > 0 && { external }),
    ...(plugins.length > 0 && { plugins }),
    ...(Object.keys(hooks).length > 0 && { hooks }),
    ...(copy.length > 0 && { copy }),
    ...overrides,
  } as UserConfig;
};
