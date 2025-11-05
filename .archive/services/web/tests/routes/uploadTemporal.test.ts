import { createReadStream } from "node:fs";
import path from "node:path";
import { createReadableStreamFromReadable } from "@react-router/node";

import { stat } from "node:fs/promises";
import type { Orgs, Projects, Users } from "@/sql-client.server";
import { sql } from "@/sql-client.server/sql";
import { parseByteRangeHeader } from "@/util/parseByteRangeHeader";
import { createSessionCookie } from "@/util/session.server";
import { beforeAll, it } from "vitest";
import { action as uploadChunk } from "~/routes/$uploadType.$id.chunks";
import { action as createTemporal } from "~/routes/projects.$id.video_tracks";

let testUser: Users;
let testOrg: Orgs;
let testProject: Projects;
let testCookie: string;

describe.skip("uploadTemporal", () => {
  beforeAll(async () => {
    const userResult = await sql<Users>(/* SQL */ `
    INSERT INTO identity.users default values RETURNING *
  `);

    testUser = userResult.rows[0]!;

    const orgResult = await sql<Orgs>(
      /* SQL */ `
    INSERT INTO identity.orgs (display_name, primary_user_id) VALUES ('test', $1) RETURNING *
  `,
      [testUser.id],
    );

    testOrg = orgResult.rows[0]!;

    const projectResult = await sql<Projects>(
      /* SQL */ `
    INSERT INTO video.projects (title, creator_id, org_id) VALUES ('test', $1, $2) RETURNING *
  `,
      [testUser.id, testOrg.id],
    );

    testProject = projectResult.rows[0]!;

    testCookie = await createSessionCookie({
      type: "test",
      uid: testUser.id,
      cid: "test",
      email: "test-user@example.org",
    });
  });

  it("works", async () => {
    const stats = await stat(path.resolve("./public/video/10s-bars.frag.mp4"));
    const formData = new FormData();
    formData.set("name", "10s-bars.frag.mp4");
    formData.set("bytesize", String(stats.size));
    const result = await createTemporal({
      context: {},
      params: { id: testProject.id },
      request: new Request("test:/", {
        headers: {
          cookie: testCookie,
        },
        method: "POST",
        body: formData,
      }),
    });

    const data = await result?.json();
    if (data && "error" in data) {
      throw new Error(String(data.error));
    }

    let nextByte = 0;
    const chunkSize = 1024 * 10;
    const filePath = path.resolve("./public/video/10s-bars.frag.mp4");

    let complete = false;
    while (complete === false) {
      const endByte = Math.min(nextByte + chunkSize - 1, stats.size - 1);
      const chunkResult = await uploadChunk({
        context: {},
        params: { uploadType: "temporals", id: data.id },
        request: new Request("test:/", {
          headers: {
            "Content-Range": `bytes=${nextByte}-${endByte}/${stats.size}`,
            cookie: testCookie,
          },
          method: "POST",
          duplex: "half",
          body: createReadableStreamFromReadable(
            createReadStream(filePath, {
              start: nextByte,
              end: endByte,
            }),
          ),
        }),
      });

      if (!chunkResult) {
        throw new Error("Chunk upload failed");
      }

      if (chunkResult.status === 201) {
        complete = true;
        console.log("Chunk upload complete", await chunkResult.json());
        break;
      }
      if (chunkResult.status !== 202) {
        console.log("Chunk upload failed", await chunkResult.json());
        throw new Error("Chunk upload failed");
      }

      const rangeHeader = chunkResult.headers.get("content-range");
      if (!rangeHeader) {
        throw new Error("No range header from server");
      }

      const returnedRange = parseByteRangeHeader(rangeHeader);

      if (!returnedRange) {
        throw new Error("Invalid range header from server");
      }
      console.log("returened range", returnedRange);

      nextByte = returnedRange.end + 1;
    }
  });
});
