const isDev = !(process.env.NODE_ENV === "production" && !process.env.CI);

const devAliases = {
  "@editframe/api/types.json": "/app/node_modules/@editframe/api/types.json",
  "@editframe/react/types.json":
    "/app/node_modules/@editframe/react/types.json",
  "@editframe/elements/types.json":
    "/app/node_modules/@editframe/elements/types.json",
  "@editframe/assets/types.json":
    "/app/node_modules/@editframe/assets/types.json",
  "@editframe/api": "/app/lib/packages/packages/api/src/index.ts",
  "@editframe/api/node": "/app/lib/packages/packages/api/src/node.ts",
  "@editframe/assets/EncodedAsset.js":
    "/app/lib/packages/packages/assets/src/EncodedAsset.ts",
  "@editframe/assets": "/app/lib/packages/packages/assets/src/index.ts",
  // More specific alias must come before general one
  "@editframe/react/r3f": "/app/lib/packages/packages/react/src/r3f/index.ts",
  "@editframe/react": "/app/lib/packages/packages/react/src/index.ts",
  "@editframe/elements/styles.css":
    "/app/node_modules/@editframe/elements/dist/style.css",
  "@editframe/elements/preview/renderTimegroupToVideo":
    "/app/lib/packages/packages/elements/src/preview/renderTimegroupToVideo.ts",
  "@editframe/elements/preview/renderTimegroupToCanvas":
    "/app/lib/packages/packages/elements/src/preview/renderTimegroupToCanvas.ts",
  "@editframe/elements": "/app/lib/packages/packages/elements/src/index.ts",
  "@editframe/vite-plugin":
    "/app/lib/packages/packages/vite-plugin/src/index.ts",
  // R3F dependencies - point to telecine's node_modules
  "@react-three/offscreen": "/app/node_modules/@react-three/offscreen",
  "@react-three/fiber": "/app/node_modules/@react-three/fiber",
  three: "/app/node_modules/three",
  mitt: "/app/node_modules/mitt",
};

const prodAliases = {
  "@editframe/elements/preview/renderTimegroupToVideo":
    "/app/node_modules/@editframe/elements/dist/preview/renderTimegroupToVideo.js",
  "@editframe/elements/preview/renderTimegroupToCanvas":
    "/app/node_modules/@editframe/elements/dist/preview/renderTimegroupToCanvas.js",
};

export const viteAliases = isDev ? devAliases : prodAliases;
