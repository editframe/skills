import { getSnapshot, type AnyModel, fromSnapshot } from "mobx-keystone";
import { connectModelToYJS } from "./yjsAdapter";
import type * as Y from "yjs";
import { createSyncedDocs } from "./createSyncedDocs";

export const assertModelsSync = <Model extends AnyModel>(
  model: Model,
  callback: (
    left: Model,
    right: Model,
    leftDoc: Y.Doc,
    rightDoc: Y.Doc,
  ) => void,
): void => {
  // Create two Y docs that are cross-synced at the protocol level
  const [doc1, doc2] = createSyncedDocs();

  // Clone the model under test
  const copy = fromSnapshot(getSnapshot(model));

  // Connect the model and its clone to the docs
  connectModelToYJS(model, doc1.getMap("root"));
  connectModelToYJS(copy, doc2.getMap("root"));

  // Run the callback, which will mutate the model, clone, or either doc
  callback(model, copy, doc1, doc2);

  // Assert that the model and clone are identical
  assert.deepEqual(getSnapshot(model), getSnapshot(copy));
  // As well as the Y.Doc
  assert.deepEqual(doc1.toJSON(), doc2.toJSON());

  // Finally, create a third model and connect it to the second doc
  // @ts-expect-error this is difficult to type correctly
  const third = new model.constructor({
    // @ts-expect-error this is difficult to type correctly
    id: model.id,
  });

  // Assert the third model is now in sync with the first
  connectModelToYJS(third, doc2.getMap("root"));
  assert.deepEqual(getSnapshot(model), getSnapshot(third));
};
