export type Heading = {
  level: number;
  value: string;
  slug: string;
  id: string;
  text: string;
};

type JsonifyObject<T> = {
  [P in keyof T]: T[P] extends object ? JsonifyObject<T[P]> : T[P];
};

export type JsonifiedHeading = JsonifyObject<Heading>[];