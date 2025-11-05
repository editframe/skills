export const awaitAnimationFrame = () => {
  return new Promise<number>((resolve) => {
    requestAnimationFrame((timestamp) => {
      console.log("AnimationFrame", timestamp);
      resolve(timestamp);
    });
  });
};
