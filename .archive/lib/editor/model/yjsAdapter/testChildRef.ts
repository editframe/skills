import {
  type RefConstructor,
  customRef,
  getParent,
  detach,
  findParent,
} from "mobx-keystone";
import { TestParent } from "./TestParent";
import { type TestChild } from "./TestChild";

export const testChildRef: RefConstructor<TestChild> = customRef<TestChild>(
  "ChildRef",
  {
    resolve(ref) {
      // If the ref has been removed from it's parent, it's no longer valid
      // returning undefined will clean up the back reference
      if (getParent(ref) === undefined) {
        return undefined;
      }
      const parent = findParent<TestParent>(
        ref,
        (parent) => parent instanceof TestParent
      );
      if (!parent) {
        throw new Error("Could not find parent");
      }
      return parent.childStore[ref.id];
    },
    onResolvedValueChange(ref, newLayer, oldLayer) {
      if (oldLayer && !newLayer) {
        detach(ref);
      }
    },
  }
);
