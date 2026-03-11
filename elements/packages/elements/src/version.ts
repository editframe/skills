declare const __EF_VERSION__: string;

export const version: string = __EF_VERSION__;

(globalThis as any).__EF_VERSION__ = version;
