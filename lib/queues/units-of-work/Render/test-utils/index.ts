// Re-export test utilities for convenient importing (excluding template-bundling to avoid electron dependencies)
export * from './visual-regression';
export * from './video-analysis';
export * from './audio-analysis';
export * from './mp4-validation';
export * from './processTestAssets';
export * from './video-validation';
export * from './template-factory';
export * from './cleanup';
export * from './electronRenderStandalone';
export { renderWithElectronRPCAndScripts } from './electronRenderStandalone';
export * from './html-bundler';

// Re-export specific types from template-bundling without importing the electron dependencies
export type { RenderOutput } from './template-bundling';
export type { StillRenderOutput } from './electronRenderStandalone';

// Temporarily commented out to avoid electron import issues
// export { renderToBuffersWithMetadata, renderToStill } from './template-bundling'; 