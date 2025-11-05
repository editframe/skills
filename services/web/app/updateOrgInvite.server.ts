import { db } from "@/sql-client.server";

export async function acceptInviteById(id: string) {
  const passwordReset = await db
    .updateTable("identity.invites")
    .set({ accepted_at: new Date() })
    .where("id", "=", id)
    .returning("id")
    .executeTakeFirst();

  return {
    id: passwordReset?.id,
  };
}
