import { type AnyVariables, Client, fetchExchange } from "@urql/core";
import { retryExchange, type RetryExchangeOptions } from "@urql/exchange-retry";
import type { TadaDocumentNode } from "gql.tada";

const retryOptions: RetryExchangeOptions = {
  initialDelayMs: 1000,
  maxDelayMs: 15000,
  randomDelay: true,
  maxNumberAttempts: 2,
  retryIf: (err: any) => err?.networkError,
};

const adminClient = new Client({
  url: process.env.HASURA_SERVER_URL as string,
  exchanges: [retryExchange(retryOptions), fetchExchange],
  fetchOptions: {
    headers: {
      "X-Hasura-Role": "admin",
      "X-Hasura-admin-secret": process.env.HASURA_ADMIN_SECRET ?? "BADSECRET",
    },
  },
});

export const query = <
  Data = any,
  Variables extends AnyVariables = AnyVariables,
>(
  query: TadaDocumentNode<Data, Variables>,
  variables: Variables,
) => {
  return adminClient.query(query, variables);
};

export const requireQuery = async <
  Data extends { result: any },
  Variables extends AnyVariables = AnyVariables,
>(
  query: TadaDocumentNode<Data, Variables>,
  variables: Variables,
): Promise<Exclude<Data["result"], null>> => {
  const result = await adminClient.query(query, variables);
  if (result.error) {
    throw new Error(result.error.message);
  }
  if (!result.data) {
    throw new Error("No data returned from query");
  }
  return result.data.result;
};

export const mutate = <
  Data = any,
  Variables extends AnyVariables = AnyVariables,
>(
  query: TadaDocumentNode<Data, Variables>,
  variables: Variables,
) => {
  return adminClient.mutation(query, variables);
};

export const requireMutate = async <
  Data extends { result: any },
  Variables extends AnyVariables = AnyVariables,
>(
  query: TadaDocumentNode<Data, Variables>,
  variables: Variables,
): Promise<Exclude<Data["result"], null>> => {
  const result = await adminClient.mutation(query, variables);
  if (result.error) {
    throw new Error(result.error.message);
  }
  if (!result.data) {
    throw new Error("No data returned from mutation");
  }
  return result.data.result;
};
