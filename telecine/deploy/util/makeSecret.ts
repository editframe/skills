import type * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import { GCP_PROJECT } from "../resources/constants";

/**
 * Creates a new secret in Google Cloud Secret Manager and sets its initial value
 *
 * @param prefix - A unique identifier used to name the secret and its version
 * @param value - The secret value to store. Can be either a string or a Pulumi output
 * @param dependsOn - Optional Pulumi resources that this secret depends on
 * @returns An object containing both the secret and its version resources
 *
 * @example
 * ```typescript
 * const { secret, version } = makeSecret(
 *   "my-api-key",
 *   "secret-value-here",
 *   [someResource]
 * );
 * ```
 */
export function makeSecret(
  prefix: string,
  value: string | pulumi.Output<string>,
  dependsOn: pulumi.ResourceOptions["dependsOn"],
) {
  // Create the secret container in Secret Manager
  const secret = new gcp.secretmanager.Secret(
    `${prefix}-secret`,
    {
      secretId: prefix,
      project: GCP_PROJECT,
      replication: {
        auto: {}, // Use automatic replication
      },
    },
    { dependsOn },
  );

  // Create the first version of the secret with the provided value
  const version = new gcp.secretmanager.SecretVersion(
    `${prefix}-secret-value`,
    {
      secret: secret.id,
      secretData: value,
    },
  );

  return { secret, version };
}
