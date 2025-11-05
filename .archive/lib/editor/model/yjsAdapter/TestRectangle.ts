import { model, Model, tProp, types } from "mobx-keystone";
import { yjsAdapterSnapshotProcessor } from "./yjsAdapter";

@model("ef/Rectangle")
export class TestRectangle extends Model(
  {
    x: tProp(types.number, 0).withSetter(),
    y: tProp(types.number, 0).withSetter(),
    width: tProp(types.number, 0).withSetter(),
    height: tProp(types.number, 0).withSetter(),
  },
  yjsAdapterSnapshotProcessor,
) {}
