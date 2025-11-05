import { type AnyModel } from "mobx-keystone";
import { Layer } from "./Layer";
import { type ReactNode } from "react";
import { getModelTypeInfo } from "../getModelTypeInfo";

interface RegisteredModel<LayerType extends AnyModel = AnyModel> {
  stageComponent: (props: { layer: LayerType }) => ReactNode;
  controlledStageComponent?: (props: { layer: LayerType }) => ReactNode;
  propertiesPanelComponent?: (props: { layer: LayerType }) => ReactNode;
}
const layerRegistry: Record<string, RegisteredModel> = {};

export const LayerRegistry = {
  getStageComponent: (
    model?: AnyModel,
  ): RegisteredModel["stageComponent"] | undefined => {
    if (!model) return;
    return layerRegistry[model.$modelType]?.stageComponent;
  },
  getControlledStageComponent: (
    model?: AnyModel,
  ): RegisteredModel["controlledStageComponent"] | undefined => {
    if (!model) return;
    return layerRegistry[model.$modelType]?.controlledStageComponent;
  },
  getPropertiesPanelComponent: (
    model?: AnyModel,
  ): RegisteredModel["propertiesPanelComponent"] | undefined => {
    if (!model) return;
    return layerRegistry[model.$modelType]?.propertiesPanelComponent;
  },
};

// @ts-expect-error for debugging
window.$LayerRegistry = layerRegistry;

export const registerLayer = <ModelClazz>(
  model: ModelClazz,
  // @ts-expect-error this type is incorrect, but it works on the registration side
  registration: RegisteredModel<InstanceType<ModelClazz>>,
): void => {
  const modelInfo = getModelTypeInfo(model);
  if (!(modelInfo.modelClass.prototype instanceof Layer)) {
    throw new Error(
      "models passed into registerModel MUST inherit from Layer class",
    );
  }
  // @ts-expect-error this type is incorrect, but it works on the registration side
  layerRegistry[modelInfo.modelType] = registration;
};
