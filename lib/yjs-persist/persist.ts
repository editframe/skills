import { db } from "@/sql-client.server";
import { sqltxCallback } from "@/sql-client.server/sqltxCallback";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import { WebSocket } from "ws";
import * as awareness from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import * as Y from "yjs";

// export async function initSchema() {
//   await sql(/* SQL */ `
//     CREATE SCHEMA IF NOT EXISTS yjs;
//     CREATE TABLE IF NOT EXISTS yjs.docs (
//       id text primary key
//     );
//     CREATE TABLE IF NOT EXISTS yjs.updates (
//       id bigserial primary key,
//       doc_id text references yjs.docs(id) not null,
//       update bytea not null,
//       created_at timestamptz default now()
//     );
//   `);
// }

// await initSchema();

export const docsById: Record<string, WSSharedDoc> = {};

export const COMPACT_DOC_THRESHOLD = Number.parseFloat(
  process.env.YJS_COMPACTION_THRESHOLD || "100",
);

export async function loadDoc(id: string): Promise<WSSharedDoc> {
  if (docsById[id]) {
    return docsById[id] as WSSharedDoc;
  }
  const yDoc = new WSSharedDoc(id);
  docsById[yDoc.guid] = yDoc;

  const updates = await db
    .selectFrom("video.project_updates")
    .where("project_id", "=", yDoc.guid)
    .orderBy("id", "asc")
    .select(["update"])
    .execute();

  for (const update of updates) {
    Y.applyUpdate(yDoc, update.update);
  }
  yDoc.on("update", async (update: Uint8Array, _origin: any) => {
    try {
      await db
        .insertInto("video.project_updates")
        .values({
          project_id: yDoc.guid,
          update: Buffer.from(update),
        })
        .execute();

      const result = await db
        .selectFrom("video.project_updates")
        .where("project_id", "=", yDoc.guid)
        .select(db.fn.countAll().as("count"))
        .executeTakeFirst();

      if (Number(result?.count) > COMPACT_DOC_THRESHOLD) {
        await compactDoc(yDoc.guid);
      }
    } catch (error) {
      console.error("failed to store update", error);
    }
  });
  return yDoc;
}

export async function compactDoc(id: string): Promise<void> {
  await sqltxCallback(async (client) => {
    const { rows: updates } = await client.query<{
      update: Buffer;
      id: number;
    }>(
      /* SQL */ `
      SELECT update, id
      FROM video.project_updates 
      WHERE project_id = $1
      ORDER BY id ASC
    `,
      [id],
    );
    if (updates.length === 0) {
      return;
    }

    const yDoc = new Y.Doc({ guid: id });
    yDoc.transact(() => {
      for (const update of updates) {
        Y.applyUpdate(yDoc, update.update);
      }
    });
    const compacted = Y.encodeStateAsUpdate(yDoc);

    const latestId = updates[updates.length - 1]?.id;

    await client.query(
      /* SQL */ `
      DELETE FROM video.project_updates
      WHERE project_id = $1 and id < $2
    `,
      [id, latestId],
    );

    await client.query(
      /* SQL */ `
      UPDATE video.project_updates
      SET update = $2
      WHERE id = $1 AND project_id = $3
    `,
      [latestId, compacted, id],
    );
  });
}

export async function unloadDoc(id: string): Promise<void> {
  const doc = docsById[id];
  if (doc) {
    doc.destroy();
    delete docsById[id];
  }
}

const messageSync = 0;
const messageAwareness = 1;

class WSSharedDoc extends Y.Doc {
  sockets = new Map<WebSocket, Set<number>>();

  awareness = new awareness.Awareness(this);

  constructor(id: string) {
    // TODO: should we be using gc???
    super({ guid: id, gc: true });

    this.awareness.setLocalState(null);
    this.awareness.on("update", this.awarenessChangeHandler);
    this.on("update", this.updateHandler);
  }

  send(conn: WebSocket, buff: Uint8Array, reason?: string) {
    if (conn.readyState > WebSocket.OPEN) {
      this.closeWs(conn);
    }
    try {
      conn.send(buff, (error) => {
        if (error) {
          if (!error.message.match(/not open/)) {
            console.error(`failed to send ${reason} message`, error);
          }
          this.closeWs(conn);
        }
      });
    } catch (error) {
      console.error(`failed to send ${reason} message`, error);
      this.closeWs(conn);
    }
  }

