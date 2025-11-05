import { observer } from "mobx-react-lite";
import { getModelTypeInfo } from "../getModelTypeInfo";
import {
  AnyModel,
  LiteralTypeInfo,
  NumberTypeInfo,
  OrTypeInfo,
  StringTypeInfo,
  TagTypeInfo,
  standaloneAction,
} from "mobx-keystone";
import { isRangeTag } from "../model/Layer";

const setProperty = standaloneAction(
  "set",
  (model: AnyModel, propName: string, value: any) => {
    model[propName] = value;
  },
);

export const TPropField: React.FC<{ model: AnyModel; propName: string }> =
  observer(({ model, propName }) => {
    const modelInfo = getModelTypeInfo(model.constructor);
    const prop = modelInfo.props[propName];
    if (prop === undefined) {
      return <p>prop is undefined</p>;
    }
    switch (true) {
      case prop.typeInfo instanceof NumberTypeInfo: {
        return (
          <div>
            <label>
              {propName}
              <input
                type="number"
                value={model[propName]}
                onChange={(event) => {
                  setProperty(model, propName, event.target.valueAsNumber);
                }}
              />
            </label>
          </div>
        );
      }
      case prop?.typeInfo instanceof StringTypeInfo: {
        return (
          <div>
            <label>
              {propName}
              <input
                type="text"
                value={model[propName]}
                onChange={(event) => {
                  setProperty(model, propName, event.target.value);
                }}
              />
            </label>
          </div>
        );
      }
      case prop.typeInfo instanceof OrTypeInfo: {
        return (
          <div>
            <label>
              {propName}
              <select
                value={model[propName]}
                onChange={(event) => {
                  setProperty(model, propName, event.target.value);
                }}
              >
                {prop.typeInfo.orTypeInfos.map((type) => {
                  if (type instanceof LiteralTypeInfo) {
                    return (
                      <option
                        key={String(type.literal)}
                        value={String(type.literal)}
                      >
                        {String(type.literal)}
                      </option>
                    );
                  }
                  console.error("Cannot handle non-literal types yet", type);
                })}
              </select>
            </label>
          </div>
        );
      }
      case prop.typeInfo instanceof TagTypeInfo &&
        isRangeTag(prop.typeInfo.tag): {
        return (
          <div>
            <label>
              {propName}
              <input
                type="range"
                min={prop.typeInfo.tag.min}
                max={prop.typeInfo.tag.max}
                step={prop.typeInfo.tag.step}
                value={model[propName]}
                onChange={(event) => {
                  setProperty(model, propName, event.target.valueAsNumber);
                }}
              />
            </label>
          </div>
        );
      }
      default: {
        return (
          <div>
            <label>
              {propName}: {prop.typeInfo?.constructor.name} not supported
            </label>
          </div>
        );
      }
    }
  });
