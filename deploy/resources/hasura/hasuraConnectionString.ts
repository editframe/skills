import * as pulumi from "@pulumi/pulumi";
import { database, hasuraDBPassword } from "../database/database";
import { hasuraUser, hasuraDatabase } from "../database/database";
import { makeSecret } from "../../util/makeSecret";

export const hasuraConnectionString = makeSecret(
  "hasura-conn-string",
  pulumi.interpolate`postgres://${hasuraUser.name}:${hasuraDBPassword.result}@/${hasuraDatabase.name}?host=/cloudsql/${database.connectionName}`,
  [hasuraUser, hasuraDBPassword, hasuraDatabase, database],
);
