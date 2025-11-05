import { model, Model, tProp, types } from "mobx-keystone";
import { yjsAdapterSnapshotProcessor } from "./yjsAdapter";

@model("ef/NestedStructureTestModel")
export class NestedStructureTestModel extends Model(
  {
    dataProp: tProp(types.string, "test-string"),
    otherDataProp: tProp(types.number, 0),
  },
  yjsAdapterSnapshotProcessor,
) {}
