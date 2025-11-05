export function getPrototypeChain(constructor: Constructor | object) {
  const chain = [constructor];
  let prototype = Object.getPrototypeOf(constructor);
  while (prototype) {
    chain.push(prototype);
    prototype = Object.getPrototypeOf(prototype);
  }
  return chain;
}
