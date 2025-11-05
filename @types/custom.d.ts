declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

declare module "y-websocket";

type Maybe<T> = T | undefined;

type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] };

type WithRequired<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>> &
  Required<T, K>;

interface Point2D {
  x: number;
  y: number;
}

type Point2DTuple = [x: number, y: number];

declare global {
  interface SymbolConstructor {
    readonly metadata: unique symbol;
  }
}

type Constructor<T = {}> = new (...args: any[]) => T;

type Identity<T> = T extends object
  ? // eslint-disable-next-line @typescript-eslint/ban-types
    {} & {
      [P in keyof T]: T[P];
    }
  : T;

type IntersectionOf<A extends any[]> = A extends [infer T, ...infer R]
  ? T & IntersectionOf<R>
  : unknown;

type Mix<T extends Constructor> = Identity<T>;
type MixedProps<T> = Identity<Partial<T>>;

interface PrototypeType<T> extends Function {
  prototype: T;
}

interface ConstructorFunctionType<T = any> extends PrototypeType<T> {
  new (...args: any[]): T;
}

type ConstructorType<
  T = unknown,
  Static extends Record<string, any> = PrototypeType<T>,
> = (ConstructorFunctionType<T> | PrototypeType<T>) & {
  [Key in keyof Static]: Static[Key];
};

type ThisConstructor<
  T extends { prototype: unknown } = { prototype: unknown },
> = T;
type This<T extends ThisConstructor> = T["prototype"];
