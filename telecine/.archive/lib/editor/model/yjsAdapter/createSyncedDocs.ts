import { Doc as YDoc, applyUpdate } from "yjs";

export const createSyncedDocs = (): [doc1: YDoc, doc2: YDoc] => {
  const doc1 = new YDoc();
  const doc2 = new YDoc();

  doc1.on("update", (update) => {
    applyUpdate(doc2, update, "doc1");
  });

  doc2.on("update", (update) => {
    applyUpdate(doc1, update, "doc2");
  });

  return [doc1, doc2] as const;
};
