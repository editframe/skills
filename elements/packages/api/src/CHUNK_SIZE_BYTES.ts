export let CHUNK_SIZE_BYTES = 8 * 1024 * 1024; // 8MiB

if ("process" in globalThis && process.env.CHUNK_SIZE_BYTES) {
  CHUNK_SIZE_BYTES = Number.parseInt(process.env.CHUNK_SIZE_BYTES, 10);
}
