import "../../services/load-config";
import { deleteAllEmails } from "./mailhog";

export default async function setup() {
  await deleteAllEmails();
}
