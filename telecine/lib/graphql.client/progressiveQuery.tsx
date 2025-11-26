import type { AnyVariables, TypedDocumentNode } from "@urql/core";
import type { QueryRole } from "@/graphql/QueryRole";

export interface ProgressiveQueryDescriptor<
  Data = any,
  Variables extends AnyVariables = AnyVariables,
> {
  role: QueryRole;
  query: TypedDocumentNode<Data, Variables>;
}

export function progressiveQuery<
  Data = any,
  Variables extends AnyVariables = AnyVariables,
>(
  role: QueryRole,
  query: TypedDocumentNode<Data, Variables>,
): ProgressiveQueryDescriptor<Data, Variables> {
  return { role, query };
}
