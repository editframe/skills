import * as gcp from "@pulumi/gcp";
import * as random from "@pulumi/random";
import { GCP_PROJECT } from "../resources/constants";

/**
 * Represents the components of a managed secret token in GCP Secret Manager
 */
interface SecretToken {
  /** The GCP Secret Manager secret resource */
  secret: gcp.secretmanager.Secret;
  /** The specific version of the secret containing the token */
  version: gcp.secretmanager.SecretVersion;
  /** The generated random password token */
  token: random.RandomPassword;
}

/**
 * Creates a new secret token in GCP Secret Manager with automatic replication
 *
 * Creates a pulumi random password resource and uses it to create a secret in GCP Secret Manager.
 *
 * @param prefix - A unique identifier used to name the secret resources
 * @returns An object containing the created secret, version, and token resources
 *
 * @example
 * ```typescript
 * const apiKey = secretToken('api-key');
 * // Access the token value
 * const tokenValue = apiKey.token.result;
 * // Reference the secret in other resources
 * const secretRef = apiKey.secret.id;
 * ```
 */
export function secretToken(prefix: string): SecretToken {
  const token = new random.RandomPassword(`${prefix}-token`, {
    length: 128,
    special: false,
  });

  const secret = new gcp.secretmanager.Secret(
    `${prefix}-secret`,
    {
      secretId: `${prefix}-secret`,
      project: GCP_PROJECT,
      replication: {
        auto: {},
      },
    },
    { dependsOn: [token] },
  );

  const version = new gcp.secretmanager.SecretVersion(
    `${prefix}-secret-value`,
    {
      secret: secret.id,
      secretData: token.result,
    },
    { dependsOn: [secret] },
  );

  return { secret, version, token };
}
