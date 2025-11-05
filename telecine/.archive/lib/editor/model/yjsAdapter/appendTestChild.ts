import { detach, standaloneAction, findParent } from "mobx-keystone";
import { TestParent } from "./TestParent";
import { type TestChild } from "./TestChild";
import { testChildRef } from "./testChildRef";

export const appendTestChild = standaloneAction(
  "ef/appendChild",
  (parent: TestParent | TestChild, child: TestChild) => {
    const root =
      parent instanceof TestParent
        ? parent
        : findParent<TestParent>(
            parent,
            (parent) => parent instanceof TestParent
          );
    if (!root) {
      throw new Error("Could not find root");
    }
    const oldParent = child.parent;
    if (oldParent) {
      const oldChildRef = oldParent.childRefs.find(
        (ref) => ref.id === child.id
      );
      if (oldChildRef) {
        detach(oldChildRef);
      }
    }
    root.childStore[child.id] ||= child;
    parent.childRefs.push(testChildRef(child));
    return child;
  }
);
