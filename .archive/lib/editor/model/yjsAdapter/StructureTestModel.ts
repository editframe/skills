import { model, Model, idProp, tProp, types } from "mobx-keystone";
import { yjsAdapterSnapshotProcessor } from "./yjsAdapter";
import { TestParent } from "./TestParent";
import { NestedStructureTestModel } from "./NestedStructureTestModel";

@model("ef/StructureTestModel")
export class StructureTestModel extends Model(
  {
    id: idProp,
    dataProp: tProp(types.string, "test-string"),
    otherDataProp: tProp(types.number, 0),
    nestedProp: tProp(
      types.model<NestedStructureTestModel>(() => NestedStructureTestModel),
      () => new NestedStructureTestModel({}),
    ),
    nestedParent: tProp(
      types.model<TestParent>(() => TestParent),
      () => new TestParent({ id: "nestedParent" }),
    ),
  },
  yjsAdapterSnapshotProcessor,
) {}
