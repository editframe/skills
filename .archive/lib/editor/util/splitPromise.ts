export type Resolve<T> = (value: T) => void;
export type Reject = (reason?: any) => void;

export const splitPromise = <T>(): readonly [
  promise: Promise<T>,
  resolve: Resolve<T>,
  reject: Reject,
] => {
  let resolve: (value: T) => void;
  let reject: (reason?: any) => void;
  const newPromise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return [newPromise, resolve!, reject!] as const;
};
