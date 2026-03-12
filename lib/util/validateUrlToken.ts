import type { AnonymousURLSessionInfo, URLSessionInfo } from "./session";

/**
 * Result of URL token validation
 */
export interface UrlTokenValidationResult {
  isValid: boolean;
  errorDetails?: {
    requestUrl: string;
    signedUrl: string;
    message: string;
  };
}

/**
 * Validates a URL token session against the current request URL
 * Uses unified prefix + parameter matching approach:
 * - Request URL must start with the signed URL prefix
 * - Request query parameters must exactly match signed parameters (exhaustive)
 *
 * @param session - The URL session info from the token
 * @param requestUrl - The current request URL to validate against
 * @returns Validation result with success status and error details if invalid
 */
export function validateUrlToken(
  session: URLSessionInfo | AnonymousURLSessionInfo,
  requestUrl: string,
): UrlTokenValidationResult {
  try {
    const signedUrlObj = new URL(session.url);

    // Handle relative URLs by constructing full URL using signed URL's origin
    const requestUrlObj = requestUrl.startsWith("http")
      ? new URL(requestUrl)
      : new URL(requestUrl, signedUrlObj.origin);

    // 1. Check prefix matching (protocol-agnostic)
    const normalizedRequestUrl = `${requestUrlObj.host}${requestUrlObj.pathname}`;
    const normalizedSignedUrl = `${signedUrlObj.host}${signedUrlObj.pathname}`;

    if (!normalizedRequestUrl.startsWith(normalizedSignedUrl)) {
      console.log(
        "URL prefix mismatch. Request: ${normalizedRequestUrl}, Signed: ${normalizedSignedUrl}",
      );
      return {
        isValid: false,
        errorDetails: {
          requestUrl,
          signedUrl: session.url,
          message: `URL prefix mismatch. Request: ${normalizedRequestUrl}, Signed: ${normalizedSignedUrl}`,
        },
      };
    }

    // 2. Check exhaustive parameter matching
    const requestParams: Record<string, string> = {};
    requestUrlObj.searchParams.forEach((value, key) => {
      requestParams[key] = value;
    });

    const signedParams = session.params || {};

    // Check if parameter sets match exactly
    const requestParamKeys = Object.keys(requestParams).sort();
    const signedParamKeys = Object.keys(signedParams).sort();

    if (
      requestParamKeys.length !== signedParamKeys.length ||
      !requestParamKeys.every((key) => signedParamKeys.includes(key))
    ) {
      console.log(
        "Parameter keys mismatch. Request params: [${requestParamKeys.join(', ')}], Signed params: [${signedParamKeys.join(', ')}]",
      );
      return {
        isValid: false,
        errorDetails: {
          requestUrl,
          signedUrl: session.url,
          message: `Parameter keys mismatch. Request params: [${requestParamKeys.join(", ")}], Signed params: [${signedParamKeys.join(", ")}]`,
        },
      };
    }

    // Check parameter values match exactly
    for (const key of requestParamKeys) {
      if (requestParams[key] !== signedParams[key]) {
        console.log(
          'Parameter value mismatch for "${key}". Request: "${requestParams[key]}", Signed: "${signedParams[key]}"',
        );
        return {
          isValid: false,
          errorDetails: {
            requestUrl,
            signedUrl: session.url,
            message: `Parameter value mismatch for "${key}". Request: "${requestParams[key]}", Signed: "${signedParams[key]}"`,
          },
        };
      }
    }

    return {
      isValid: true,
    };
  } catch (error) {
    console.log(
      `URL parsing error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return {
      isValid: false,
      errorDetails: {
        requestUrl,
        signedUrl: session.url,
        message: `URL parsing error: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
    };
  }
}

/**
 * Helper function to normalize URL for comparison by removing protocol
 */
export function normalizeUrlForComparison(url: string): string {
  return url.replace(/^https?/, "");
}
