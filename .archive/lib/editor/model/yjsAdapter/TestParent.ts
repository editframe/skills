import { model, Model, idProp, tProp, types } from "mobx-keystone";
import { yjsAdapterSnapshotProcessor } from "./yjsAdapter";
import { testChildRef } from "./testChildRef";
import { TestChild } from "./TestChild";

@model("ef/Parent")
export class TestParent extends Model(
  {
    id: idProp,
    title: tProp(types.string, "").withSetter(),
    childStore: tProp(
      types.record(types.model<TestChild>(() => TestChild)),
      () => ({}),
    ),
    childRefs: tProp(types.array(types.ref(testChildRef)), () => []),
  },
  yjsAdapterSnapshotProcessor,
) {
  get children(): TestChild[] {
    return this.childRefs.map((ref) => ref.current);
  }
}
