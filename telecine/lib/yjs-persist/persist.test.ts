import { sql } from "@/sql-client.server/sql";
import {
  loadDoc,
  compactDoc,
  connectWs,
  unloadDoc,
  docsById,
  COMPACT_DOC_THRESHOLD,
} from "./persist";
import { WebSocketServer } from "ws";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

let testServer: WebSocketServer;

beforeEach(async () => {
  // TODO: Not sure how to do this in kysely. Leaving as sql for now.
  await sql(/* SQL */ "TRUNCATE yjs.docs cascade");
  testServer = new WebSocketServer({
    port: 7777,
  });
  testServer.on("connection", (ws, request) => {
    if (!request.url) {
      ws.close();
      return;
    }
    connectWs(ws, request.url.slice(1));
  });
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    testServer.clients.forEach((client) => {
      client.terminate();
    });
    testServer.close((error) => {
      error ? reject(error) : resolve();
    });
  });
});

async function getConnectedYDoc(id: string) {
  const doc = new Y.Doc({ guid: id });
  const provider = new WebsocketProvider("ws://localhost:7777", id, doc);
  await new Promise((resolve) => {
    provider.on("synced", () => {
      resolve(doc);
    });
  });

  return { doc, socket: provider, awareness: provider.awareness };
}

/**
 * Waits for a specific number of updates to be recorded in the database for a given document ID.
 * @param id - The ID of the document.
 * @param count - The expected number of updates.
 */
async function waitForUpdates(id: string, count: number) {
  await vi.waitFor(async () => {
    // TODO: yjs table not currently in database, can't migrate to kysely
    const {
      rows: [result],
    } = await sql(
      /* SQL */ "select count(*) from yjs.updates where doc_id = $1",
      [id],
    );
    assert.equal(result?.count, count);
  });
}

describe("Persisting yjs docs", () => {
  it("loads documents by their id", async () => {
    const doc = await loadDoc("example");
    const doc2 = await loadDoc("example");

    assert.equal(doc.guid, "example");

    const doc3 = await loadDoc("example2");

    assert.notEqual(doc2, doc3);
  });

  it("stores updates", async () => {
    const doc = await loadDoc("stored");
    doc.getArray("messages").push(["hi"]);
    doc.getArray("messages").push(["hello"]);
    doc.getArray("messages").push(["how are you?"]);
    await waitForUpdates("stored", 3);
    await unloadDoc("stored");

    await vi.waitFor(async () => {
      const doc2 = await loadDoc("stored");
      doc2.getArray("messages");
      assert.deepEqual(doc2.getArray("messages").toArray(), [
        "hi",
        "hello",
        "how are you?",
      ]);
    });
  });

  it("compacts updates", async () => {
    const doc = await loadDoc("compacted");
    const size = 10;
    for (let i = 0; i < size; i++) {
      doc.getArray("messages").push([i]);
    }

    await waitForUpdates("compacted", size);

    await unloadDoc("compacted");
    await compactDoc("compacted");
    await waitForUpdates("compacted", 1);

    await vi.waitFor(async () => {
      const doc2 = await loadDoc("compacted");
      doc2.getArray("messages");

      const numbers = Array.from({ length: size }, (_, i) => i);
      assert.deepEqual(doc2.getArray("messages").toArray(), numbers);
    });
  });

  it("syncs over websockets", async () => {
    const one = await getConnectedYDoc("client-doc");
    const two = await getConnectedYDoc("client-doc");

    one.doc.getArray("messages").push(["hi"]);
    two.doc.getArray("messages").push(["hello"]);

    await waitForUpdates("client-doc", 2);

    one.awareness.setLocalStateField("no", "1");
    two.awareness.setLocalStateField("no", "2");

    await vi.waitFor(() => {
      assert.deepEqual(one.doc.getArray("messages").toArray(), ["hi", "hello"]);
      assert.deepEqual(two.doc.getArray("messages").toArray(), ["hi", "hello"]);
    });

    const three = await getConnectedYDoc("client-doc");
    three.awareness.setLocalStateField("no", "3");

    assert.deepEqual(three.doc.getArray("messages").toArray(), ["hi", "hello"]);

    await vi.waitFor(() => {
      assert.deepEqual(
        one.awareness.getStates(),
        new Map([
          [one.awareness.clientID, { no: "1" }],
          [two.awareness.clientID, { no: "2" }],
          [three.awareness.clientID, { no: "3" }],
        ]),
        "awareness should include both clients",
      );

      assert.deepEqual(one.awareness.getStates(), two.awareness.getStates());
    });
  });

  it("cleans up resources when clients disconnect", async () => {
    const shared = await loadDoc("cleanup");
    const one = await getConnectedYDoc("cleanup");
    const two = await getConnectedYDoc("cleanup");

    one.socket.destroy();
    await vi.waitFor(() => {
      assert.equal(shared.sockets.size, 1);
    });

    two.socket.destroy();
    await vi.waitFor(() => {
      assert.equal(shared.sockets.size, 0);
    });

    assert.isUndefined(docsById.cleanup);
  });

  it("compacts updates when all clients disconnect", async () => {
    const shared = await loadDoc("disconnect-compaction");
    const one = await getConnectedYDoc("disconnect-compaction");
    const two = await getConnectedYDoc("disconnect-compaction");

    one.doc.getArray("messages").push(["hi"]);
    two.doc.getArray("messages").push(["hello"]);

    await waitForUpdates("disconnect-compaction", 2);

    one.socket.destroy();
    two.socket.destroy();

    await vi.waitFor(() => {
      assert.equal(shared.sockets.size, 0);
    });

    await waitForUpdates("disconnect-compaction", 1);
  });

  it("compacts updates when a threshold number of updates have been reached", async () => {
    const shared = await loadDoc("threshold-compaction");
    const one = await getConnectedYDoc("threshold-compaction");

    const size = COMPACT_DOC_THRESHOLD;
    for (let i = 0; i < size; i++) {
      one.doc.getArray("messages").push([i]);
    }

    await waitForUpdates("threshold-compaction", size);

    one.doc.getArray("messages").push(["straw to break the camels back"]);

    await waitForUpdates("threshold-compaction", 1);

    one.socket.destroy();

    await vi.waitFor(() => {
      assert.equal(shared.sockets.size, 0);
    });
  });
});
