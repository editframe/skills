export const webReadableFromBuffers = (...buffers: Buffer[]) => {
  let index = 0;

  return new ReadableStream({
    pull(controller) {
      if (index < buffers.length) {
        controller.enqueue(buffers[index++]);
      } else {
        controller.close();
      }
    },
  });
};
