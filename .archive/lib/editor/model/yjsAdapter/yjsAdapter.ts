import {
  type AnyModel,
  getTypeInfo,
  getModelMetadata,
  ObjectTypeInfo,
  StringTypeInfo,
  NumberTypeInfo,
  BooleanTypeInfo,
  RecordTypeInfo,
  getSnapshot,
  onChildAttachedTo,
  ModelTypeInfo,
  ArrayTypeInfo,
  RefTypeInfo,
  applySet,
  fromSnapshot,
  arrayActions,
  applySnapshot,
  OrTypeInfo,
  type TypeInfo,
  LiteralTypeInfo,
  type AnyStandardType,
  objectActions,
  TagTypeInfo,
  applyDelete,
  detach,
} from "mobx-keystone";
import { Array as YArray, Map as YMap, Transaction as YTransaction } from "yjs";
import { YKeyValue } from "y-utility/y-keyvalue";
import { reaction } from "mobx";
import { getModelTypeInfo } from "../../getModelTypeInfo";

type KVPatch = Map<
  string,
  | { action: "delete"; oldValue: any }
  | { action: "update"; oldValue: any; newValue: any }
  | { action: "add"; newValue: any }
>;

const shouldIgnoreTransaction = (transaction: YTransaction): boolean => {
  return transaction.local && transaction.origin !== "override-local";
};

export const yjsAdapterSnapshotProcessor = {
  toSnapshotProcessor(rawSnapshot: any, model: AnyModel) {
    const modelTypeInfo = getModelTypeInfo(model.constructor);
    const transformed: any = { data: [] };
    if (rawSnapshot.id) {
      transformed.id = rawSnapshot.id;
    }

    for (const [key, value] of Object.entries(modelTypeInfo.props)) {
      if (key === "id") {
        continue;
      }
      switch (true) {
        case value.typeInfo instanceof TagTypeInfo &&
          value.typeInfo.baseTypeInfo instanceof StringTypeInfo:
        case value.typeInfo instanceof TagTypeInfo &&
          value.typeInfo.baseTypeInfo instanceof NumberTypeInfo:
        case value.typeInfo instanceof TagTypeInfo &&
          value.typeInfo.baseTypeInfo instanceof BooleanTypeInfo:
        case value.typeInfo instanceof StringTypeInfo:
        case value.typeInfo instanceof NumberTypeInfo:
        case value.typeInfo instanceof BooleanTypeInfo:
        case allOrTypesAreSimple(value.typeInfo): {
          transformed.data.push({
            key,
            val: rawSnapshot[key],
          });
          break;
        }
        default: {
          transformed[key] = rawSnapshot[key];
        }
      }
    }
    return transformed;
  },
  fromSnapshotProcessor(snapshot: any) {
    const transformed = structuredClone(snapshot);
    snapshot.data?.forEach(({ key, val }: { key: string; val: any }) => {
      transformed[key] = val;
    });
    if (snapshot.id) {
      transformed.id = snapshot.id;
    }
    transformed.$modelType = snapshot.$modelType;
    return transformed;
  },
};

const isSimpleLiteral = (typeInfo: TypeInfo): boolean => {
  return (
    typeInfo instanceof LiteralTypeInfo &&
    (typeof typeInfo.literal === "string" ||
      typeof typeInfo.literal === "number" ||
      typeof typeInfo.literal === "boolean" ||
      typeof typeInfo.literal === "undefined")
  );
};
const isSimpleTypeInfo = (typeInfo: TypeInfo): boolean => {
  return (
    typeInfo instanceof StringTypeInfo ||
    typeInfo instanceof NumberTypeInfo ||
    typeInfo instanceof BooleanTypeInfo ||
    isSimpleLiteral(typeInfo)
  );
};
const isNotSimpleTypeInfo = (typeInfo: TypeInfo): boolean => {
  return !isSimpleTypeInfo(typeInfo);
};
const notAllOrTypesAreSimple = (typeInfo: TypeInfo): boolean => {
  return (
    typeInfo instanceof OrTypeInfo &&
    typeInfo.orTypeInfos.some(isNotSimpleTypeInfo)
  );
};
const allOrTypesAreSimple = (typeInfo?: TypeInfo): boolean => {
  return (
    typeInfo instanceof OrTypeInfo &&
    typeInfo.orTypeInfos.every(isSimpleTypeInfo)
  );
};

const isMaybeModel = (typeInfo: TypeInfo): boolean => {
  return (
    typeInfo instanceof OrTypeInfo &&
    typeInfo.orTypeInfos.every(
      (typeInfo) =>
        typeInfo instanceof ModelTypeInfo ||
        (typeInfo instanceof LiteralTypeInfo && typeInfo.literal === undefined),
    )
  );
};

