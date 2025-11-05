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
    const userClient = new Client({
      url: GRAPHQL_URL,
      exchanges: [retryExchange(retryOptions), fetchExchange],
      fetchOptions: {},
      requestPolicy: "network-only",
    });
    span.setAttributes({
      role,
      query: print(query),
      variables: JSON.stringify(variables),
    });
    const result = await userClient
      .query(query, variables, {
        fetchOptions: {
          headers: {
            connection: "keep-alive",
            "X-Hasura-Role": role,
            Authorization: `Bearer ${signHasuraJwtForSession(sessionInfo)}`,
          },
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
  const response = await queryAs(sessionInfo, role, query, variables);
  if (response.error) {
    logger.error("Failed to query required query", {
      error: response.error.message,
    });
    throw new Response(null, {
      status: 500,
      statusText: response.error.message,
    });
  }
  if (!response.data?.result) {
    // TODO: this might be an auth error
    logger.error("Failed to query required query. Result is empty.", {
      data: response.data,
    });
    throw new Response(null, { status: 404, statusText: "Server error" });
  }
  return response.data.result;
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

    const userClient = new Client({
      url: GRAPHQL_URL,
      exchanges: [retryExchange(retryOptions), fetchExchange],
      fetchOptions: {},
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

    const userClient = new Client({
      url: GRAPHQL_URL,
      exchanges: [retryExchange(retryOptions), fetchExchange],
      fetchOptions: {},
      requestPolicy: "network-only",
    });

    const result = await userClient
      .mutation(query, variables, {
        fetchOptions: {
          headers: {
            connection: "keep-alive",
            "X-Hasura-Role": role,
            Authorization: `Bearer ${signHasuraJwtForSession(sessionInfo)}`,
          },
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

    const wsClient = createWSClient({
      url: GRAPHQL_WS_URL,
      webSocketImpl: WebSocket,
      connectionParams: {
        headers: {
          connection: "keep-alive",
          "X-Hasura-Role": role,
          Authorization: `Bearer ${signHasuraJwtForSession(sessionInfo)}`,
        },
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
                const unsubscribe = wsClient.subscribe(
                  input,
                  {
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
                        message: error instanceof Error ? error.message : String(error),
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
                  }
                );
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
