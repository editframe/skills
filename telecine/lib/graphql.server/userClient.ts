import {
  type AnyVariables,
  Client,
  type OperationResult,
  fetchExchange,
  subscriptionExchange,
} from "@urql/core";
import { retryExchange, type RetryExchangeOptions } from "@urql/exchange-retry";
import {
  type HasuraSessionInfo,
  signHasuraJwtForSession,
} from "@/util/signJwtForSession.server";
import type { QueryRole } from "../graphql/QueryRole";
import { createClient as createWSClient } from "graphql-ws";
import WebSocket from "ws";
import opentelemetry, { SpanStatusCode } from "@opentelemetry/api";
import type { TadaDocumentNode } from "gql.tada";
import { type ExecutionResult, print } from "graphql";
import { logger } from "@/logging";

const tracer = opentelemetry.trace.getTracer("graphql");

// url: process.env.HASURA_URL ?? "BAD-URL",
// TODO: load via config
const GRAPHQL_URL = process.env.HASURA_SERVER_URL!;
const GRAPHQL_WS_URL = GRAPHQL_URL.replace("http", "ws");
const HASURA_SERVER_HOST = process.env.HASURA_SERVER_HOST;

// Custom fetch that sets Host header for Traefik routing
// When URL uses worktree domain (e.g., main.localhost), we need to:
// 1. Connect to Traefik service (editframe-traefik) instead
// 2. Set Host header to the worktree domain for routing
const createFetchWithHost = (hostHeader?: string) => {
  if (!hostHeader) {
    return fetch;
  }

  return async (
    url: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    try {
      logger.info("Custom fetch called", {
        url:
          typeof url === "string"
            ? url
            : url instanceof URL
              ? url.toString()
              : url instanceof Request
                ? url.url
                : "unknown",
        hostHeader,
        hasInit: !!init,
      });

      // Convert to Request if needed
      const request = url instanceof Request ? url : new Request(url, init);
      const requestUrl = new URL(request.url);

      // If URL uses a .localhost domain, replace hostname with Traefik service name
      // This is needed because .localhost resolves to 127.0.0.1 inside containers
      let hostname = requestUrl.hostname;
      let port =
        requestUrl.port || (requestUrl.protocol === "https:" ? 443 : 80);

      if (hostname.endsWith(".localhost") || hostname === "localhost") {
        hostname = "editframe-traefik";
        // Port should already be correct (3000), but ensure it's set
        if (!requestUrl.port) {
          port = 3000;
        }
      }

      logger.info("Custom fetch rewriting hostname", {
        originalHostname: requestUrl.hostname,
        newHostname: hostname,
        port,
        hostHeader,
      });

      // Create headers with Host header set to worktree domain
      const headers = new Headers(request.headers);
      headers.set("Host", hostHeader);

      // Get body if present
      let body: string | undefined;
      if (request.body) {
        if (typeof request.body === "string") {
          body = request.body;
        } else if (request.body instanceof ReadableStream) {
          const reader = request.body.getReader();
          const chunks: Uint8Array[] = [];
          let done = false;
          while (!done) {
            const { value, done: streamDone } = await reader.read();
            done = streamDone;
            if (value) chunks.push(value);
          }
          body = Buffer.concat(chunks).toString("utf-8");
        } else {
          body = await request.text();
        }
      }

      // Use http/https modules to make request
      const protocol =
        requestUrl.protocol === "https:"
          ? await import("https")
          : await import("http");
      const httpModule = protocol.default;

      return new Promise((resolve, reject) => {
        const options = {
          hostname,
          port,
          path: requestUrl.pathname + requestUrl.search,
          method: request.method,
          headers: Object.fromEntries(headers.entries()),
        };

        const req = httpModule.request(options, (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => {
            resolve(
              new Response(Buffer.concat(chunks), {
                status: res.statusCode || 200,
                statusText: res.statusMessage || "OK",
                headers: res.headers as HeadersInit,
              }),
            );
          });
        });

        req.on("error", (error) => {
          logger.error("Custom fetch network error", {
            error: error.message,
            stack: error.stack,
            hostname,
            port,
            path: options.path,
            hostHeader,
            originalUrl: request.url,
          });
          reject(error);
        });

        if (body) {
          req.write(body);
        }
        req.end();
      });
    } catch (error) {
      logger.error("Custom fetch error", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        url:
          typeof url === "string"
            ? url
            : url instanceof URL
              ? url.toString()
              : url instanceof Request
                ? url.url
                : "unknown",
        hostHeader,
      });
      throw error;
    }
  };
};

// None of these options have to be added, these are the default values.
const retryOptions: RetryExchangeOptions = {
  initialDelayMs: 1000,
  maxDelayMs: 15000,
  randomDelay: true,
  maxNumberAttempts: 2,
  retryIf: (err: any) => err?.networkError,
};

export const queryAs = <
  Data = any,
  Variables extends AnyVariables = AnyVariables,
