import * as pulumi from "@pulumi/pulumi";
import { makeSecret } from "../../util/makeSecret";
import { hasuraJwtSecretToken } from "../secrets";

export const hasuraJwtSecret = makeSecret(
  "hasura-jwt",
  pulumi.interpolate`{ "type": "HS256", "key": "${hasuraJwtSecretToken.token.result}" }`,
  [hasuraJwtSecretToken.token],
);
