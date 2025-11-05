import { Array as YArray } from "yjs";

export const KVFromEntries = (entries: Array<[string, any]>): YArray<any> => {
  const kv = new YArray<any>();
  entries.forEach(([key, value]) => {
    kv.push([{ key, val: value }]);
  });
  return kv;
};
