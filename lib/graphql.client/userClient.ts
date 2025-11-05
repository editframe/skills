import {
  type AnyVariables,
  Client,
  type DocumentInput,
  type OperationResult,
  fetchExchange,
  subscriptionExchange,
} from "@urql/core";
import { retryExchange, type RetryExchangeOptions } from "@urql/exchange-retry";
import type { QueryRole } from "../graphql/QueryRole";
import { createClient as createWSClient } from "graphql-ws";

let _userclient: Client;

// None of these options have to be added, these are the default values.
const retryOptions: RetryExchangeOptions = {
  initialDelayMs: 1000,
  maxDelayMs: 15000,
  randomDelay: true,
  maxNumberAttempts: 2,
  retryIf: (err: any) => err?.networkError,
};

const userClient = () => {
  if (!_userclient) {
    _userclient = new Client({
      // @ts-expect-error illegal exapando on window for environment
      url: window.ENV.GRAPHQL_URL,
      exchanges: [retryExchange(retryOptions), fetchExchange],
      fetchOptions: {},
    });
  }
  return _userclient;
};

export const queryAs = <
  Data = any,
  Variables extends AnyVariables = AnyVariables,
>(
  token: string,
  role: QueryRole,
  query: DocumentInput<Data, Variables>,
  variables: Variables,
): Promise<OperationResult<Data, Variables>> => {
  return userClient()
    .query(query, variables, {
      fetchOptions: {
        headers: {
          "X-Hasura-Role": role,
          Authorization: `Bearer ${token}`,
        },
      },
    })
    .toPromise();
};

export const mutateAs = <
  Data = any,
  Variables extends AnyVariables = AnyVariables,
>(
  token: string,
  role: QueryRole,
  query: DocumentInput<Data, Variables>,
  variables: Variables,
): Promise<OperationResult<Data, Variables>> => {
  return userClient()
    .mutation(query, variables, {
      fetchOptions: {
        headers: {
          "X-Hasura-Role": role,
          Authorization: `Bearer ${token}`,
        },
      },
    })
    .toPromise();
};

export const subscribeAs = <
  Data = any,
  Variables extends AnyVariables = AnyVariables,
>(
  // sessionInfo: SessionInfo,
  token: string,
  role: QueryRole,
  query: DocumentInput<Data, Variables>,
  variables: Variables,
) => {
  const wsClient = createWSClient({
    // @ts-expect-error illegal exapando on window for environment
    url: window.ENV.GRAPHQL_WS_URL,
    connectionParams: {
      headers: {
        "X-Hasura-Role": role,
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const client = new Client({
    // @ts-expect-error illegal exapando on window for environment
    url: window.ENV.GRAPHQL_URL,
    exchanges: [
      retryExchange(retryOptions),
      subscriptionExchange({
        forwardSubscription(request) {
          const input = { ...request, query: request.query || "" };
          return {
            subscribe(sink) {
              const unsubscribe = wsClient.subscribe(input, sink);
              return { unsubscribe };
            },
          };
        },
      }),
    ],
  });

  return client.subscription(query, variables, {});
};
