export const filterTraceData = (key: string, value: any) => {
  switch (key) {
    case "salt":
    case "hash": {
      return "redacted";
    }
  }
  if (value instanceof Buffer) {
    return `buffer: ${value.byteLength} bytes`;
  }
  if (value instanceof Uint8Array) {
    return `binary: ${value.byteLength} bytes`;
  }
  return value;
};
