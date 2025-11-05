import type { EmailPasswords, Renders } from "@/sql-client.server";
import { sql } from "@/sql-client.server/sql";

export const makeRenderFixture = (snapshot: any) => {
  return async (
    { uniqueUser }: { uniqueUser: EmailPasswords },
    use: (r: Renders) => Promise<void>,
  ) => {
    const {
      rows: [render],
    } = await sql<Renders>(
      /* SQL */ `
      insert into video.renders (creator_id, snapshot)
      values ($1, $2)
      returning *
    `,
      [uniqueUser.user_id, snapshot],
    );
    if (!render) throw new Error("Failed to create render");
    await use(render);
  };
};
