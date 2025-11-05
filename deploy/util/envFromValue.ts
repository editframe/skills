import * as pulumi from "@pulumi/pulumi";

/**
 * Creates a Cloud Run environment variable configuration object from a name and value
 * @param envVar - The name of the environment variable
 * @param value - The value to assign to the environment variable. Can be either a string or a Pulumi Output
 * @returns A Cloud Run environment variable configuration object compatible with service specs
 * @example
 * ```typescript
 * // Simple string value
 * envFromValue("NODE_ENV", "production")
 *
 * // With Pulumi Output
 * envFromValue("DATABASE_URL", pulumi.interpolate`postgresql://${dbUser}:${dbPass}@${dbHost}`)
 * ```
 */
export const envFromValue = (
  envVar: string,
  value: string | number | pulumi.Output<string>,
) => {
  return {
    name: envVar,
    value: pulumi.interpolate`${value}`,
  } as const;
};
