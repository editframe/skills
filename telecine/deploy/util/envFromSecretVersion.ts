import type * as gcp from "@pulumi/gcp";

/**
 * Creates an environment variable configuration for Cloud Run that sources its value
 * from a Google Cloud Secret Manager secret version.
 *
 * @param envVar - The name of the environment variable to create
 * @param options - Configuration options
 * @param options.secret - The GCP Secret Manager Secret resource
 * @param options.version - The specific version of the secret to use
 * @returns A Cloud Run environment variable configuration object
 *
 * @example
 * ```typescript
 * const mySecret = new gcp.secretmanager.Secret("my-secret");
 * const myVersion = new gcp.secretmanager.SecretVersion("my-version", {
 *   secret: mySecret.id,
 *   secretData: "my-secret-value"
 * });
 *
 * const envVar = envFromSecretVersion("MY_ENV_VAR", {
 *   secret: mySecret,
 *   version: myVersion
 * });
 * ```
 */
export const envFromSecretVersion = (
  envVar: string,
  {
    secret,
    version,
  }: {
    secret: gcp.secretmanager.Secret;
    version: gcp.secretmanager.SecretVersion;
  },
) => {
  return {
    name: envVar,
    valueSource: {
      secretKeyRef: {
        secret: secret.id,
        version: version.version,
      },
    },
  } as const;
};