>(
  sessionInfo: HasuraSessionInfo,
  role: QueryRole,
  query: TadaDocumentNode<Data, Variables>,
  variables: Variables,
): Promise<OperationResult<Data, Variables>> => {
  return tracer.startActiveSpan("GQL query", async (span) => {
    logger.info("queryAs: Creating client", {
      graphqlUrl: GRAPHQL_URL,
      hasServerHost: !!HASURA_SERVER_HOST,
      serverHost: HASURA_SERVER_HOST,
    });

    const customFetch = createFetchWithHost(HASURA_SERVER_HOST);
    logger.info("queryAs: Custom fetch created", {
      fetchType: typeof customFetch,
      isFunction: typeof customFetch === "function",
    });

    const userClient = new Client({
      url: GRAPHQL_URL,
      fetch: customFetch,
      exchanges: [retryExchange(retryOptions), fetchExchange],
      requestPolicy: "network-only",
    });
    span.setAttributes({
      role,
      query: print(query),
      variables: JSON.stringify(variables),
    });
    const jwtToken = signHasuraJwtForSession(sessionInfo);

    // Decode JWT to verify claims (without verification, just for logging)
    try {
      const jwt = require("jsonwebtoken");
      const decoded = jwt.decode(jwtToken);
      if (
        decoded &&
        typeof decoded === "object" &&
        decoded["https://hasura.io/jwt/claims"]
      ) {
        const claims = decoded["https://hasura.io/jwt/claims"] as Record<
          string,
          unknown
        >;
        logger.info("JWT claims being sent to Hasura", {
          role,
          uid: sessionInfo.uid,
          "X-Hasura-user-id": claims["X-Hasura-user-id"],
          "X-Hasura-User-Id": claims["X-Hasura-User-Id"],
          "X-Hasura-default-role": claims["X-Hasura-default-role"],
          "X-Hasura-allowed-roles": claims["X-Hasura-allowed-roles"],
          allClaimKeys: Object.keys(claims),
        });
        span.setAttributes({
          "jwt.user-id": String(
            claims["X-Hasura-user-id"] ??
              claims["X-Hasura-User-Id"] ??
              "missing",
          ),
          "jwt.claim-keys": Object.keys(claims).join(","),
        });
      }
    } catch (e) {
      // Ignore decode errors
    }

    const headers: Record<string, string> = {
      connection: "keep-alive",
      "X-Hasura-Role": role,
      Authorization: `Bearer ${jwtToken}`,
    };

    const result = await userClient
      .query(query, variables, {
        fetchOptions: {
          headers,
        },
      })
      .toPromise();

    if (result.error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: result.error.message,
      });
    }

    span.setAttributes({
      result: JSON.stringify(result.data),
      error: JSON.stringify(result.error),
    });

    span.end();

    return result;
  });
};

export const requireQueryAs = async <
  Data extends { result: any },
  Variables extends AnyVariables = AnyVariables,
>(
  sessionInfo: HasuraSessionInfo,
  role: QueryRole,
  query: TadaDocumentNode<Data, Variables>,
  variables: Variables,
): Promise<Exclude<Data["result"], null>> => {
  logger.info("requireQueryAs called", {
    role,
    uid: sessionInfo.uid,
    cid: sessionInfo.cid,
    queryName: print(query).split("{")[0]?.trim(),
  });

  const response = await queryAs(sessionInfo, role, query, variables);

  if (response.error) {
    logger.error("Failed to query required query", {
      error: response.error.message,
      errorStatus: response.error.response?.status,
      errorStatusText: response.error.response?.statusText,
      errorNetworkError: response.error.networkError,
      errorGraphQLErrors: response.error.graphQLErrors,
      errorDetails: JSON.stringify(
        response.error,
        Object.getOwnPropertyNames(response.error),
      ),
      role,
      uid: sessionInfo.uid,
      cid: sessionInfo.cid,
      query: print(query),
      variables: JSON.stringify(variables),
    });
    throw new Response(null, {
      status: 500,
      statusText: response.error.message,
    });
  }

  logger.info("requireQueryAs response", {
    role,
    uid: sessionInfo.uid,
    hasData: !!response.data,
    hasResult: !!response.data?.result,
    resultType: typeof response.data?.result,
    resultIsArray: Array.isArray(response.data?.result),
    resultLength: Array.isArray(response.data?.result)
      ? response.data.result.length
      : "N/A",
  });

  if (!response.data?.result) {
    logger.error("Failed to query required query. Result is empty.", {
      data: response.data,
      role,
      uid: sessionInfo.uid,
      cid: sessionInfo.cid,
      query: print(query),
      variables: JSON.stringify(variables),
    });
    throw new Response(null, { status: 404, statusText: "Server error" });
  }

  const result = response.data.result;

  if (Array.isArray(result) && result.length === 0) {
    logger.warn("requireQueryAs returned empty array", {
      role,
      uid: sessionInfo.uid,
      cid: sessionInfo.cid,
      query: print(query),
      variables: JSON.stringify(variables),
    });
  }

  return result;
};

export const anonymousQuery = <
  Data = any,
  Variables extends AnyVariables = AnyVariables,
