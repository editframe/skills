import { beforeEach } from "vitest";

export const fixtures = <T extends object>(builder: () => Promise<T>) => {
  const ref: T = {} as T;
  beforeEach(async () => {
    Object.assign(ref, await builder());
  });
  return ref;
};