const buildDataKVChangeHandler = (
  model: AnyModel,
): ((event: KVPatch, transaction: YTransaction) => void) => {
  return (event: KVPatch, transaction: YTransaction): void => {
    if (shouldIgnoreTransaction(transaction)) {
      return;
    }

    for (const [key, patch] of event.entries()) {
      switch (patch.action) {
        case "add": {
          // @ts-expect-error key should be validated as a property of model
          applySet(model, key, patch.newValue);
          break;
        }
        case "update": {
          // @ts-expect-error key should be validated as a property of model
          applySet(model, key, patch.newValue);
          break;
        }
        case "delete": {
          // @ts-expect-error key should be validated as a property of model
          applySet(model, key, undefined);
        }
      }
    }
  };
};

/**
 * Sets the value in the YMap if the value is not undefined and the key does not already exist.
 *
 * @param map - The YMap object.
 * @param key - The key to set the value for.
 * @param value - The value to set.
 */
const findOrSet = <ValueType>(
  map: YMap<any>,
  key: string,
  value: ValueType,
): ValueType => {
  if (value === undefined) {
    return map.get(key);
  }
  return (map.get(key) as ValueType) ?? map.set(key, value);
};

type ObjectTypeInfoProps = Readonly<
  Record<
    keyof AnyModel,
    Readonly<{
      type: AnyStandardType;
      typeInfo: TypeInfo;
    }>
  >
>;

