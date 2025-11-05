/**
 * Environment variable configuration utilities
 */

/**
 * Boot phase state
 */
let inBootPhase = true;
const missingRequiredVars: string[] = [];

// Schedule check for missing variables on next tick
process.nextTick(() => {
  inBootPhase = false;
  if (missingRequiredVars.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missingRequiredVars.map((v) => `  - ${v}`).join("\n")}`,
    );
  }
});

/**
 * Options for loading an environment variable
 */
interface EnvVarOptions<T> {
  /** Default value to use if not in production or variable is missing */
  default?: T;
  /** Whether this variable is required in production */
  required?: boolean;
  /** Custom parser function */
  parse?: (value: string) => T;
}

/**
 * Helper to load environment variables with type safety and defaults
 *
 * @param key The environment variable name
 * @param options Configuration options
 * @returns The parsed environment variable value
 * @throws Error if required variable is missing after boot phase
 */
export function env<T>(
  key: string,
  defaultVal?: T,
  options: EnvVarOptions<T> = {},
): T {
  const { required = true } = options;
  const value = process.env[key];
  const isProd = process.env.NODE_ENV === "production";

  // Handle missing value
  if (value === undefined) {
    if ((isProd || !inBootPhase) && required) {
      if (inBootPhase) {
        // During boot phase, collect missing vars to report them all at once
        missingRequiredVars.push(key);
      } else {
        // After boot phase, throw immediately
        throw new Error(`Required environment variable ${key} is missing`);
      }
    }
    if (defaultVal !== undefined) {
      return defaultVal;
    }
    if (required) {
      if (inBootPhase) {
        missingRequiredVars.push(key);
      } else {
        throw new Error(`Required environment variable ${key} is missing`);
      }
    }
    return undefined as unknown as T;
  }

  // Use custom parser if provided
  if (options.parse) {
    try {
      return options.parse(value);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to parse environment variable ${key}: ${message}`,
      );
    }
  }

  return value as unknown as T;
}

/**
 * Load string environment variable
 */
export function envString(
  key: string,
  defaultVal?: string,
  options: Omit<EnvVarOptions<string>, "parse"> = {},
): string {
  return env(key, defaultVal, {
    ...options,
    parse: (value) => value,
  });
}

/**
 * Load number environment variable
 */
export function envNumber(
  key: string,
  defaultVal: number,
  options: Omit<EnvVarOptions<number>, "parse"> = {},
): number {
  return env(key, defaultVal, {
    ...options,
    parse: (value) => {
      const parsed = Number.parseFloat(value);
      if (Number.isNaN(parsed)) {
        throw new Error(`Environment variable ${key} is not a valid number`);
      }
      return parsed;
    },
  });
}

/**
 * Load integer environment variable
 */
export function envInt(
  key: string,
  defaultVal?: number,
  options: Omit<EnvVarOptions<number>, "parse"> = {},
): number {
  return env(key, defaultVal, {
    ...options,
    parse: (value) => {
      const parsed = Number.parseInt(value, 10);
      if (Number.isNaN(parsed)) {
        throw new Error(`Environment variable ${key} is not a valid integer`);
      }
      return parsed;
    },
  });
}

/**
 * Load boolean environment variable
 */
export function envBool(
  key: string,
  defaultVal?: boolean,
  options: Omit<EnvVarOptions<boolean>, "parse"> = {},
): boolean {
  return env(key, defaultVal, {
    ...options,
    parse: (value) => {
      return value.toLowerCase() === "true" || value === "1";
    },
  });
}

/**
 * Manually end boot phase and check for missing variables immediately
 * Useful for testing or non-server environments
 */
export function endBootPhase(): void {
  inBootPhase = false;
  if (missingRequiredVars.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missingRequiredVars.map((v) => `  - ${v}`).join("\n")}`,
    );
  }
}