>(
  query: TadaDocumentNode<Data, Variables>,
  variables: Variables,
): Promise<OperationResult<Data, Variables>> => {
  return tracer.startActiveSpan("GQL anonymous query", async (span) => {
    span.setAttributes({
      query: print(query),
      variables: JSON.stringify(variables),
    });

    const customFetch = createFetchWithHost(HASURA_SERVER_HOST);
    const userClient = new Client({
      url: GRAPHQL_URL,
      fetch: customFetch,
      exchanges: [retryExchange(retryOptions), fetchExchange],
      requestPolicy: "network-only",
    });

    const result = await userClient.query(query, variables).toPromise();

    if (result.error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: result.error.message,
      });
    }

    span.setAttributes({
      result: JSON.stringify(result.data),
      error: JSON.stringify(result.error),
    });

    span.end();

    return result;
  });
};

export const mutateAs = <
  Data = any,
  Variables extends AnyVariables = AnyVariables,
>(
  sessionInfo: HasuraSessionInfo,
  role: QueryRole,
  query: TadaDocumentNode<Data, Variables>,
  variables: Variables,
): Promise<OperationResult<Data, Variables>> => {
  return tracer.startActiveSpan("GQL mutate", async (span) => {
    span.setAttributes({
      role,
      query: print(query),
      variables: JSON.stringify(variables),
    });

    const headers: Record<string, string> = {
      connection: "keep-alive",
      "X-Hasura-Role": role,
      Authorization: `Bearer ${signHasuraJwtForSession(sessionInfo)}`,
    };

    const customFetch = createFetchWithHost(HASURA_SERVER_HOST);
    const userClient = new Client({
      url: GRAPHQL_URL,
      fetch: customFetch,
      exchanges: [retryExchange(retryOptions), fetchExchange],
      requestPolicy: "network-only",
    });

    const result = await userClient
      .mutation(query, variables, {
        fetchOptions: {
          headers,
        },
      })
      .toPromise();

    if (result.error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: result.error.message,
      });
    }

    span.setAttributes({
      result: JSON.stringify(result.data),
      error: JSON.stringify(result.error),
    });

    span.end();

    return result;
  });
};

export const requireMutateAs = async <
  Data extends { result: any },
  Variables extends AnyVariables = AnyVariables,
>(
  sessionInfo: HasuraSessionInfo,
  role: QueryRole,
  query: TadaDocumentNode<Data, Variables>,
  variables: Variables,
): Promise<Exclude<Data["result"], null>> => {
  const response = await mutateAs(sessionInfo, role, query, variables);
  if (response.error) {
    logger.error("Failed to mutate required query", {
      error: response.error,
    });
    throw new Response(null, {
      status: 400,
      statusText: response.error.message,
    });
  }
  if (!response.data?.result) {
    logger.error("Failed to mutate required query", {
      data: response.data,
      error: response.error,
    });
    throw new Response(null, { status: 500, statusText: "Failed mutation" });
  }
  return response.data.result;
};

export const subscribeAs = <
  Data = any,
  Variables extends AnyVariables = AnyVariables,
>(
  sessionInfo: HasuraSessionInfo,
  role: QueryRole,
  query: TadaDocumentNode<Data, Variables>,
  variables: Variables,
) => {
  return tracer.startActiveSpan("GQL subscribe", async (span) => {
    span.setAttributes({
      role,
      query: print(query),
      variables: JSON.stringify(variables),
    });

    const wsHeaders: Record<string, string> = {
      connection: "keep-alive",
      "X-Hasura-Role": role,
      Authorization: `Bearer ${signHasuraJwtForSession(sessionInfo)}`,
    };
    // WebSocket connections use the URL hostname for routing
    // Traefik routes WebSocket connections based on the Host header in the initial HTTP handshake
    // We use the Traefik service name and rely on Traefik's routing
    const wsClient = createWSClient({
      url: GRAPHQL_WS_URL,
      webSocketImpl: WebSocket,
      connectionParams: {
        headers: wsHeaders,
      },
    });

    const client = new Client({
      url: GRAPHQL_URL,
      exchanges: [
        retryExchange(retryOptions),
        subscriptionExchange({
          forwardSubscription(request) {
            const input = { ...request, query: request.query || "" };
            return {
              subscribe(sink) {
                const unsubscribe = wsClient.subscribe(input, {
                  ...sink,
                  next: (result) => {
                    span.setAttributes({
                      result: JSON.stringify(result.data),
                      error: JSON.stringify(result.errors),
                    });
                    if (result.errors) {
                      span.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: result.errors.map((e) => e.message).join(", "),
                      });
                    }
                    sink.next(result as ExecutionResult);
                  },
                  error: (error: unknown) => {
                    span.setStatus({
                      code: SpanStatusCode.ERROR,
                      message:
                        error instanceof Error ? error.message : String(error),
                    });
                    span.setAttributes({
                      error: JSON.stringify(error),
                    });
                    sink.error(error);
                  },
                  complete: () => {
                    span.end();
                    sink.complete();
                  },
                });
                return { unsubscribe };
              },
            };
          },
        }),
      ],
    });

    return client.subscription(query, variables, {});
  });
};