type Disposer = (() => void) | ((runDisposer: boolean) => void);
export const connectModelToYJS = (
  model: AnyModel,
  yMap: YMap<any>,
): Disposer[] => {
  const metaData = getModelMetadata(model);
  const typeInfo = getTypeInfo(metaData.dataType);

  if (model.$modelId !== undefined) {
    findOrSet(yMap, "id", model.$modelId);
  }
  findOrSet(yMap, "$modelType", model.$modelType);

  const disposers: Disposer[] = [];

  const dataArray = findOrSet(
    yMap,
    "data",
    new YArray<{ key: string; val: unknown }>(),
  );

  // This keyvalue object must be created outside the property loop below.
  // Otherwise we'll over-subscribe to the change event.
  const dataKV = new YKeyValue(dataArray);
  const dataKVChangeHandler = buildDataKVChangeHandler(model);

  dataKV.on("change", dataKVChangeHandler);
  disposers.push(() => {
    dataKV.off("change", dataKVChangeHandler);
  });

  if (typeInfo instanceof ObjectTypeInfo) {
    for (const entry of Object.entries(typeInfo.props)) {
      const [key, value] = entry as [
        /*
          This absolute nonsense of a type assertion is because mapping over
          typeInfo.props results in a type of string for key. This means model[key]
          is a type error.
          
          - `keyof AnyModel` allows that access.
          - `& string` allows arbitrary use of key as a string
          - `"id"` allows checking whether key is the string "id"

          This particular () grouping is neccessary.

          Overall, this shoud be safe, because we are iterating over the
          runtime defined types of the model, even though typescript doesn't
          understand it.
        */
        (keyof AnyModel & string) | "id",
        ObjectTypeInfoProps[keyof AnyModel],
      ];
      if (key === "id") {
        continue;
      }

      switch (true) {
        case value.typeInfo instanceof TagTypeInfo &&
          value.typeInfo.baseTypeInfo instanceof StringTypeInfo:
        case value.typeInfo instanceof TagTypeInfo &&
          value.typeInfo.baseTypeInfo instanceof NumberTypeInfo:
        case value.typeInfo instanceof TagTypeInfo &&
          value.typeInfo.baseTypeInfo instanceof BooleanTypeInfo:
        case value.typeInfo instanceof StringTypeInfo:
        case value.typeInfo instanceof NumberTypeInfo:
        case value.typeInfo instanceof BooleanTypeInfo:

        case allOrTypesAreSimple(value.typeInfo): {
          if (dataKV.has(key)) {
            applySet(model, key, dataKV.get(key));
          }
          dataKV.set(key, model[key]);
          disposers.push(
            reaction(
              () => model[key],
              (newValue) => {
                if (dataKV.get(key) === model[key]) {
                  return;
                }
                dataKV.set(key, newValue);
              },
            ),
          );
          break;
        }
        case value.typeInfo instanceof RecordTypeInfo: {
          if (!(value.typeInfo.valueTypeInfo instanceof ModelTypeInfo)) {
            throw new Error(
              "keystone record types ONLY supported as dictionaries of other models.",
            );
          }
          const recordMap = findOrSet(yMap, key, new YMap<any>());

          applySnapshot(model[key], recordMap.toJSON());

          recordMap.observe((event) => {
            if (shouldIgnoreTransaction(event.transaction)) {
              return;
            }
            event.changes.keys.forEach((change, changeKey) => {
              switch (change.action) {
                case "add": {
                  const instance = fromSnapshot(
                    recordMap.get(changeKey).toJSON(),
                  );

                  applySet(model[key], instance.id, instance);
                  break;
                }
                case "update": {
                  throw new Error(`Updating record maps not supported.
Maps of records can be updated granularly by updating the record itself.
But individual records can only be added or removed.
And records should not intentionally us the same id as a prior record`);
                }
                case "delete": {
                  objectActions.delete(model[key], changeKey);
                  break;
                }
              }
            });
          });

          onChildAttachedTo(
            () => model[key],
            (child: any) => {
              const childMap = findOrSet(
                recordMap,
                child.id,
                new YMap([
                  ["id", child.id],
                  ["$modelType", child.$modelType],
                ]),
              );

              const childDisposers = connectModelToYJS(child, childMap);

              return () => {
                recordMap.delete(child.id);
                childDisposers.forEach((disposer) => {
                  disposer();
                });
              };
            },
          );
          break;
        }
        case value.typeInfo instanceof ArrayTypeInfo: {
          if (!(value.typeInfo.itemTypeInfo instanceof RefTypeInfo)) {
            throw new Error(
              "keystone array types ONLY supported as arrays of refs.",
            );
          }

          const array = findOrSet(yMap, key, new YArray<any>());

          applySnapshot(model[key], array.toJSON());

          array.observe((event) => {
            if (shouldIgnoreTransaction(event.transaction)) {
              return;
            }
            let index = 0;
            for (const change of event.delta) {
              if (change.retain !== undefined) {
                index += change.retain;
                continue;
              }
              if (change.insert !== undefined) {
                if (!Array.isArray(change.insert)) {
                  throw new Error("Unexpected insert type, expected array.");
                }
                index += change.insert.length;
                arrayActions.splice(
                  model[key],
                  index,
                  0,
                  ...change.insert.map((item) => fromSnapshot(item)),
                );
              } else if (change.delete !== undefined) {
                arrayActions.splice(model[key], index, change.delete);
              }
            }
          });

          onChildAttachedTo(
            () => model[key],
            (child: any) => {
              const index = model[key].indexOf(child);
              if (array.get(index)?.id === child.id) {
                return () => {
                  array.forEach((item, i) => {
                    if (item.id === child.id) {
                      array.delete(i, 1);
                    }
                  });
                };
              }
              array.insert(index, [getSnapshot(child)]);
              return () => {
                array.forEach((item, i) => {
                  if (item.id === child.id) {
                    array.delete(i, 1);
                  }
                });
              };
            },
            {},
          );
          break;
        }
        case isMaybeModel(value.typeInfo):
        case value.typeInfo instanceof ModelTypeInfo: {
          if (yMap.get(key) !== undefined) {
            if (model[key] === undefined) {
              applySet(model, key, fromSnapshot(yMap.get(key).toJSON()));
            } else {
              applySnapshot(model[key], yMap.get(key).toJSON());
            }
          }
          yMap.observe((event) => {
            if (shouldIgnoreTransaction(event.transaction)) {
              return;
            }
            event.changes.keys.forEach((change, changeKey) => {
              if (changeKey !== key) {
                return;
              }
              switch (change.action) {
                case "add": {
                  const modelYMap = yMap.get(key);
                  const modelInstance = fromSnapshot(modelYMap.toJSON());
                  applySet(model, key, modelInstance);
                  connectModelToYJS(modelInstance, modelYMap);
                  break;
                }
                case "delete": {
                  if (model[key]) {
                    detach(model[key]);
                  }
                  break;
                }
                case "update": {
                  throw new Error(`Updating model maps not supported.`);
                }
              }
            });
          });
          disposers.push(
            reaction(
              () => model[key],
              (next) => {
                if (next === undefined) {
                  yMap.delete(key);
                } else {
                  const modelYMap = findOrSet(
                    yMap,
                    key,
                    new YMap([["$modelType", model[key].$modelType]]),
                  );
                  connectModelToYJS(model[key], modelYMap);
                }
              },
              { fireImmediately: true },
            ),
          );
          break;
        }
        case notAllOrTypesAreSimple(value.typeInfo): {
          console.error(
            "Or types with non-simple types not supported. Non-simple types:",
            /** This is a safe type assertion because notAllOrTypesAreSimple implies the type */
            (value.typeInfo as OrTypeInfo).orTypeInfos.filter(
              isNotSimpleTypeInfo,
            ),
          );
          throw new Error("Or types with non-simple types not supported.");
        }
        default: {
          console.error(
            `Unhandled type: ${key} ${value.typeInfo.constructor.name}`,
          );
          throw new Error(
            `Unhandled type: ${key} is type ${value.typeInfo.constructor.name}.
See yjsAdapter for currently supported types.`,
          );
        }
      }
    }
  } else {
    throw new Error(`Unexpected typeInfo type: ${typeInfo.constructor.name}.
This might be because you have a model with out any typed properties.`);
  }

  return disposers;
};
