import type { AnyVariables, TypedDocumentNode } from "@urql/core";
import type { QueryRole } from "@/graphql/QueryRole";

export interface ProgressiveQueryDescriptor<
  Data = any,
  Variables extends AnyVariables = AnyVariables,
  CountData = any,
> {
  role: QueryRole;
  query: TypedDocumentNode<Data, Variables>;
  countQuery?: TypedDocumentNode<CountData, Variables>;
}

export function progressiveQuery<
  Data = any,
  Variables extends AnyVariables = AnyVariables,
>(
  role: QueryRole,
  query: TypedDocumentNode<Data, Variables>,
): ProgressiveQueryDescriptor<Data, Variables, never>;

export function progressiveQuery<
  Data = any,
  Variables extends AnyVariables = AnyVariables,
  CountData = any,
>(
  role: QueryRole,
  query: TypedDocumentNode<Data, Variables>,
  countQuery: TypedDocumentNode<CountData, Variables>,
): ProgressiveQueryDescriptor<Data, Variables, CountData>;

export function progressiveQuery<
  Data = any,
  Variables extends AnyVariables = AnyVariables,
  CountData = any,
>(
  role: QueryRole,
  query: TypedDocumentNode<Data, Variables>,
  countQuery?: TypedDocumentNode<CountData, Variables>,
): ProgressiveQueryDescriptor<Data, Variables, CountData> {
  return { role, query, countQuery };
}