  closeWs(ws: WebSocket) {
    if (this.sockets.has(ws)) {
      const controlledIds = this.sockets.get(ws);
      this.sockets.delete(ws);
      awareness.removeAwarenessStates(
        this.awareness,
        Array.from(controlledIds ?? []),
        null,
      );
      if (this.sockets.size === 0) {
        this.destroy();
        delete docsById[this.guid];
        void compactDoc(this.guid);
      }
    }
    ws.close();
  }

  updateHandler = (update: Uint8Array, _origin: any) => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeUpdate(encoder, update);
    const buff = encoding.toUint8Array(encoder);
    this.sockets.forEach((_, conn) => {
      this.send(conn, buff, "updateHandler");
    });
  };

  awarenessChangeHandler = (
    {
      added,
      updated,
      removed,
    }: { added: number[]; updated: number[]; removed: number[] },
    ws: WebSocket | null,
  ) => {
    const changedClients = added.concat(updated, removed);
    if (ws !== null) {
      const connControlledIds = this.sockets.get(ws);
      if (connControlledIds !== undefined) {
        added.forEach((clientID) => {
          connControlledIds.add(clientID);
        });
        removed.forEach((clientID) => {
          connControlledIds.delete(clientID);
        });
      }
    }
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageAwareness);
    encoding.writeVarUint8Array(
      encoder,
      awareness.encodeAwarenessUpdate(this.awareness, changedClients),
    );
    const buff = encoding.toUint8Array(encoder);
    this.sockets.forEach((_, conn) => {
      this.send(conn, buff, "awarenessChangeHandler");
    });
  };
}

export async function connectWs(ws: WebSocket, docId: string) {
  console.log("Connecting client to doc", docId);
  ws.binaryType = "arraybuffer";
  const doc = await loadDoc(docId);
  doc.sockets.set(ws, new Set());
  ws.on("message", (message) => {
    try {
      const uint8Message = new Uint8Array(message as ArrayBuffer);
      const encoder = encoding.createEncoder();
      const decoder = decoding.createDecoder(uint8Message);
      const messageType = decoding.readVarUint(decoder);
      switch (messageType) {
        case messageSync:
          encoding.writeVarUint(encoder, messageSync);
          syncProtocol.readSyncMessage(decoder, encoder, doc, ws);

          // If the `encoder` only contains the type of reply message and no
          // message, there is no need to send the message. When `encoder` only
          // contains the type of reply, its length is 1.
          if (encoding.length(encoder) > 1) {
            doc.send(ws, encoding.toUint8Array(encoder), "initialSync");
          }
          break;
        case messageAwareness:
          awareness.applyAwarenessUpdate(
            doc.awareness,
            decoding.readVarUint8Array(decoder),
            ws,
          );
          break;
      }
    } catch (err) {
      console.error(err);
      // TODO: doc doesn't have an error event
      // doc.emit("error", [err]);
    }
  });

  // Check if connection is still alive
  let pongReceived = true;
  const pingTimeout = 30_000;
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      if (doc.sockets.has(ws)) {
        doc.closeWs(ws);
      }
      clearInterval(pingInterval);
    } else if (doc.sockets.has(ws)) {
      pongReceived = false;
      try {
        ws.ping();
      } catch (e) {
        doc.closeWs(ws);
        clearInterval(pingInterval);
      }
    }
  }, pingTimeout);

  {
    // send sync step 1
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, doc);
    doc.send(ws, encoding.toUint8Array(encoder));
    const awarenessStates = doc.awareness.getStates();
    if (awarenessStates.size > 0) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awareness.encodeAwarenessUpdate(
          doc.awareness,
          Array.from(awarenessStates.keys()),
        ),
      );
      doc.send(ws, encoding.toUint8Array(encoder));
    }
  }

  ws.on("pong", () => {
    pongReceived = true;
  });

  ws.on("close", () => {
    doc.closeWs(ws);
    clearInterval(pingInterval);
  });
}
