import { getTypeInfo, ModelTypeInfo } from "mobx-keystone";

export const getModelTypeInfo = (model: any): ModelTypeInfo => {
  const modelInfo = getTypeInfo(model);
  if (!(modelInfo instanceof ModelTypeInfo)) {
    throw new Error(
      "objects passed into getModelTypeInfo MUST be a model type",
    );
  }
  return modelInfo;
};
