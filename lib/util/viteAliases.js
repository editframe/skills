export const viteAliases =
  process.env.NODE_ENV === "production" && !process.env.CI
    ? undefined
    : {
        "@editframe/api/types.json":
          "/app/lib/packages/packages/api/types.json",
        "@editframe/react/types.json":
          "/app/lib/packages/packages/react/types.json",
        "@editframe/elements/types.json":
          "/app/lib/packages/packages/elements/types.json",
        "@editframe/assets/types.json":
          "/app/lib/packages/packages/assets/types.json",
        "@editframe/api": "/app/lib/packages/packages/api/src/index.ts",
        "@editframe/api/node": "/app/lib/packages/packages/api/src/node.ts",
        "@editframe/assets/EncodedAsset.js":
          "/app/lib/packages/packages/assets/src/EncodedAsset.ts",
        "@editframe/assets": "/app/lib/packages/packages/assets/src/index.ts",
        "@editframe/react": "/app/lib/packages/packages/react/src/index.ts",
        "@editframe/elements/styles.css":
          "/app/lib/packages/packages/elements/src/elements.css",
        "@editframe/elements":
          "/app/lib/packages/packages/elements/src/index.ts",
        "@editframe/vite-plugin":
          "/app/lib/packages/packages/vite-plugin/src/index.ts",
      };
