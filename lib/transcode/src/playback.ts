import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Use absolute path to avoid issues with bundling changing __dirname context
const addonPath = '/app/lib/transcode/build/Release/playback.node';
// Use createRequire for compatibility with ESM
const nativeModule = require(addonPath);

// Re-export the methods for cleaner usage
export const getFFmpegVersion = nativeModule.getFFmpegVersion;
export const getFFmpegConfiguration = nativeModule.getFFmpegConfiguration;
export const getKeyframes = nativeModule.getKeyframes;
export const validateRemoteSource = nativeModule.validateRemoteSource;
export const streamTranscodeWorker = nativeModule.streamTranscodeWorker;

// New modular pipeline components
export const createVideoSourceNative = nativeModule.createVideoSourceNative;
export const createDecoderNative = nativeModule.createDecoderNative;
export const createFilterNative = nativeModule.createFilterNative;
export const createEncoderNative = nativeModule.createEncoderNative;
export const createMuxerNative = nativeModule.createMuxerNative;
export const createPacketNative = nativeModule.createPacketNative;
export const createPngExporterNative = nativeModule.createPngExporterNative;
