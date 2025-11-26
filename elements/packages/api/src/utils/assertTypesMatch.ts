// Type helper that will cause a compilation error
type Equals<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;
// Force error with const assertion
export const assertTypesMatch = <T, U>(
  value: Equals<T, U> extends true ? true : never,
) => value;
