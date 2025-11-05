/**
 * Creates a Cloud Run environment variable configuration that references an unmanaged secret
 * @param envVar - The name of the environment variable to create
 * @param secretId - The ID of the Google Cloud Secret Manager secret to reference
 * @returns A Cloud Run environment variable configuration object with secret reference
 * @example
 * ```ts
 * const dbPasswordEnv = envFromUnmanagedSecret('DATABASE_PASSWORD', 'projects/123/secrets/db-password');
 * ```
 */
export const envFromUnmanagedSecret = (envVar: string, secretId: string) => {
  return {
    name: envVar,
    valueSource: {
      secretKeyRef: {
        secret: secretId,
        version: "latest",
      },
    },
  } as const;
};
