import "dotenv/config";
import { deleteAllEmails } from "../util/mailhog";

export default async function setup() {
  await deleteAllEmails();
}
