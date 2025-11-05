/** method decorator to memoize the value of a getter */
export const memoize = <
  Target extends object,
  PropertyKey extends keyof Target,
>(
  _target: Target,
  _propertyKey: PropertyKey,
  descriptor: TypedPropertyDescriptor<Target[PropertyKey]>,
): void => {
  const get = descriptor.get;
  if (!get) return;
  const memoized = new WeakMap();
  descriptor.get = function () {
    if (!memoized.has(this)) {
      memoized.set(this, get.call(this));
    }
    return memoized.get(this);
  };
};
