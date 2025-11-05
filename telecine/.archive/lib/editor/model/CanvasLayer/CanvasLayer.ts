import { computed } from "mobx";
import { ExtendedModel, idProp, model } from "mobx-keystone";
import { Layer } from "../Layer";

@model("ef/CanvasLayer")
export class CanvasLayer extends ExtendedModel(Layer, {
  id: idProp,
}) {
  canvas = document.createElement("canvas");

  @computed
  get context2d(): CanvasRenderingContext2D | null {
    return this.canvas.getContext("2d");
  }
}
