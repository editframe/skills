import "fake-indexeddb/auto";
// beforeEach(async () => {
//   const dbs = await indexedDB.databases();
//   await Promise.all(
//     dbs.map(async (db) => {
//       console.log("DELETE", db.name);
//       await new Promise<void>((resolve, reject) => {
//         if (db.name === undefined) {
//           throw new Error("db.name is undefined");
//         }
//         const deletionRequest = indexedDB.deleteDatabase(db.name);
//         deletionRequest.onerror = () => {
//           reject(deletionRequest.error);
//         };
//         deletionRequest.onsuccess = () => {
//           resolve();
//         };
//       });
//     }),
//   );
// });
