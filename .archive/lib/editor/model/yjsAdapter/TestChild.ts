import {
  getParent,
  model,
  Model,
  idProp,
  tProp,
  types,
  getRefsResolvingTo,
} from "mobx-keystone";
import { yjsAdapterSnapshotProcessor } from "./yjsAdapter";
import { TestRectangle } from "./TestRectangle";
import { type TestParent } from "./TestParent";
import { testChildRef } from "./testChildRef";

@model("ef/Child")
export class TestChild extends Model(
  {
    id: idProp,
    title: tProp(types.string, "").withSetter(),
    childRefs: tProp(types.array(types.ref(testChildRef)), () => []),
    rootRect: tProp(
      types.model<TestRectangle>(() => TestRectangle),
      () => new TestRectangle({}),
    ),
    // subRects: tProp(
    //   types.array(types.model<Rectangle>(() => Rectangle)),
    //   () => [],
    // ),
  },
  yjsAdapterSnapshotProcessor,
) {
  // @modelAction
  // pushSubRects(...rects: Rectangle[]): number {
  //   return this.subRects.push(...rects);
  // }
  get parent(): TestParent | TestChild | undefined {
    const refs = getRefsResolvingTo(this, testChildRef);
    // and from the ref, we can traverse up to the real parent
    const refsArray = Array.from(refs.values());
    if (refsArray.length === 0) {
      return undefined;
    }
    if (refsArray.length > 1) {
      throw new Error("Child has more than one parent");
    }
    const siblings = getParent(refsArray[0]);
    if (siblings === undefined) {
      return undefined;
    }
    return getParent(siblings);
  }
}
