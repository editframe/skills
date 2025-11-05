import jwt from "jsonwebtoken";

const APP_JWT_SECRET = process.env.APPLICATION_JWT_SECRET;
if (!APP_JWT_SECRET) {
  throw new Error("APPLICATION_JWT_SECRET is not set");
}

/**
 * Creates an anonymous URL token that doesn't require database-stored API keys
 * 
 * These tokens are signed with the APPLICATION_JWT_SECRET and can be verified
 * without database lookups, making them perfect for anonymous/guest access scenarios.
 * 
 * @param url - The URL to sign (used for prefix matching)
 * @param params - Optional query parameters that must match exactly
 * @param expiresIn - JWT expiration time (default: "1hr")
 * @returns Signed JWT token
 */
export const createAnonymousURLToken = (
  url: string,
  params?: Record<string, string>,
  expiresIn: string = "1hr"
): string => {
  const jwtPayload = {
    type: "anonymous_url",
    url: url,
    params: params || {}, // Default to empty object for exhaustive matching
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(
    jwtPayload,
    APP_JWT_SECRET,
    { algorithm: "HS256", expiresIn }
  );
};
