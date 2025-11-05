import type fs from "node:fs";

export const awaitCloseStream = async (
  stream: fs.WriteStream,
): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    stream.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};
